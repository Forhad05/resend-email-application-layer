"use server";

import { sendEmail, SendEmailResult } from "@/lib/email/send";
import { revalidatePath } from "next/cache";

export async function sendEmailAction(
  formData: FormData
): Promise<SendEmailResult> {
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

