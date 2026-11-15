"use server";

import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendTransactionalEmail } from "@/lib/email/transactional";
import {
  isReactEmailSupported,
  renderReactEmailBySlug,
} from "@/lib/email/react-email";
import { logAuditEvent } from "@/lib/audit";

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

    const [created] = await db
      .insert(templates)
      .values({
        name: data.name.trim(),
        slug,
        subject: data.subject.trim(),
        description: data.description?.trim() || null,
        textBody: data.textBody.trim(),
        htmlBody: data.htmlBody?.trim() || null,
        isActive: true,
      })
      .returning({ id: templates.id });

    await logAuditEvent({
      action: "template.created",
      entityType: "template",
      entityId: created?.id || slug,
      details: {
        name: data.name.trim(),
        slug,
        subject: data.subject.trim(),
      },
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

    await logAuditEvent({
      action: "template.updated",
      entityType: "template",
      entityId: id,
      details: {
        name: data.name.trim(),
        subject: data.subject.trim(),
      },
    });

    revalidatePath("/templates");
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to update template:", err);
    return { success: false, error: "Failed to update template." };
  }
}

export async function deleteTemplateAction(id: string) {
  try {
    const [existing] = await db
      .select({ name: templates.name, slug: templates.slug })
      .from(templates)
      .where(eq(templates.id, id))
      .limit(1);

    await db.delete(templates).where(eq(templates.id, id));

    await logAuditEvent({
      action: "template.deleted",
      entityType: "template",
      entityId: id,
      details: {
        name: existing?.name,
        slug: existing?.slug,
      },
    });

    revalidatePath("/templates");
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to delete template:", err);
    return { success: false, error: "Failed to delete template." };
  }
}

export async function sendTestTemplateEmailAction(
  templateSlug: string,
  toEmail: string,
  useReactEmail: boolean = true
) {
  return await sendTransactionalEmail({
    to: toEmail,
    templateSlug,
    useReactEmail,
    variables: {
      customer_name: "Valued Customer",
      ticket_id: "TICK-9021",
      reset_link: "https://yourdomain.com/auth/reset-password?token=example_test_token",
    },
  });
}

export async function previewReactEmailAction(
  templateSlug: string,
  variables?: Record<string, string>
) {
  if (!isReactEmailSupported(templateSlug)) {
    return { isSupported: false, html: null, text: null };
  }

  const defaultVars: Record<string, string> = {
    customer_name: "Alex Johnson",
    ticket_id: "TICK-8080",
    company: "SystemDevify",
    agent_name: "Sarah Miller",
    reset_link:
      "https://mail.systemdevify.com/auth/reset-password?token=example_secure_token",
    summary:
      "Customer reported an intermittent latency spike when accessing the analytics dashboard.",
    resolution_notes:
      "DNS caching layer re-initialized and query optimizations applied to analytics aggregation table.",
    details:
      "Analyzing database connection pool logs and inspecting Redis cache hit ratios.",
    view_ticket_url: "https://mail.systemdevify.com/inbox/TICK-8080",
    ...variables,
  };

  const rendered = await renderReactEmailBySlug(templateSlug, defaultVars);
  if (!rendered) {
    return { isSupported: false, html: null, text: null };
  }

  return {
    isSupported: true,
    html: rendered.html,
    text: rendered.text,
  };
}

