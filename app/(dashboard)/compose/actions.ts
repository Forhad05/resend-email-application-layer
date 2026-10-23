"use server";

import { sendEmail, SendEmailResult } from "@/lib/email/send";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { suppressions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function sendEmailAction(
  formData: FormData
): Promise<SendEmailResult> {
  const from = (formData.get("from") as string) || undefined;
  const toRaw = (formData.get("to") as string) || "";
  const ccRaw = (formData.get("cc") as string) || "";
  const bccRaw = (formData.get("bcc") as string) || "";
  const subject = (formData.get("subject") as string) || "";
  const body = (formData.get("body") as string) || "";

  if (!toRaw.trim()) {
    return { success: false, error: "Recipient email address is required." };
  }

  const to = toRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const cc = ccRaw
    ? ccRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const bcc = bccRaw
    ? bccRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const result = await sendEmail({
    to,
    from,
    cc,
    bcc,
    subject,
    body,
  });

  if (result.success) {
    revalidatePath("/inbox");
  }

  return result;
}

export async function checkRecipientSuppressionAction(emailOrEmails: string): Promise<{
  isSuppressed: boolean;
  suppressedEmail?: string;
  reason?: string;
}> {
  try {
    const rawTokens = emailOrEmails
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.includes("@"));

    if (rawTokens.length === 0) {
      return { isSuppressed: false };
    }

    for (const token of rawTokens) {
      const clean = token.replace(/^.*<([^>]+)>.*$/, "$1");
      const [record] = await db
        .select({ reason: suppressions.reason })
        .from(suppressions)
        .where(eq(suppressions.email, clean))
        .limit(1);

      if (record) {
        return {
          isSuppressed: true,
          suppressedEmail: clean,
          reason: record.reason,
        };
      }
    }

    return { isSuppressed: false };
  } catch (err: unknown) {
    console.warn("Could not check suppression list:", err);
    return { isSuppressed: false };
  }
}
