import * as React from "react";
import { render } from "@react-email/render";
import {
  SupportTicketEmail,
  IssueResolvedEmail,
  PasswordResetEmail,
  InvestigationInProgressEmail,
  TransactionalNoticeEmail,
} from "@/components/emails";

export interface RenderedEmail {
  html: string;
  text: string;
}

/**
 * Renders a React Email component into clean, cross-client HTML and matching plain text.
 */
export async function renderReactEmail(
  component: React.ReactElement
): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([
    render(component),
    render(component, { plainText: true }),
  ]);

  return { html, text };
}

/**
 * Returns a React Email element corresponding to a template slug with injected variables.
 */
export function getReactEmailComponentBySlug(
  slug: string,
  variables: Record<string, string> = {}
): React.ReactElement | null {
  const customerName = variables.customer_name || "Valued Customer";
  const company = variables.company || "SystemDevify";
  const agentName = variables.agent_name || "Support Team";
  const ticketId = variables.ticket_id || "1001";

  switch (slug) {
    case "support-ticket-received":
      return React.createElement(SupportTicketEmail, {
        customerName,
        ticketId,
        company,
        agentName,
        summary: variables.summary,
        viewTicketUrl: variables.view_ticket_url,
      });

    case "issue-resolved":
      return React.createElement(IssueResolvedEmail, {
        customerName,
        ticketId,
        company,
        agentName,
        resolutionNotes: variables.resolution_notes,
        feedbackUrl: variables.feedback_url,
      });

    case "password-reset":
      return React.createElement(PasswordResetEmail, {
        customerName,
        company,
        resetLink:
          variables.reset_link ||
          "https://mail.systemdevify.com/auth/reset-password",
        expiresInMinutes: variables.expires_in_minutes
          ? parseInt(variables.expires_in_minutes, 10)
          : 60,
        userIpAddress: variables.user_ip,
      });

    case "investigation-in-progress":
      return React.createElement(InvestigationInProgressEmail, {
        customerName,
        ticketId,
        company,
        agentName,
        details: variables.details,
      });

    case "transactional-notice":
      return React.createElement(TransactionalNoticeEmail, {
        heading: variables.heading || "Account Notification",
        customerName,
        message:
          variables.message ||
          "This is an automated notification regarding your recent account activity.",
        actionLabel: variables.action_label,
        actionUrl: variables.action_url,
        note: variables.note,
        company,
      });

    default:
      return null;
  }
}

/**
 * Checks if a template slug is backed by a React Email component.
 */
export function isReactEmailSupported(slug: string): boolean {
  const supportedSlugs = [
    "support-ticket-received",
    "issue-resolved",
    "password-reset",
    "investigation-in-progress",
    "transactional-notice",
  ];
  return supportedSlugs.includes(slug);
}

/**
 * Renders a React Email template by slug with the provided variable map.
 * Returns null if the slug has no React Email implementation.
 */
export async function renderReactEmailBySlug(
  slug: string,
  variables: Record<string, string> = {}
): Promise<RenderedEmail | null> {
  const element = getReactEmailComponentBySlug(slug, variables);
  if (!element) {
    return null;
  }

  return renderReactEmail(element);
}
