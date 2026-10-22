import { resend } from "@/lib/resend";
import { db } from "@/lib/db";
import { threads, messages, suppressions, contacts } from "@/lib/db/schema";
import { inArray, eq } from "drizzle-orm";

export interface SendEmailParams {
  to: string[];
  subject: string;
  body: string; // Plain text or HTML
  from?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  sentByUserId?: string;
}

export interface SendEmailResult {
  success: boolean;
  threadId?: string;
  messageId?: string;
  resendId?: string;
  error?: string;
}

export async function sendEmail({
  to,
  subject,
  body,
  from,
  cc = [],
  bcc = [],
  replyTo,
  sentByUserId,
}: SendEmailParams): Promise<SendEmailResult> {
  try {
    // 1. Clean & validate email addresses
    const cleanedTo = to.map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (cleanedTo.length === 0) {
      return { success: false, error: "At least one recipient is required." };
    }

    // 2. Check suppressions table (bounce / complaint protection)
    const allRecipients = [...cleanedTo, ...cc.map((e) => e.trim().toLowerCase())];
    const suppressed = await db
      .select({ email: suppressions.email, reason: suppressions.reason })
      .from(suppressions)
      .where(inArray(suppressions.email, allRecipients));

    if (suppressed.length > 0) {
      const blockedList = suppressed
        .map((s) => `${s.email} (${s.reason})`)
        .join(", ");
      return {
        success: false,
        error: `Cannot send email: recipient(s) are suppressed: ${blockedList}`,
      };
    }

    // 3. Determine sender address
    const defaultSender =
      process.env.EMAIL_FROM || "Support <onboarding@resend.dev>";
    const sender = from || defaultSender;

    // 4. Send via Resend API
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
      from: sender,
      to: cleanedTo,
      subject: subject || "(No Subject)",
      text: body,
      html: `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">${body.replace(
        /\n/g,
        "<br/>"
      )}</div>`,
      cc: cc.length > 0 ? cc : undefined,
      bcc: bcc.length > 0 ? bcc : undefined,
      replyTo: replyTo,
    });

    if (resendError) {
      return {
        success: false,
        error: `Resend API Error: ${resendError.message}`,
      };
    }

    const primaryRecipient = cleanedTo[0];

    // 5. Find or create Contact in database
    let contactId: string | undefined;
    const existingContact = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(eq(contacts.email, primaryRecipient))
      .limit(1);

    if (existingContact.length > 0) {
      contactId = existingContact[0].id;
    } else {
      const [newContact] = await db
        .insert(contacts)
        .values({
          email: primaryRecipient,
          name: primaryRecipient.split("@")[0],
        })
        .returning({ id: contacts.id });
      contactId = newContact?.id;
    }

    // 6. Create Thread in database
    const [newThread] = await db
      .insert(threads)
      .values({
        subject: subject || "(No Subject)",
        status: "open",
        priority: "normal",
        contactEmail: primaryRecipient,
        contactId: contactId,
        messageCount: 1,
        lastMessageAt: new Date(),
        isRead: true, // Outbound is marked read for agent
        assignedTo: sentByUserId,
      })
      .returning({ id: threads.id });

    // 7. Store Outbound Message record in database
    const [newMessage] = await db
      .insert(messages)
      .values({
        threadId: newThread.id,
        direction: "outbound",
        resendEmailId: resendData?.id,
        fromEmail: sender,
        toEmails: cleanedTo,
        ccEmails: cc,
        bccEmails: bcc,
        replyTo: replyTo,
        subject: subject,
        textBody: body,
        htmlBody: `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">${body.replace(
          /\n/g,
          "<br/>"
        )}</div>`,
        status: "sent",
        sentBy: sentByUserId,
      })
      .returning({ id: messages.id });

    return {
      success: true,
      threadId: newThread.id,
      messageId: newMessage.id,
      resendId: resendData?.id,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Unexpected error sending email";
    console.error("sendEmail failed:", err);
    return { success: false, error: errorMsg };
  }
}
