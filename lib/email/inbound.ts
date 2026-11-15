import { db } from "@/lib/db";
import {
  threads,
  messages,
  contacts,
  suppressions,
  attachments,
} from "@/lib/db/schema";
import { eq, or, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import PostalMime from "postal-mime";
import { logAuditEvent } from "@/lib/audit";
import { evaluateAutoTriage, computeSlaDueAt } from "@/lib/email/sla";

export interface ResendInboundPayload {
  email_id?: string;
  id?: string;
  from: string;
  to: string | string[];
  subject?: string;
  html?: string;
  text?: string;
  raw?: string;
  headers?: Record<string, string | string[]>;
  attachments?: Array<{
    id?: string;
    filename: string;
    content_type?: string;
    size?: number;
    url?: string;
  }>;
}

function parseEmailAndName(raw: string): { name: string | null; email: string } {
  const match = raw.match(/^(?:(.*?)<)?([^<>]+)>?$/);
  if (match) {
    const name = match[1]?.trim().replace(/^["']|["']$/g, "") || null;
    const email = (match[2] || "").trim().toLowerCase();
    return { name, email };
  }
  return { name: null, email: raw.trim().toLowerCase() };
}

function getHeader(
  headers: Record<string, string | string[]> | undefined,
  name: string
): string | null {
  if (!headers) return null;
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      if (Array.isArray(value)) return value.join(" ");
      return typeof value === "string" ? value : String(value);
    }
  }
  return null;
}

function cleanId(val: string | null): string {
  if (!val) return "";
  return val.replace(/^<|>$/g, "").trim();
}

function normalizeSubject(sub: string | null | undefined): string {
  if (!sub) return "";
  return sub.replace(/^((re|fwd|fw):\s*)+/i, "").trim().toLowerCase();
}

export async function handleInboundEmail(data: ResendInboundPayload) {
  // If raw RFC 822 email was provided (e.g. from Cloudflare Worker without client-side parsing)
  if (data.raw && (!data.text && !data.html)) {
    try {
      const parser = new PostalMime();
      const parsed = await parser.parse(data.raw);
      data.text = parsed.text || "";
      data.html = parsed.html || parsed.text || "";
      if (!data.subject && parsed.subject) {
        data.subject = parsed.subject;
      }
      if (!data.headers) {
        data.headers = {};
      }
      if (parsed.messageId && !data.headers["message-id"]) {
        data.headers["message-id"] = parsed.messageId;
      }
      if (parsed.inReplyTo && !data.headers["in-reply-to"]) {
        data.headers["in-reply-to"] = parsed.inReplyTo;
      }
      if (parsed.references && !data.headers["references"]) {
        data.headers["references"] = Array.isArray(parsed.references)
          ? parsed.references.join(" ")
          : String(parsed.references);
      }
      if (parsed.attachments && parsed.attachments.length > 0 && (!data.attachments || data.attachments.length === 0)) {
        data.attachments = parsed.attachments.map((att) => {
          let sizeBytes = 0;
          if (typeof att.content === "string") {
            sizeBytes = Buffer.byteLength(att.content);
          } else if (att.content instanceof ArrayBuffer) {
            sizeBytes = att.content.byteLength;
          } else if (att.content && typeof (att.content as ArrayBufferView).byteLength === "number") {
            sizeBytes = (att.content as ArrayBufferView).byteLength;
          }

          return {
            filename: att.filename || "attachment",
            content_type: att.mimeType,
            size: sizeBytes,
          };
        });
      }
    } catch (parseErr) {
      console.warn("Failed to parse raw MIME email body:", parseErr);
    }
  }

  const { name: fromName, email: fromEmail } = parseEmailAndName(data.from || "");
  const toList = Array.isArray(data.to)
    ? data.to.map((t) => t.trim().toLowerCase())
    : [data.to.trim().toLowerCase()];

  const subject = data.subject || "(No Subject)";
  const resendEmailId = data.email_id || data.id || null;

  const messageIdHeader = getHeader(data.headers, "message-id");
  const inReplyToHeader = getHeader(data.headers, "in-reply-to");
  const referencesHeader = getHeader(data.headers, "references");

  const cleanInReplyTo = cleanId(inReplyToHeader);
  const cleanMessageId = cleanId(messageIdHeader);

  // 1. Upsert or find Contact
  let contactId: string | null = null;
  try {
    const [existingContact] = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.email, fromEmail))
      .limit(1);

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const [newContact] = await db
        .insert(contacts)
        .values({
          email: fromEmail,
          name: fromName,
        })
        .onConflictDoUpdate({
          target: contacts.email,
          set: {
            name: fromName || sql`contacts.name`,
            updatedAt: new Date(),
          },
        })
        .returning({ id: contacts.id });
      contactId = newContact?.id ?? null;
    }
  } catch (err) {
    console.warn("Could not upsert contact:", err);
  }

  // 2. Thread Matching Logic
  let targetThreadId: string | null = null;

  // Strategy A: Match by in-reply-to header
  if (cleanInReplyTo) {
    const [matchedMsg] = await db
      .select({ threadId: messages.threadId })
      .from(messages)
      .where(
        or(
          eq(messages.messageId, inReplyToHeader || ""),
          eq(messages.messageId, cleanInReplyTo),
          eq(messages.resendEmailId, cleanInReplyTo)
        )
      )
      .limit(1);

    if (matchedMsg) {
      targetThreadId = matchedMsg.threadId;
    }
  }

  // Strategy B: Match by references chain
  if (!targetThreadId && referencesHeader) {
    const tokens = referencesHeader
      .split(/\s+/)
      .map(cleanId)
      .filter(Boolean);

    for (const token of tokens) {
      const [matchedMsg] = await db
        .select({ threadId: messages.threadId })
        .from(messages)
        .where(
          or(
            eq(messages.messageId, token),
            eq(messages.resendEmailId, token)
          )
        )
        .limit(1);

      if (matchedMsg) {
        targetThreadId = matchedMsg.threadId;
        break;
      }
    }
  }

  // Strategy C: Match by Subject + Customer Email
  if (!targetThreadId) {
    const cleanSub = normalizeSubject(subject);
    if (cleanSub) {
      const candidateThreads = await db
        .select({ id: threads.id, subject: threads.subject })
        .from(threads)
        .where(eq(threads.contactEmail, fromEmail))
        .orderBy(desc(threads.lastMessageAt))
        .limit(10);

      for (const t of candidateThreads) {
        if (normalizeSubject(t.subject) === cleanSub) {
          targetThreadId = t.id;
          break;
        }
      }
    }
  }

  // Auto-Triage & SLA Target Evaluation
  const triage = evaluateAutoTriage(subject, data.text || data.html || "");
  const triagePriority = triage.priority || "normal";
  const triageLabels = triage.labels;

  // Strategy D: Create new Thread if no existing conversation matched
  if (!targetThreadId) {
    const slaDueAt = computeSlaDueAt(triagePriority);

    const [newThread] = await db
      .insert(threads)
      .values({
        subject: subject,
        status: "open",
        priority: triagePriority,
        labels: triageLabels,
        slaDueAt: slaDueAt,
        slaBreached: false,
        contactEmail: fromEmail,
        contactId: contactId,
        messageCount: 1,
        lastMessageAt: new Date(),
        isRead: false,
      })
      .returning({ id: threads.id });

    targetThreadId = newThread.id;

    if (triage.priority || triage.labels.length > 0) {
      await logAuditEvent({
        actor: { id: "system", name: "Auto-Triage Engine", email: "system@internal" },
        action: "thread.triaged",
        entityType: "thread",
        entityId: targetThreadId,
        details: {
          elevatedPriority: triage.priority || null,
          autoAppliedLabels: triage.labels,
          matchedRules: triage.matchedRules,
          subject,
        },
      }).catch((err) => console.warn("Auto-triage audit log warning:", err));
    }
  } else {
    // Fetch existing thread to merge labels and respect higher priority
    const [existingThread] = await db
      .select({
        priority: threads.priority,
        labels: threads.labels,
      })
      .from(threads)
      .where(eq(threads.id, targetThreadId))
      .limit(1);

    let updatedPriority = existingThread?.priority || "normal";
    if (
      triagePriority === "urgent" ||
      (triagePriority === "high" && (updatedPriority === "normal" || updatedPriority === "low"))
    ) {
      updatedPriority = triagePriority;
    }

    const currentLabels = existingThread?.labels || [];
    const mergedLabels = Array.from(new Set([...currentLabels, ...triageLabels]));
    const slaDueAt = computeSlaDueAt(updatedPriority);

    // Update existing thread: increment messageCount, reopen, update lastMessageAt & SLA
    await db
      .update(threads)
      .set({
        status: "open",
        priority: updatedPriority,
        labels: mergedLabels,
        slaDueAt: slaDueAt,
        slaBreached: false,
        messageCount: sql`${threads.messageCount} + 1`,
        lastMessageAt: new Date(),
        isRead: false,
        updatedAt: new Date(),
      })
      .where(eq(threads.id, targetThreadId));

    if (triage.priority || triage.labels.length > 0) {
      await logAuditEvent({
        actor: { id: "system", name: "Auto-Triage Engine", email: "system@internal" },
        action: "thread.triaged",
        entityType: "thread",
        entityId: targetThreadId,
        details: {
          elevatedPriority: triage.priority || null,
          autoAppliedLabels: triage.labels,
          matchedRules: triage.matchedRules,
          subject,
        },
      }).catch((err) => console.warn("Auto-triage audit log warning:", err));
    }
  }

  // 3. Insert the inbound message
  const hasAttachments = Boolean(data.attachments && data.attachments.length > 0);

  const [insertedMsg] = await db
    .insert(messages)
    .values({
      threadId: targetThreadId,
      direction: "inbound",
      fromEmail: fromEmail,
      fromName: fromName,
      toEmails: toList,
      subject: subject,
      textBody: data.text || null,
      htmlBody: data.html || null,
      messageId: cleanMessageId || messageIdHeader || null,
      inReplyTo: cleanInReplyTo || inReplyToHeader || null,
      referencesHeader: referencesHeader || null,
      resendEmailId: resendEmailId,
      status: "received",
      hasAttachments: hasAttachments,
    })
    .returning({ id: messages.id });

  // 4. Save attachment records if provided
  if (hasAttachments && data.attachments) {
    for (const att of data.attachments) {
      try {
        await db.insert(attachments).values({
          messageId: insertedMsg.id,
          filename: att.filename || "attachment",
          contentType: att.content_type || "application/octet-stream",
          sizeBytes: att.size || 0,
          resendUrl: att.url || null,
        });
      } catch (attErr) {
        console.warn("Failed to insert attachment record:", attErr);
      }
    }
  }

  try {
    revalidatePath("/inbox");
    revalidatePath(`/inbox/${targetThreadId}`);
  } catch {
    // Revalidation may fail if called outside Next.js request context (e.g. test runner)
  }

  return { success: true, threadId: targetThreadId, messageId: insertedMsg.id };
}

export async function handleDeliveryEvent(
  eventType: string,
  eventData: {
    email_id?: string;
    to?: string | string[];
    [key: string]: unknown;
  }
) {
  const emailId = eventData.email_id;
  if (!emailId) return;

  const normalizedStatus = eventType.replace(/^email\./, "");

  // Update status on matching message
  await db
    .update(messages)
    .set({
      status: normalizedStatus,
      updatedAt: new Date(),
    })
    .where(eq(messages.resendEmailId, emailId));

  // If bounced or complained, record suppression
  if (normalizedStatus === "bounced" || normalizedStatus === "complained") {
    const rawTo = eventData.to;
    const toList = Array.isArray(rawTo) ? rawTo : [rawTo];

    for (const recipient of toList) {
      if (!recipient) continue;
      const cleanRecip = recipient.trim().toLowerCase();
      try {
        await db
          .insert(suppressions)
          .values({
            email: cleanRecip,
            reason: normalizedStatus === "bounced" ? "hard_bounce" : "complaint",
            source: `resend_webhook_${normalizedStatus}`,
          })
          .onConflictDoNothing();

        await logAuditEvent({
          actor: { id: null, name: "System (Webhook)", email: "webhook@resend.com" },
          action: "suppression.added",
          entityType: "suppression",
          entityId: cleanRecip,
          details: {
            reason: normalizedStatus === "bounced" ? "hard_bounce" : "complaint",
            source: `resend_webhook_${normalizedStatus}`,
            resendEmailId: emailId,
          },
        });
      } catch (err) {
        console.warn("Could not record suppression:", err);
      }
    }
  }
}

