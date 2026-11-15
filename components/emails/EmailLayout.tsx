import * as React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Hr,
  Link,
} from "@react-email/components";

export interface EmailLayoutProps {
  previewText?: string;
  companyName?: string;
  supportEmail?: string;
  children: React.ReactNode;
}

export function EmailLayout({
  previewText = "Notification from SystemDevify",
  companyName = "SystemDevify",
  supportEmail = "support@mail.systemdevify.com",
  children,
}: EmailLayoutProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={mainStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerSectionStyle}>
            <table width="100%" cellPadding="0" cellSpacing="0" border={0}>
              <tr>
                <td style={{ verticalAlign: "middle" }}>
                  <Text style={logoTextStyle}>
                    <span style={logoMarkStyle}>✉</span> {companyName}
                  </Text>
                </td>
                <td align="right" style={{ verticalAlign: "middle" }}>
                  <Text style={headerSubtextStyle}>Internal Application Layer</Text>
                </td>
              </tr>
            </table>
          </Section>

          <Hr style={dividerStyle} />

          {/* Main Content */}
          <Section style={contentSectionStyle}>{children}</Section>

          <Hr style={dividerStyle} />

          {/* Footer */}
          <Section style={footerSectionStyle}>
            <Text style={footerTextStyle}>
              This email was sent by <strong>{companyName}</strong>. If you have questions, please reach out to our team at{" "}
              <Link href={`mailto:${supportEmail}`} style={linkStyle}>
                {supportEmail}
              </Link>
              .
            </Text>
            <Text style={copyrightTextStyle}>
              © {new Date().getFullYear()} {companyName}. All rights reserved. • High-Reliability Delivery
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Inline styles for cross-client email compatibility (Outlook, Apple Mail, Gmail)
const mainStyle: React.CSSProperties = {
  backgroundColor: "#f4f4f5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: 0,
  padding: "24px 0",
};

const containerStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "32px 32px 24px",
  borderRadius: "12px",
  maxWidth: "600px",
  border: "1px solid #e4e4e7",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
};

const headerSectionStyle: React.CSSProperties = {
  paddingBottom: "8px",
};

const logoTextStyle: React.CSSProperties = {
  fontSize: "17px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: "#09090b",
  margin: 0,
};

const logoMarkStyle: React.CSSProperties = {
  display: "inline-block",
  marginRight: "6px",
  color: "#2563eb",
};

const headerSubtextStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#71717a",
  margin: 0,
};

const contentSectionStyle: React.CSSProperties = {
  padding: "20px 0",
};

const dividerStyle: React.CSSProperties = {
  borderTop: "1px solid #e4e4e7",
  margin: "16px 0",
};

const footerSectionStyle: React.CSSProperties = {
  paddingTop: "8px",
  textAlign: "center" as const,
};

const footerTextStyle: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "18px",
  color: "#71717a",
  margin: "0 0 8px 0",
};

const copyrightTextStyle: React.CSSProperties = {
  fontSize: "11px",
  color: "#a1a1aa",
  margin: 0,
};

const linkStyle: React.CSSProperties = {
  color: "#2563eb",
  textDecoration: "underline",
};
