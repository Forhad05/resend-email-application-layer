import * as React from "react";
import { Heading, Text, Section, Button } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";

export interface TransactionalNoticeEmailProps {
  heading?: string;
  customerName?: string;
  message?: string;
  actionLabel?: string;
  actionUrl?: string;
  note?: string;
  company?: string;
}

export function TransactionalNoticeEmail({
  heading = "Important Account Notification",
  customerName = "User",
  message = "This is a notification regarding your recent account activity or system status update.",
  actionLabel,
  actionUrl,
  note,
  company = "SystemDevify",
}: TransactionalNoticeEmailProps) {
  const previewText = `${heading} - ${company}`;

  return (
    <EmailLayout previewText={previewText} companyName={company}>
      <div style={badgeContainerStyle}>
        <span style={noticeTagStyle}>System Notice</span>
      </div>

      <Heading style={headingStyle}>{heading}</Heading>

      <Text style={paragraphStyle}>Hi {customerName},</Text>

      <Text style={paragraphStyle}>{message}</Text>

      {actionLabel && actionUrl && (
        <Section style={buttonSectionStyle}>
          <Button href={actionUrl} style={actionButtonStyle}>
            {actionLabel}
          </Button>
        </Section>
      )}

      {note && (
        <Section style={noteBoxStyle}>
          <Text style={noteTextStyle}>{note}</Text>
        </Section>
      )}

      <Section style={signatureSectionStyle}>
        <Text style={signatureTextStyle}>
          Best regards,
          <br />
          <strong>The {company} Team</strong>
        </Text>
      </Section>
    </EmailLayout>
  );
}

const badgeContainerStyle: React.CSSProperties = {
  marginBottom: "16px",
};

const noticeTagStyle: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  color: "#3f3f46",
  padding: "4px 10px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
  display: "inline-block",
  border: "1px solid #e4e4e7",
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

const buttonSectionStyle: React.CSSProperties = {
  margin: "24px 0 16px 0",
};

const actionButtonStyle: React.CSSProperties = {
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

const noteBoxStyle: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "12px 16px",
  margin: "18px 0",
};

const noteTextStyle: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#6b7280",
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
