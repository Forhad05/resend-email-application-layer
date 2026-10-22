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

  // Strategy D: Create new Thread if no existing conversation matched
  if (!targetThreadId) {
    const [newThread] = await db
      .insert(threads)
      .values({
        subject: subject,
        status: "open",
        priority: "normal",
        contactEmail: fromEmail,
        contactId: contactId,
        messageCount: 1,
        lastMessageAt: new Date(),
        isRead: false,
      })
      .returning({ id: threads.id });

    targetThreadId = newThread.id;
  } else {
    // Update existing thread: increment messageCount, reopen, update lastMessageAt
    await db
      .update(threads)
      .set({
        status: "open",
        messageCount: sql`${threads.messageCount} + 1`,
        lastMessageAt: new Date(),
        isRead: false,
        updatedAt: new Date(),
      })
      .where(eq(threads.id, targetThreadId));
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
    [key: string]: any;
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
      } catch (err) {
        console.warn("Could not record suppression:", err);
      }
    }
  }
}

