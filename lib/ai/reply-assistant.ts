"use server";

import { db } from "@/lib/db";
import { threads, messages, internalNotes } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getServerSession } from "@/lib/auth-session";
import { logAuditEvent } from "@/lib/audit";
import { sanitizeErrorMessage } from "@/lib/utils";

export type ReplyTone = "formal" | "quick_ack" | "clarification";

export interface GenerateDraftOptions {
  threadId: string;
  tone: ReplyTone;
  customPrompt?: string;
}

export interface GeneratedDraftResult {
  success: boolean;
  draft?: string;
  tone: ReplyTone;
  source: "gemini" | "smart_context";
  error?: string;
}

/**
 * Extracts a human-friendly recipient first name from email or display name
 */
function extractCustomerName(fromName: string | null, email: string): string {
  if (fromName && fromName.trim() && !fromName.includes("@")) {
    const parts = fromName.trim().split(" ");
    return parts[0];
  }
  const localPart = email.split("@")[0] || "there";
  // Clean dots and underscores (e.g. john.doe -> John)
  const clean = localPart.replace(/[._-]/g, " ").trim();
  const first = clean.split(" ")[0];
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "there";
}

/**
 * Generates context-aware customer draft when external AI is not configured
 */
function generateContextualHeuristicDraft(
  subject: string,
  customerName: string,
  latestCustomerText: string,
  latestNoteText: string,
  tone: ReplyTone
): string {
  const cleanSubject = subject.replace(/^((re|fwd|fw):\s*)+/i, "").trim();

  if (tone === "quick_ack") {
    return `Hi ${customerName},

Thank you for reaching out to us. We have received your inquiry regarding "${cleanSubject}" and our team is actively looking into it.

We will follow up with you as soon as we have an update or need any further information. Thank you for your patience!

Best regards,
SystemDevify Support Team`;
  }

  if (tone === "clarification") {
    return `Hi ${customerName},

Thank you for contacting SystemDevify Support regarding "${cleanSubject}".

To help our technical team investigate and resolve this as quickly as possible, could you please provide a few additional details:

1. The exact steps you took before encountering this issue
2. Any specific error codes, screenshots, or logs displayed on your screen
3. The device, browser, or environment you were using at the time

Once we have this information, we will proceed with the investigation right away.

Best regards,
SystemDevify Support Team`;
  }

  // Formal resolution
  let resolutionContext = "";
  if (latestNoteText) {
    resolutionContext = `\nFollowing our internal review (${latestNoteText.slice(0, 150)}), we have applied the necessary fixes to resolve the behavior.\n`;
  } else {
    resolutionContext = `\nOur engineering team has thoroughly investigated the issue reported in your message and verified that all related services are operating normally.\n`;
  }

  return `Dear ${customerName},

Thank you for contacting SystemDevify Support regarding "${cleanSubject}".
${resolutionContext}
Please test this on your end at your earliest convenience and let us know if everything is functioning as expected. If you need any further assistance or have follow-up questions, feel free to reply directly to this email.

Best regards,
Customer Operations
SystemDevify`;
}

/**
 * Generates an AI-assisted or smart contextual draft based on conversation context and notes
 */
export async function generateAiReplyDraftAction(
  options: GenerateDraftOptions
): Promise<GeneratedDraftResult> {
  const session = await getServerSession();
  if (!session?.user) {
    return {
      success: false,
      tone: options.tone,
      source: "smart_context",
      error: "Unauthorized: Active session required",
    };
  }

  const { threadId, tone = "formal" } = options;

  try {
    // 1. Fetch thread details
    const [thread] = await db
      .select({
        id: threads.id,
        subject: threads.subject,
        contactEmail: threads.contactEmail,
        priority: threads.priority,
      })
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (!thread) {
      return {
        success: false,
        tone,
        source: "smart_context",
        error: "Thread not found",
      };
    }

    // 2. Fetch conversation message history
    const messageRows = await db
      .select({
        id: messages.id,
        direction: messages.direction,
        fromEmail: messages.fromEmail,
        fromName: messages.fromName,
        textBody: messages.textBody,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(asc(messages.createdAt));

    // 3. Fetch private team notes for internal resolution context
    const noteRows = await db
      .select({
        content: internalNotes.content,
        createdAt: internalNotes.createdAt,
      })
      .from(internalNotes)
      .where(eq(internalNotes.threadId, threadId))
      .orderBy(asc(internalNotes.createdAt));

    const latestInbound = [...messageRows]
      .reverse()
      .find((m) => m.direction === "inbound");

    const customerName = extractCustomerName(
      latestInbound?.fromName || null,
      thread.contactEmail
    );

    const latestCustomerText = (latestInbound?.textBody || "").slice(0, 1000);
    const latestNoteText = (noteRows[noteRows.length - 1]?.content || "").slice(0, 500);

    let draftText = "";
    let source: "gemini" | "smart_context" = "smart_context";

    // 4. Check if Gemini API is available
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey && !geminiApiKey.startsWith("your_")) {
      try {
        const conversationHistoryText = messageRows
          .slice(-5)
          .map(
            (m) =>
              `[${m.direction === "inbound" ? "Customer" : "Agent"} - ${new Date(
                m.createdAt
              ).toLocaleDateString()}]: ${m.textBody || ""}`
          )
          .join("\n\n");

        const internalNotesSummary = noteRows.length > 0
          ? `\nInternal Team Notes (Private Context):\n${noteRows
              .map((n) => `• ${n.content}`)
              .join("\n")}\n`
          : "";

        const systemPrompt = `You are an expert customer support agent at SystemDevify.
Draft a helpful, context-aware reply to the customer (${customerName}) for the following support ticket.
Ticket Subject: "${thread.subject}"
Requested Tone: ${tone}
Tone guidelines:
- formal: polite, professional, structured, comprehensive resolution.
- quick_ack: brief confirmation of receipt, reassuring customer that team is investigating.
- clarification: polite request for specific screenshots, logs, or reproduction steps.

Context:
${conversationHistoryText}
${internalNotesSummary}

Respond ONLY with the body of the email. Do not include subject lines, markdown code blocks, or greetings like "Subject: ...". Start directly with the customer greeting.`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 800,
              },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const candidateText =
            data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText && typeof candidateText === "string") {
            draftText = candidateText.trim();
            source = "gemini";
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini API call notice, falling back to smart context:", geminiErr);
      }
    }

    // 5. Fallback to smart heuristic draft engine if Gemini was not used or failed
    if (!draftText) {
      draftText = generateContextualHeuristicDraft(
        thread.subject,
        customerName,
        latestCustomerText,
        latestNoteText,
        tone
      );
      source = "smart_context";
    }

    // 6. Log audit event
    await logAuditEvent({
      actor: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      action: "ai.draft_generated",
      entityType: "thread",
      entityId: threadId,
      details: {
        tone,
        source,
        length: draftText.length,
      },
    }).catch((err) => console.warn("AI draft audit log warning:", err));

    return {
      success: true,
      draft: draftText,
      tone,
      source,
    };
  } catch (err: unknown) {
    console.error("Failed to generate AI reply draft:", err);
    return {
      success: false,
      tone,
      source: "smart_context",
      error: sanitizeErrorMessage(err),
    };
  }
}
