import * as React from "react";
import { Heading, Text, Section, Button, Link } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";

export interface PasswordResetEmailProps {
  customerName?: string;
  company?: string;
  resetLink?: string;
  expiresInMinutes?: number;
  userIpAddress?: string;
}

export function PasswordResetEmail({
  customerName = "User",
  company = "SystemDevify",
  resetLink = "https://mail.systemdevify.com/reset-password?token=example_token",
  expiresInMinutes = 60,
  userIpAddress,
}: PasswordResetEmailProps) {
  const previewText = `Reset your ${company} password`;

  return (
    <EmailLayout previewText={previewText} companyName={company}>
      {/* Security Shield Tag */}
      <div style={badgeContainerStyle}>
        <span style={securityTagStyle}>🔒 Security Verification</span>
      </div>

      <Heading style={headingStyle}>Password Reset Request</Heading>

      <Text style={paragraphStyle}>Hi {customerName},</Text>

      <Text style={paragraphStyle}>
        We received a request to reset the password for your <strong>{company}</strong> account. Click the button below to choose a new secure password:
      </Text>

      {/* Primary Action Button */}
      <Section style={buttonSectionStyle}>
        <Button href={resetLink} style={primaryActionButtonStyle}>
          Reset My Password
        </Button>
      </Section>

      <Text style={expiryTextStyle}>
        ⏱️ This password reset link will expire in <strong>{expiresInMinutes} minutes</strong> for security reasons.
      </Text>

      {/* Security Advisory Box */}
      <Section style={advisoryBoxStyle}>
        <Text style={advisoryTitleStyle}>Security Notice</Text>
        <Text style={advisoryTextStyle}>
          If you did not request this password reset, no action is needed. Your current password remains safe and will not change. We recommend reviewing your recent login activity if you suspect unauthorized access.
          {userIpAddress && (
            <span style={{ display: "block", marginTop: "6px" }}>
              Request originated from IP: <code>{userIpAddress}</code>
            </span>
          )}
        </Text>
      </Section>

      {/* Direct Link Fallback */}
      <Section style={fallbackSectionStyle}>
        <Text style={fallbackHeaderStyle}>Trouble clicking the button? Copy and paste this URL into your browser:</Text>
        <Link href={resetLink} style={fallbackLinkStyle}>
          {resetLink}
        </Link>
      </Section>
    </EmailLayout>
  );
}

const badgeContainerStyle: React.CSSProperties = {
  marginBottom: "16px",
};

const securityTagStyle: React.CSSProperties = {
  backgroundColor: "#fef2f2",
  color: "#991b1b",
  padding: "4px 10px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 600,
  display: "inline-block",
  border: "1px solid #fee2e2",
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

const primaryActionButtonStyle: React.CSSProperties = {
  backgroundColor: "#09090b",
  color: "#ffffff",
  padding: "12px 24px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
};

const expiryTextStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#71717a",
  margin: "12px 0",
};

const advisoryBoxStyle: React.CSSProperties = {
  backgroundColor: "#fafafa",
  border: "1px solid #e4e4e7",
  borderRadius: "8px",
  padding: "14px 16px",
  margin: "20px 0",
};

const advisoryTitleStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
  color: "#71717a",
  margin: "0 0 4px 0",
};

const advisoryTextStyle: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#52525b",
  margin: 0,
};

const fallbackSectionStyle: React.CSSProperties = {
  marginTop: "20px",
  paddingTop: "14px",
  borderTop: "1px solid #f4f4f5",
};

const fallbackHeaderStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#a1a1aa",
  margin: "0 0 4px 0",
};

const fallbackLinkStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#2563eb",
  wordBreak: "break-all" as const,
};
