import * as React from "react";
import { Heading, Text, Section } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";

export interface InvestigationInProgressEmailProps {
  customerName?: string;
  ticketId?: string;
  company?: string;
  agentName?: string;
  details?: string;
}

export function InvestigationInProgressEmail({
  customerName = "Valued Customer",
  ticketId = "1042",
  company = "SystemDevify",
  agentName = "Support Team",
  details = "Our engineering team is reviewing system telemetry and backend logs.",
}: InvestigationInProgressEmailProps) {
  const previewText = `Update on Ticket #${ticketId}: Investigation in Progress - ${company}`;

  return (
    <EmailLayout previewText={previewText} companyName={company}>
      {/* Investigation Badge */}
      <div style={badgeContainerStyle}>
        <span style={badgeStyle}>Ticket #{ticketId}</span>
        <span style={investigationTagStyle}>🔍 Investigation Active</span>
      </div>

      <Heading style={headingStyle}>Technical Investigation in Progress</Heading>

      <Text style={paragraphStyle}>Hi {customerName},</Text>

      <Text style={paragraphStyle}>
        Our engineering and technical operations teams are actively diagnosing the issue reported under ticket <strong>#{ticketId}</strong>.
      </Text>

      {/* Details Box */}
      <Section style={detailsBoxStyle}>
        <Text style={detailsTitleStyle}>Current Investigation Status</Text>
        <Text style={detailsContentStyle}>{details}</Text>
      </Section>

      <Text style={paragraphStyle}>
        We are doing everything we can to resolve this as swiftly as possible. We will follow up with another progress update as soon as we reach actionable milestones or resolution.
      </Text>

      <Text style={paragraphStyle}>
        Thank you for your patience and partnership while we work through this.
      </Text>

      <Section style={signatureSectionStyle}>
        <Text style={signatureTextStyle}>
          Best regards,
          <br />
          <strong>{agentName}</strong>
          <br />
          <span style={{ color: "#71717a" }}>{company} Engineering & Support</span>
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

const investigationTagStyle: React.CSSProperties = {
  backgroundColor: "#fffbeb",
  color: "#b45309",
  padding: "4px 10px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
  display: "inline-block",
  border: "1px solid #fde68a",
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

const detailsBoxStyle: React.CSSProperties = {
  backgroundColor: "#fffdf5",
  border: "1px solid #fef08a",
  borderLeft: "4px solid #eab308",
  borderRadius: "8px",
  padding: "16px",
  margin: "18px 0",
};

const detailsTitleStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#854d0e",
  margin: "0 0 6px 0",
};

const detailsContentStyle: React.CSSProperties = {
  fontSize: "13px",
  lineHeight: "20px",
  color: "#713f12",
  margin: 0,
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
