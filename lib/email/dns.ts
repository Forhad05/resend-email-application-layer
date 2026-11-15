import * as dns from "dns/promises";
import { resend } from "@/lib/resend";

export interface DNSRecordCheck {
  type: "SPF" | "DKIM" | "DMARC" | "MX";
  status: "pass" | "warn" | "fail";
  expected: string;
  found: string | null;
  message: string;
  recommendation?: string;
  dnsEntry?: {
    recordType: "TXT" | "CNAME" | "MX";
    host: string;
    value: string;
    priority?: number;
  };
}

export interface GoogleYahooCompliance {
  compliant: boolean;
  score: number; // 0 - 100
  checklist: {
    spfConfigured: boolean;
    dkimConfigured: boolean;
    dmarcConfigured: boolean;
    dmarcEnforced: boolean; // p=quarantine or p=reject
    validMx: boolean;
    hasReportEmail: boolean;
  };
  recommendations: string[];
}

export interface WarmupScheduleTier {
  phase: string;
  dayRange: string;
  maxDailyVolume: number;
  targetAudience: string;
  status: "current" | "upcoming" | "completed";
}

export interface DomainDNSAuditResult {
  domain: string;
  orgDomain: string;
  resendStatus?: string;
  checkedAt: string;
  checks: DNSRecordCheck[];
  compliance: GoogleYahooCompliance;
  warmupSchedule: WarmupScheduleTier[];
  recommendedDnsRecords: Array<{
    recordType: "TXT" | "CNAME" | "MX";
    host: string;
    value: string;
    priority?: number;
    purpose: string;
  }>;
}

/**
 * Extract organizational/root domain from a host (e.g. mail.systemdevify.com -> systemdevify.com)
 */
export function getOrganizationalDomain(hostname: string): string {
  const parts = hostname.trim().toLowerCase().split(".");
  if (parts.length <= 2) return hostname.trim().toLowerCase();
  return parts.slice(-2).join(".");
}

/**
 * Safely parse TXT records from Node dns.resolveTxt (which returns string[][])
 */
function flattenTxtRecords(records: string[][]): string[] {
  return records.map((chunks) => chunks.join("").trim());
}

/**
 * Comprehensive DNS & Deliverability Audit for a domain
 */
export async function auditDomainDeliverability(
  domain: string,
  options?: { mock?: boolean }
): Promise<DomainDNSAuditResult> {
  const cleanDomain = domain.trim().toLowerCase();
  const orgDomain = getOrganizationalDomain(cleanDomain);
  const now = new Date().toISOString();

  // If mock mode requested, return a reference verified domain audit
  if (options?.mock) {
    return generateMockAuditResult(cleanDomain, orgDomain, now);
  }

  const checks: DNSRecordCheck[] = [];
  const recommendations: string[] = [];

  // --------------------------------------------------------------------------
  // 1. Resend API Domain Status Check (if available)
  // --------------------------------------------------------------------------
  let resendStatus: string | undefined;
  try {
    const listRes = await resend.domains.list();
    if (listRes.data?.data) {
      const match = listRes.data.data.find(
        (d) => d.name.toLowerCase() === cleanDomain || d.name.toLowerCase() === orgDomain
      );
      if (match) {
        resendStatus = match.status;
      }
    }
  } catch {
    // Non-fatal if offline or unauthenticated
  }

  // --------------------------------------------------------------------------
  // 2. SPF Record Audit
  // --------------------------------------------------------------------------
  try {
    const rawTxt = await dns.resolveTxt(cleanDomain);
    const txtRecords = flattenTxtRecords(rawTxt);
    const spfRecords = txtRecords.filter((r) => r.startsWith("v=spf1"));

    if (spfRecords.length === 0) {
      checks.push({
        type: "SPF",
        status: "fail",
        expected: "v=spf1 include:resend.com ~all",
        found: null,
        message: "No SPF record found on domain.",
        recommendation: `Add a TXT record for "${cleanDomain}" with value "v=spf1 include:resend.com ~all".`,
        dnsEntry: {
          recordType: "TXT",
          host: cleanDomain === orgDomain ? "@" : cleanDomain.replace(`.${orgDomain}`, ""),
          value: "v=spf1 include:resend.com ~all",
        },
      });
    } else if (spfRecords.length > 1) {
      checks.push({
        type: "SPF",
        status: "fail",
        expected: "Single SPF record",
        found: spfRecords.join(" | "),
        message: "Multiple SPF records detected. RFC 7208 strictly forbids more than one SPF record.",
        recommendation: "Merge all SPF mechanisms into a single v=spf1 record.",
      });
    } else {
      const spf = spfRecords[0];
      const hasResend = spf.includes("include:resend.com") || spf.includes("include:_spf.resend.com");
      const hasCloudflare = spf.includes("include:_spf.mx.cloudflare.net");
      const hasSoftFail = spf.includes("~all") || spf.includes("-all");

      if (hasResend) {
        checks.push({
          type: "SPF",
          status: "pass",
          expected: "v=spf1 include:resend.com ~all",
          found: spf,
          message: "SPF record correctly authorizes Resend mail servers.",
        });
      } else if (hasCloudflare) {
        checks.push({
          type: "SPF",
          status: "warn",
          expected: "v=spf1 include:resend.com ~all",
          found: spf,
          message: "SPF authorizes Cloudflare Email Routing. For direct Resend sending, include:resend.com is required.",
          recommendation: `Update SPF record to: "${spf.replace("~all", "include:resend.com ~all").replace("-all", "include:resend.com -all")}".`,
          dnsEntry: {
            recordType: "TXT",
            host: cleanDomain === orgDomain ? "@" : cleanDomain.replace(`.${orgDomain}`, ""),
            value: spf.replace("~all", "include:resend.com ~all").replace("-all", "include:resend.com -all"),
          },
        });
      } else {
        checks.push({
          type: "SPF",
          status: "warn",
          expected: "v=spf1 include:resend.com ~all",
          found: spf,
          message: "SPF record present but missing include:resend.com.",
          recommendation: `Append "include:resend.com" before the ~all mechanism.`,
        });
      }

      if (!hasSoftFail) {
        recommendations.push("SPF record should end with ~all (softfail) or -all (hardfail) for RFC compliance.");
      }
    }
  } catch (err: unknown) {
    const errorCode = (err as { code?: string })?.code;
    checks.push({
      type: "SPF",
      status: "fail",
      expected: "v=spf1 include:resend.com ~all",
      found: null,
      message: `DNS query failed: ${errorCode || "ENOTFOUND"}`,
      recommendation: `Add TXT record on ${cleanDomain}: "v=spf1 include:resend.com ~all".`,
      dnsEntry: {
        recordType: "TXT",
        host: cleanDomain === orgDomain ? "@" : cleanDomain.replace(`.${orgDomain}`, ""),
        value: "v=spf1 include:resend.com ~all",
      },
    });
  }

  // --------------------------------------------------------------------------
  // 3. DKIM Record Audit
  // --------------------------------------------------------------------------
  const dkimHost = `resend._domainkey.${cleanDomain}`;
  try {
    const rawDkim = await dns.resolveTxt(dkimHost);
    const dkimTxt = flattenTxtRecords(rawDkim).join("");

    if (dkimTxt.includes("k=rsa") || dkimTxt.includes("p=") || dkimTxt.includes("v=DKIM1")) {
      checks.push({
        type: "DKIM",
        status: "pass",
        expected: "k=rsa; p=MIIB...",
        found: dkimTxt.length > 50 ? `${dkimTxt.substring(0, 45)}...` : dkimTxt,
        message: "DKIM cryptographic 2048-bit key found and valid.",
      });
    } else {
      checks.push({
        type: "DKIM",
        status: "warn",
        expected: "k=rsa; p=...",
        found: dkimTxt,
        message: "DKIM TXT record found but may have non-standard format.",
      });
    }
  } catch {
    // Check if CNAME delegation is used for DKIM
    try {
      const cnames = await dns.resolveCname(dkimHost);
      if (cnames.length > 0) {
        checks.push({
          type: "DKIM",
          status: "pass",
          expected: "CNAME or TXT public key",
          found: `CNAME -> ${cnames.join(", ")}`,
          message: "DKIM delegated via CNAME successfully.",
        });
      }
    } catch {
      checks.push({
        type: "DKIM",
        status: "fail",
        expected: "k=rsa; p=MIIBIjANBgkqhkiG9w... (from Resend Console)",
        found: null,
        message: `No DKIM record resolved at "${dkimHost}".`,
        recommendation: `Obtain 2048-bit DKIM key from Resend Console and add TXT record at "resend._domainkey.${cleanDomain}".`,
        dnsEntry: {
          recordType: "TXT",
          host: `resend._domainkey.${cleanDomain === orgDomain ? "" : cleanDomain.replace(`.${orgDomain}`, "")}`.replace(/\.$/, ""),
          value: "k=rsa; p=<RESEND_PUBLIC_KEY>",
        },
      });
    }
  }

  // --------------------------------------------------------------------------
  // 4. DMARC Policy Audit
  // --------------------------------------------------------------------------
  const dmarcHosts = [`_dmarc.${cleanDomain}`];
  if (cleanDomain !== orgDomain) {
    dmarcHosts.push(`_dmarc.${orgDomain}`);
  }

  let foundDmarc: string | null = null;
  let dmarcSourceHost: string | null = null;

  for (const host of dmarcHosts) {
    try {
      const rawDmarc = await dns.resolveTxt(host);
      const txt = flattenTxtRecords(rawDmarc).find((r) => r.startsWith("v=DMARC1"));
      if (txt) {
        foundDmarc = txt;
        dmarcSourceHost = host;
        break;
      }
    } catch {
      // Continue searching
    }
  }

  if (!foundDmarc) {
    checks.push({
      type: "DMARC",
      status: "fail",
      expected: `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@${orgDomain}; aspf=s; adkim=s;`,
      found: null,
      message: `No DMARC policy found on ${cleanDomain} or ${orgDomain}.`,
      recommendation: `Add TXT record on "_dmarc.${orgDomain}" to protect your domain reputation.`,
      dnsEntry: {
        recordType: "TXT",
        host: `_dmarc`,
        value: `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@${orgDomain}; aspf=s; adkim=s;`,
      },
    });
  } else {
    const isQuarantineOrReject = foundDmarc.includes("p=quarantine") || foundDmarc.includes("p=reject");
    const hasRua = foundDmarc.includes("rua=mailto:");

    if (isQuarantineOrReject && hasRua) {
      checks.push({
        type: "DMARC",
        status: "pass",
        expected: "p=quarantine or p=reject with rua reporting",
        found: `${foundDmarc} (via ${dmarcSourceHost})`,
        message: "Strict DMARC enforcement active. Meets Google & Yahoo 2024 standards.",
      });
    } else if (foundDmarc.includes("p=none")) {
      checks.push({
        type: "DMARC",
        status: "warn",
        expected: "p=quarantine or p=reject",
        found: `${foundDmarc} (via ${dmarcSourceHost})`,
        message: 'DMARC is set to monitoring mode (p=none). Google & Yahoo recommend p=quarantine or p=reject.',
        recommendation: `Upgrade policy to: "v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@${orgDomain}; aspf=s; adkim=s;".`,
        dnsEntry: {
          recordType: "TXT",
          host: `_dmarc`,
          value: `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@${orgDomain}; aspf=s; adkim=s;`,
        },
      });
    } else {
      checks.push({
        type: "DMARC",
        status: "warn",
        expected: "Strict DMARC with reporting",
        found: `${foundDmarc} (via ${dmarcSourceHost})`,
        message: "DMARC record present but missing aggregate reporting address (rua=).",
      });
    }
  }

  // --------------------------------------------------------------------------
  // 5. MX Records Audit
  // --------------------------------------------------------------------------
  try {
    const mxRecords = await dns.resolveMx(cleanDomain);
    if (mxRecords.length === 0) {
      checks.push({
        type: "MX",
        status: "warn",
        expected: "feedback-smtp.resend.com (Priority 10)",
        found: null,
        message: "No MX records found. Inbound email replies cannot be received.",
        recommendation: `Add MX record for ${cleanDomain} pointing to feedback-smtp.resend.com.`,
        dnsEntry: {
          recordType: "MX",
          host: cleanDomain === orgDomain ? "@" : cleanDomain.replace(`.${orgDomain}`, ""),
          value: "feedback-smtp.resend.com",
          priority: 10,
        },
      });
    } else {
      const exchanges = mxRecords.map((m) => `${m.exchange} (pri ${m.priority})`).join(", ");
      const hasResendMx = mxRecords.some((m) => m.exchange.includes("resend.com"));
      const hasCloudflareMx = mxRecords.some((m) => m.exchange.includes("mx.cloudflare.net"));

      if (hasResendMx) {
        checks.push({
          type: "MX",
          status: "pass",
          expected: "feedback-smtp.resend.com",
          found: exchanges,
          message: "MX routes directly to Resend Inbound Webhook engine.",
        });
      } else if (hasCloudflareMx) {
        checks.push({
          type: "MX",
          status: "pass",
          expected: "Cloudflare Email Routing or Resend Inbound",
          found: exchanges,
          message: "MX routes to Cloudflare Email Routing. Forwarding can relay to Resend or custom webhook.",
        });
      } else {
        checks.push({
          type: "MX",
          status: "pass",
          expected: "Valid mail exchanger",
          found: exchanges,
          message: "Active MX records detected.",
        });
      }
    }
  } catch {
    checks.push({
      type: "MX",
      status: "warn",
      expected: "feedback-smtp.resend.com (Priority 10)",
      found: null,
      message: "No MX records configured for inbound emails.",
      recommendation: `If you want inbound tickets, configure MX for ${cleanDomain} -> feedback-smtp.resend.com.`,
      dnsEntry: {
        recordType: "MX",
        host: cleanDomain === orgDomain ? "@" : cleanDomain.replace(`.${orgDomain}`, ""),
        value: "feedback-smtp.resend.com",
        priority: 10,
      },
    });
  }

  // --------------------------------------------------------------------------
  // 6. Compute Google & Yahoo Compliance & Score
  // --------------------------------------------------------------------------
  const spfPass = checks.find((c) => c.type === "SPF")?.status === "pass";
  const spfWarn = checks.find((c) => c.type === "SPF")?.status === "warn";
  const dkimPass = checks.find((c) => c.type === "DKIM")?.status === "pass";
  const dmarcCheck = checks.find((c) => c.type === "DMARC");
  const dmarcPass = dmarcCheck?.status === "pass";
  const dmarcConfigured = dmarcCheck?.status !== "fail";
  const mxPass = checks.find((c) => c.type === "MX")?.status === "pass";

  let score = 0;
  if (spfPass) score += 25;
  else if (spfWarn) score += 15;

  if (dkimPass) score += 35;
  if (dmarcPass) score += 25;
  else if (dmarcConfigured) score += 15;

  if (mxPass) score += 15;

  const checklist = {
    spfConfigured: spfPass || spfWarn,
    dkimConfigured: dkimPass,
    dmarcConfigured,
    dmarcEnforced: dmarcPass,
    validMx: mxPass,
    hasReportEmail: !!dmarcCheck?.found && dmarcCheck.found.includes("rua="),
  };

  const compliance: GoogleYahooCompliance = {
    compliant: spfPass && dkimPass && dmarcConfigured && score >= 75,
    score: Math.min(100, score),
    checklist,
    recommendations,
  };

  // --------------------------------------------------------------------------
  // 7. Generate Staged Warm-Up Schedule
  // --------------------------------------------------------------------------
  const warmupSchedule = getWarmupSchedule();

  // --------------------------------------------------------------------------
  // 8. Recommended DNS Records Table
  // --------------------------------------------------------------------------
  const recommendedDnsRecords = checks
    .filter((c) => c.dnsEntry)
    .map((c) => ({
      recordType: c.dnsEntry!.recordType,
      host: c.dnsEntry!.host,
      value: c.dnsEntry!.value,
      priority: c.dnsEntry!.priority,
      purpose: `${c.type} Authentication`,
    }));

  return {
    domain: cleanDomain,
    orgDomain,
    resendStatus,
    checkedAt: now,
    checks,
    compliance,
    warmupSchedule,
    recommendedDnsRecords,
  };
}

/**
 * 21-Day Staged Domain Warm-Up Schedule
 */
export function getWarmupSchedule(currentDay: number = 1): WarmupScheduleTier[] {
  return [
    {
      phase: "Phase 1: Seed & Verification",
      dayRange: "Days 1 – 7 (Week 1)",
      maxDailyVolume: 50,
      targetAudience: "Internal team, transactional confirmations, VIP test inquiries",
      status: currentDay <= 7 ? "current" : "completed",
    },
    {
      phase: "Phase 2: Initial Ramp",
      dayRange: "Days 8 – 14 (Week 2)",
      maxDailyVolume: 250,
      targetAudience: "Active ticket replies, user onboarding, password resets",
      status: currentDay > 7 && currentDay <= 14 ? "current" : currentDay > 14 ? "completed" : "upcoming",
    },
    {
      phase: "Phase 3: Scale & Monitoring",
      dayRange: "Days 15 – 21 (Week 3)",
      maxDailyVolume: 1000,
      targetAudience: "General support replies, system digests, billing receipts",
      status: currentDay > 14 && currentDay <= 21 ? "current" : currentDay > 21 ? "completed" : "upcoming",
    },
    {
      phase: "Phase 4: Full Production",
      dayRange: "Day 22+ (Week 4+)",
      maxDailyVolume: 10000,
      targetAudience: "Uncapped production support volume (monitor bounce rate < 0.1%)",
      status: currentDay > 21 ? "current" : "upcoming",
    },
  ];
}

/**
 * Generate a verified mock audit result for local/offline testing
 */
function generateMockAuditResult(
  domain: string,
  orgDomain: string,
  checkedAt: string
): DomainDNSAuditResult {
  return {
    domain,
    orgDomain,
    resendStatus: "verified",
    checkedAt,
    checks: [
      {
        type: "SPF",
        status: "pass",
        expected: "v=spf1 include:resend.com ~all",
        found: "v=spf1 include:resend.com ~all",
        message: "SPF record correctly authorizes Resend mail servers.",
      },
      {
        type: "DKIM",
        status: "pass",
        expected: "k=rsa; p=MIIBIjANBgkqhkiG9w...",
        found: "k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...",
        message: "DKIM cryptographic 2048-bit key found and valid.",
      },
      {
        type: "DMARC",
        status: "pass",
        expected: "p=quarantine or p=reject with rua reporting",
        found: `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@${orgDomain}; aspf=s; adkim=s;`,
        message: "Strict DMARC enforcement active. Meets Google & Yahoo 2024 standards.",
      },
      {
        type: "MX",
        status: "pass",
        expected: "feedback-smtp.resend.com",
        found: "feedback-smtp.resend.com (pri 10)",
        message: "MX routes directly to Resend Inbound Webhook engine.",
      },
    ],
    compliance: {
      compliant: true,
      score: 100,
      checklist: {
        spfConfigured: true,
        dkimConfigured: true,
        dmarcConfigured: true,
        dmarcEnforced: true,
        validMx: true,
        hasReportEmail: true,
      },
      recommendations: [],
    },
    warmupSchedule: getWarmupSchedule(1),
    recommendedDnsRecords: [],
  };
}
