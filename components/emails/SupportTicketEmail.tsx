import * as React from "react";
import { Heading, Text, Section, Button } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";

export interface SupportTicketEmailProps {
  customerName?: string;
  ticketId?: string;
  company?: string;
  agentName?: string;
  summary?: string;
  viewTicketUrl?: string;
}

export function SupportTicketEmail({
  customerName = "Valued Customer",
  ticketId = "1042",
  company = "SystemDevify",
  agentName = "Support Team",
  summary = "We've received your inquiry and our engineering team is actively reviewing the ticket details.",
  viewTicketUrl,
}: SupportTicketEmailProps) {
  const previewText = `Ticket #${ticketId} Received - ${company}`;

  return (
    <EmailLayout previewText={previewText} companyName={company}>
      {/* Badge / Status Tag */}
      <div style={badgeContainerStyle}>
        <span style={badgeStyle}>Ticket #{ticketId}</span>
        <span style={statusTagStyle}>Received & In Queue</span>
      </div>

      <Heading style={headingStyle}>We&apos;ve received your request</Heading>

      <Text style={paragraphStyle}>Hi {customerName},</Text>

      <Text style={paragraphStyle}>
        Thanks for reaching out to <strong>{company}</strong> support. We have logged ticket{" "}
        <strong>#{ticketId}</strong> and assigned it to our technical support queue.
      </Text>

      {/* Information Box */}
      <Section style={infoBoxStyle}>
        <Text style={infoBoxTitleStyle}>Ticket Summary & SLA Notice</Text>
        <Text style={infoBoxContentStyle}>{summary}</Text>
        <Text style={slaTextStyle}>
          ⏱️ <strong>Typical First Response:</strong> Within 2 to 4 business hours.
        </Text>
      </Section>

      <Text style={paragraphStyle}>
        If you have error traces, screenshots, or additional reproduction steps, simply reply directly to this email to append them to your ticket history.
      </Text>

      {viewTicketUrl && (
        <Section style={buttonSectionStyle}>
          <Button href={viewTicketUrl} style={primaryButtonStyle}>
            View Ticket Status
          </Button>
        </Section>
      )}

      <Section style={signatureSectionStyle}>
        <Text style={signatureTextStyle}>
          Best regards,
          <br />
          <strong>{agentName}</strong>
          <br />
          <span style={{ color: "#71717a" }}>{company} Customer Operations</span>
        </Text>
      </Section>
    </EmailLayout>
  );
}

const badgeContainerStyle: React.CSSProperties = {
  marginBottom: "16px",
};

const badgeStyle: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  color: "#27272a",
  padding: "4px 10px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
  marginRight: "8px",
  display: "inline-block",
  border: "1px solid #e4e4e7",
};

const statusTagStyle: React.CSSProperties = {
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  padding: "4px 10px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
  display: "inline-block",
  border: "1px solid #dbeafe",
};

const headingStyle: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  lineHeight: "28px",
  letterSpacing: "-0.02em",
  color: "#09090b",
  margin: "0 0 16px 0",
};

const paragraphStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#3f3f46",
  margin: "0 0 14px 0",
};

const infoBoxStyle: React.CSSProperties = {
  backgroundColor: "#fbfbfa",
  border: "1px solid #e4e4e7",
  borderLeft: "4px solid #2563eb",
  borderRadius: "8px",
  padding: "16px",
  margin: "18px 0",
};

const infoBoxTitleStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#09090b",
  margin: "0 0 6px 0",
};

const infoBoxContentStyle: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#52525b",
  margin: "0 0 10px 0",
};

const slaTextStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#71717a",
  margin: 0,
};

const buttonSectionStyle: React.CSSProperties = {
  margin: "24px 0 16px 0",
};

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: "#09090b",
  color: "#ffffff",
  padding: "10px 20px",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
};

const signatureSectionStyle: React.CSSProperties = {
  marginTop: "24px",
  borderTop: "1px solid #f4f4f5",
  paddingTop: "16px",
};

const signatureTextStyle: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#27272a",
  margin: 0,
};
