import { resend } from "@/lib/resend";
import { db } from "@/lib/db";
import { threads, messages, suppressions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export interface ReplyEmailParams {
  threadId: string;
  body: string;
  sentByUserId?: string;
}

export async function replyToThread({
  threadId,
  body,
  sentByUserId,
}: ReplyEmailParams) {
  try {
    // 1. Load thread and latest message
    const [thread] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, threadId))
      .limit(1);

    if (!thread) {
      return { success: false, error: "Thread not found." };
    }

    const previousMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.threadId, threadId))
      .orderBy(desc(messages.createdAt));

    const latestMessage = previousMessages[0];

    // 2. Check suppressions
    const suppressed = await db
      .select({ email: suppressions.email })
      .from(suppressions)
      .where(eq(suppressions.email, thread.contactEmail.toLowerCase()));

    if (suppressed.length > 0) {
      return {
        success: false,
        error: `Cannot send reply: ${thread.contactEmail} is on the suppression list.`,
      };
    }

    // 3. Resolve Sender Address
    let senderAddress: string | null = null;

    // Check if there was an earlier outbound message from this thread
    const priorOutbound = previousMessages.find((m) => m.direction === "outbound" && m.fromEmail);
    if (priorOutbound?.fromEmail) {
      senderAddress = priorOutbound.fromEmail;
    } else {
      // If it started from an inbound message, check which of our mailboxes it was sent to
      const priorInbound = previousMessages.find((m) => m.direction === "inbound" && m.toEmails?.length > 0);
      if (priorInbound?.toEmails?.[0]) {
        senderAddress = priorInbound.toEmails[0];
      }
    }

    if (!senderAddress) {
      senderAddress = process.env.EMAIL_FROM || "Support <support@mail.systemdevify.com>";
    }

    const subject = thread.subject.startsWith("Re:")
      ? thread.subject
      : `Re: ${thread.subject}`;

    // 4. Construct References header chain
    const existingMessageIds = previousMessages
      .map((m) => m.messageId)
      .filter(Boolean) as string[];
    const inReplyTo = latestMessage?.messageId || undefined;
    const referencesHeader = existingMessageIds.join(" ") || undefined;

    // 5. Send via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (
      !resendApiKey ||
      resendApiKey.startsWith("re_placeholder") ||
      resendApiKey.length < 10
    ) {
      return {
        success: false,
        error:
          "Please configure a valid RESEND_API_KEY in your .env.local file to send real emails.",
      };
    }

    const { data: resendData, error: resendError } = await resend.emails.send({
      from: senderAddress,
      to: [thread.contactEmail],
      subject,
      text: body,
      html: `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">${body.replace(
        /\n/g,
        "<br/>"
      )}</div>`,
      headers: inReplyTo
        ? {
            "In-Reply-To": inReplyTo,
            References: referencesHeader || inReplyTo,
          }
        : undefined,
    });

    if (resendError) {
      return {
        success: false,
        error: `Resend API Error: ${resendError.message}`,
      };
    }

    // 6. Record message in DB
    const [newMessage] = await db
      .insert(messages)
      .values({
        threadId: thread.id,
        direction: "outbound",
        resendEmailId: resendData?.id,
        fromEmail: senderAddress,
        toEmails: [thread.contactEmail],
        subject,
        textBody: body,
        htmlBody: `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">${body.replace(
          /\n/g,
          "<br/>"
        )}</div>`,
        inReplyTo: inReplyTo,
        referencesHeader: referencesHeader,
        status: "sent",
        sentBy: sentByUserId,
      })
      .returning({ id: messages.id });

    // 7. Update thread counters
    await db
      .update(threads)
      .set({
        messageCount: (thread.messageCount || 0) + 1,
        lastMessageAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(threads.id, thread.id));

    return {
      success: true,
      messageId: newMessage.id,
      resendId: resendData?.id,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Unexpected error sending reply";
    console.error("replyToThread failed:", err);
    return { success: false, error: errorMsg };
  }
}

