import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { interpolateTemplate, TemplateVariableMap } from "./template-utils";

export { interpolateTemplate, type TemplateVariableMap };

export const DEFAULT_TEMPLATES = [
  {
    name: "Support Ticket Received",
    slug: "support-ticket-received",
    subject: "We've received your request [Ticket #{{ticket_id}}]",
    description: "Standard canned confirmation acknowledging customer inquiry.",
    textBody: `Hi {{customer_name}},

Thanks for reaching out to {{company}} support. We've received your message regarding ticket #{{ticket_id}} and our team is actively looking into it.

We typically respond within 2 to 4 business hours. If you have any additional details or error logs, simply reply to this email.

Best regards,
{{agent_name}}
{{company}} Support Team`,
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937;">
  <p>Hi <strong>{{customer_name}}</strong>,</p>
  <p>Thanks for reaching out to <strong>{{company}}</strong> support. We've received your message regarding ticket <strong>#{{ticket_id}}</strong> and our team is actively looking into it.</p>
  <p>We typically respond within 2 to 4 business hours. If you have any additional details or error logs, simply reply directly to this email.</p>
  <p style="margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px; color: #4b5563;">
    Best regards,<br />
    <strong>{{agent_name}}</strong><br />
    {{company}} Support Team
  </p>
</div>`,
  },
  {
    name: "Issue Resolved",
    slug: "issue-resolved",
    subject: "Your issue has been resolved [Ticket #{{ticket_id}}]",
    description: "Canned response informing customer that their inquiry has been resolved.",
    textBody: `Hi {{customer_name}},

We're pleased to let you know that ticket #{{ticket_id}} has been marked as resolved.

If you still need assistance or if anything else comes up, simply reply directly to this thread and we'll reopen it immediately.

Thank you for choosing {{company}}!

Best regards,
{{agent_name}}`,
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937;">
  <p>Hi <strong>{{customer_name}}</strong>,</p>
  <p>We're pleased to let you know that ticket <strong>#{{ticket_id}}</strong> has been marked as resolved.</p>
  <p>If you still need assistance or if anything else comes up, simply reply directly to this thread and we'll reopen it immediately.</p>
  <p>Thank you for choosing <strong>{{company}}</strong>!</p>
  <p style="margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px; color: #4b5563;">
    Best regards,<br />
    <strong>{{agent_name}}</strong>
  </p>
</div>`,
  },
  {
    name: "Investigation in Progress",
    slug: "investigation-in-progress",
    subject: "Update on ticket #{{ticket_id}}: Investigation in progress",
    description: "Update letting customer know technical investigation is underway.",
    textBody: `Hi {{customer_name}},

Our engineering team is currently investigating the issue reported in ticket #{{ticket_id}}. We are reviewing backend logs and system diagnostics.

We will follow up with another update as soon as we have actionable findings. Thank you for your patience!

Best regards,
{{agent_name}}
{{company}} Technical Support`,
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937;">
  <p>Hi <strong>{{customer_name}}</strong>,</p>
  <p>Our engineering team is currently investigating the issue reported in ticket <strong>#{{ticket_id}}</strong>. We are reviewing backend logs and system diagnostics.</p>
  <p>We will follow up with another update as soon as we have actionable findings. Thank you for your patience!</p>
  <p style="margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px; color: #4b5563;">
    Best regards,<br />
    <strong>{{agent_name}}</strong><br />
    {{company}} Technical Support
  </p>
</div>`,
  },
  {
    name: "Password Reset Request",
    slug: "password-reset",
    subject: "Reset your {{company}} password",
    description: "Transactional email containing password reset instructions.",
    textBody: `Hi {{customer_name}},

We received a request to reset your password for your {{company}} account.

Please visit the link below to set a new password:
{{reset_link}}

This link expires in 60 minutes. If you did not make this request, you can safely ignore this email.

Best regards,
The {{company}} Security Team`,
    htmlBody: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937;">
  <p>Hi <strong>{{customer_name}}</strong>,</p>
  <p>We received a request to reset your password for your <strong>{{company}}</strong> account.</p>
  <p style="margin: 20px 0;">
    <a href="{{reset_link}}" style="background-color: #000; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; display: inline-block;">Reset Password</a>
  </p>
  <p style="font-size: 12px; color: #6b7280;">This link expires in 60 minutes. If you did not make this request, you can safely ignore this email.</p>
  <p style="margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px; color: #4b5563;">
    Best regards,<br />
    The {{company}} Security Team
  </p>
</div>`,
  },
];

/**
 * Retrieves all templates from the database, auto-seeding defaults if the table is empty.
 */
export async function getTemplates() {
  await connection();
  try {
    const existing = await db.select().from(templates);
    if (existing.length > 0) {
      return existing;
    }

    // Auto-seed defaults
    for (const tpl of DEFAULT_TEMPLATES) {
      await db
        .insert(templates)
        .values({
          name: tpl.name,
          slug: tpl.slug,
          subject: tpl.subject,
          description: tpl.description,
          textBody: tpl.textBody,
          htmlBody: tpl.htmlBody,
          isActive: true,
        })
        .onConflictDoNothing();
    }

    return await db.select().from(templates);
  } catch (err: unknown) {
    console.error("Failed to fetch or seed email templates:", err);
    return [];
  }
}

/**
 * Retrieves a single template by slug.
 */
export async function getTemplateBySlug(slug: string) {
  try {
    const [tpl] = await db
      .select()
      .from(templates)
      .where(eq(templates.slug, slug))
      .limit(1);

    return tpl || null;
  } catch (err: unknown) {
    console.error(`Failed to load template with slug "${slug}":`, err);
    return null;
  }
}
