import * as React from "react";
import { Heading, Text, Section, Button } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";

export interface IssueResolvedEmailProps {
  customerName?: string;
  ticketId?: string;
  company?: string;
  agentName?: string;
  resolutionNotes?: string;
  feedbackUrl?: string;
}

export function IssueResolvedEmail({
  customerName = "Valued Customer",
  ticketId = "1042",
  company = "SystemDevify",
  agentName = "Support Team",
  resolutionNotes = "All required system checks passed and the reported anomaly has been mitigated.",
  feedbackUrl,
}: IssueResolvedEmailProps) {
  const previewText = `Ticket #${ticketId} Resolved - ${company}`;

  return (
    <EmailLayout previewText={previewText} companyName={company}>
      {/* Success Badge */}
      <div style={badgeContainerStyle}>
        <span style={badgeStyle}>Ticket #{ticketId}</span>
        <span style={resolvedTagStyle}>✓ Resolved</span>
      </div>

      <Heading style={headingStyle}>Your issue has been resolved</Heading>

      <Text style={paragraphStyle}>Hi {customerName},</Text>

      <Text style={paragraphStyle}>
        We are happy to let you know that ticket <strong>#{ticketId}</strong> has been marked as <strong>resolved</strong> by our support team.
      </Text>

      {/* Resolution details callout */}
      <Section style={resolutionBoxStyle}>
        <Text style={resolutionTitleStyle}>Resolution Notes</Text>
        <Text style={resolutionContentStyle}>{resolutionNotes}</Text>
      </Section>

      <Text style={paragraphStyle}>
        If you still have questions or if anything related needs attention, you do not need to submit a new inquiry—simply <strong>reply directly to this email</strong> and your ticket will reopen automatically.
      </Text>

      {feedbackUrl && (
        <Section style={buttonSectionStyle}>
          <Button href={feedbackUrl} style={feedbackButtonStyle}>
            Rate Your Support Experience
          </Button>
        </Section>
      )}

      <Section style={signatureSectionStyle}>
        <Text style={signatureTextStyle}>
          Thank you for choosing {company}!
          <br />
          <strong>{agentName}</strong>
          <br />
          <span style={{ color: "#71717a" }}>{company} Customer Success</span>
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

const resolvedTagStyle: React.CSSProperties = {
  backgroundColor: "#ecfdf5",
  color: "#059669",
  padding: "4px 10px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
  display: "inline-block",
  border: "1px solid #a7f3d0",
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

const resolutionBoxStyle: React.CSSProperties = {
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderLeft: "4px solid #16a34a",
  borderRadius: "8px",
  padding: "16px",
  margin: "18px 0",
};

const resolutionTitleStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#166534",
  margin: "0 0 6px 0",
};

const resolutionContentStyle: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#14532d",
  margin: 0,
};

const buttonSectionStyle: React.CSSProperties = {
  margin: "24px 0 16px 0",
};

const feedbackButtonStyle: React.CSSProperties = {
  backgroundColor: "#16a34a",
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
