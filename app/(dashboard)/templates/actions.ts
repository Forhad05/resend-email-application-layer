"use server";

import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendTransactionalEmail } from "@/lib/email/transactional";

export async function createTemplateAction(data: {
  name: string;
  slug: string;
  subject: string;
  description?: string;
  textBody: string;
  htmlBody?: string;
}) {
  try {
    const slug = data.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    if (!slug) {
      return { success: false, error: "A valid unique slug is required." };
    }

    await db.insert(templates).values({
      name: data.name.trim(),
      slug,
      subject: data.subject.trim(),
      description: data.description?.trim() || null,
      textBody: data.textBody.trim(),
      htmlBody: data.htmlBody?.trim() || null,
      isActive: true,
    });

    revalidatePath("/templates");
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to create template:", err);
    return { success: false, error: "Failed to create template. Ensure slug is unique." };
  }
}

export async function updateTemplateAction(
  id: string,
  data: {
    name: string;
    subject: string;
    description?: string;
    textBody: string;
    htmlBody?: string;
  }
) {
  try {
    await db
      .update(templates)
      .set({
        name: data.name.trim(),
        subject: data.subject.trim(),
        description: data.description?.trim() || null,
        textBody: data.textBody.trim(),
        htmlBody: data.htmlBody?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(templates.id, id));

    revalidatePath("/templates");
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to update template:", err);
    return { success: false, error: "Failed to update template." };
  }
}

export async function deleteTemplateAction(id: string) {
  try {
    await db.delete(templates).where(eq(templates.id, id));
    revalidatePath("/templates");
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to delete template:", err);
    return { success: false, error: "Failed to delete template." };
  }
}

export async function sendTestTemplateEmailAction(templateSlug: string, toEmail: string) {
  return await sendTransactionalEmail({
    to: toEmail,
    templateSlug,
    variables: {
      customer_name: "Valued Customer",
      ticket_id: "TICK-9021",
      reset_link: "https://yourdomain.com/auth/reset-password?token=example_test_token",
    },
  });
}

