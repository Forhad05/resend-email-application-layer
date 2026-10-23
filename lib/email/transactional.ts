import { resend } from "@/lib/resend";
import { db } from "@/lib/db";
import { threads, messages, suppressions, senderIdentities } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getTemplateBySlug, interpolateTemplate } from "./templates";

export interface SendTransactionalParams {
  to: string | string[];
  templateSlug: string;
  variables?: Record<string, string>;
  fromEmail?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface SendTransactionalResult {
  success: boolean;
  emailId?: string;
  messageId?: string;
  threadId?: string;
  error?: string;
}

/**
 * Sends a transactional email based on a registered template slug with variable interpolation
 * and suppression list protection.
 */
export async function sendTransactionalEmail({
  to,
  templateSlug,
  variables = {},
  fromEmail,
  idempotencyKey,
}: SendTransactionalParams): Promise<SendTransactionalResult> {
  try {
    const toEmails = Array.isArray(to) ? to : [to];
    const primaryRecipient = toEmails[0]?.trim().toLowerCase();

    if (!primaryRecipient) {
      return { success: false, error: "Recipient email address is required." };
    }

    // 1. Check suppression list
    const suppressed = await db
      .select({ email: suppressions.email, reason: suppressions.reason })
      .from(suppressions)
      .where(eq(suppressions.email, primaryRecipient))
      .limit(1);

    if (suppressed.length > 0) {
      return {
        success: false,
        error: `Cannot send: ${primaryRecipient} is on the suppression list (${suppressed[0].reason}).`,
      };
    }

    // 2. Fetch template
    const template = await getTemplateBySlug(templateSlug);
    if (!template) {
      return {
        success: false,
        error: `Template with slug "${templateSlug}" not found.`,
      };
    }

    // 3. Resolve From address
    let sender = fromEmail;
    if (!sender) {
      const [defaultIdentity] = await db
        .select()
        .from(senderIdentities)
        .where(eq(senderIdentities.isDefault, true))
        .limit(1);

      if (defaultIdentity) {
        sender = `${defaultIdentity.name} <${defaultIdentity.email}>`;
      } else {
        sender = process.env.EMAIL_FROM || "Support <support@mail.systemdevify.com>";
      }
    }

    // 4. Default interpolation variables
    const finalVariables: Record<string, string> = {
      customer_name: primaryRecipient.split("@")[0],
      company: "SystemDevify",
      support_email: "support@mail.systemdevify.com",
      ...variables,
    };

    const interpolatedSubject = interpolateTemplate(template.subject, finalVariables);
    const interpolatedText = interpolateTemplate(template.textBody || "", finalVariables);
    const interpolatedHtml = interpolateTemplate(
      template.htmlBody || `<div style="font-family:sans-serif;line-height:1.6;">${interpolatedText.replace(/\n/g, "<br/>")}</div>`,
      finalVariables
    );

    // 5. Send email via Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey || resendApiKey.startsWith("re_placeholder") || resendApiKey.length < 10) {
      return {
        success: false,
        error: "RESEND_API_KEY is not configured with a valid live API key.",
      };
    }

    const { data: resendData, error: resendError } = await resend.emails.send({
      from: sender,
      to: toEmails,
      subject: interpolatedSubject,
      text: interpolatedText,
      html: interpolatedHtml,
      headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
    });

    if (resendError || !resendData) {
      return {
        success: false,
        error: resendError?.message || "Failed to deliver transactional email via Resend.",
      };
    }

    // 6. Record thread & message in database
    const [newThread] = await db
      .insert(threads)
      .values({
        subject: interpolatedSubject,
        status: "closed",
        priority: "normal",
        contactEmail: primaryRecipient,
        messageCount: 1,
        lastMessageAt: new Date(),
        isRead: true,
      })
      .returning();

    const [insertedMsg] = await db
      .insert(messages)
      .values({
        threadId: newThread.id,
        direction: "outbound",
        fromEmail: sender,
        toEmails: toEmails,
        subject: interpolatedSubject,
        textBody: interpolatedText,
        htmlBody: interpolatedHtml,
        resendEmailId: resendData.id,
        status: "sent",
      })
      .returning();

    return {
      success: true,
      emailId: resendData.id,
      messageId: insertedMsg.id,
      threadId: newThread.id,
    };
  } catch (err: unknown) {
    console.error("Transactional email execution failed:", err);
    return {
      success: false,
      error: (err as Error).message || "An unexpected error occurred while sending.",
    };
  }
}

