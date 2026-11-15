#!/usr/bin/env tsx
/**
 * ==============================================================================
 * Production Deliverability & DNS Hardening Audit Tool
 * ==============================================================================
 * Verifies SPF, DKIM, DMARC, and MX records against Google & Yahoo 2024
 * bulk-sender deliverability guidelines and calculates the 21-day warm-up schedule.
 *
 * Usage:
 *   npm run verify:dns
 *   npm run verify:dns -- --domain=mail.yourdomain.com
 *   npm run verify:dns -- --mock
 *   npm run verify:dns -- --json
 * ==============================================================================
 */

import { loadEnv } from "./test-utils";
loadEnv();

import { auditDomainDeliverability, DomainDNSAuditResult } from "../lib/email/dns";
import { resend } from "../lib/resend";

function parseArgs() {
  const args = process.argv.slice(2);
  let domain: string | null = null;
  let mock = false;
  let json = false;
  let all = false;

  for (const arg of args) {
    if (arg.startsWith("--domain=")) {
      domain = arg.split("=")[1];
    } else if (arg === "--mock") {
      mock = true;
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--all") {
      all = true;
    }
  }

  return { domain, mock, json, all };
}

function getSenderDomainFromEnv(): string {
  const from = process.env.EMAIL_FROM || "";
  const match = from.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (match) return match[1];
  return "mail.systemdevify.com";
}

function printHeader(title: string) {
  console.log("\n" + "=".repeat(78));
  console.log(`  ${title}`);
  console.log("=".repeat(78));
}

function printAuditReport(audit: DomainDNSAuditResult) {
  console.log(`\n🌐 DOMAIN TARGET:  ${audit.domain} (Root: ${audit.orgDomain})`);
  console.log(`🕒 CHECKED AT:     ${audit.checkedAt}`);
  if (audit.resendStatus) {
    const statusColor = audit.resendStatus === "verified" ? "\x1b[32m" : "\x1b[33m";
    console.log(`📬 RESEND STATUS:  ${statusColor}${audit.resendStatus.toUpperCase()}\x1b[0m`);
  }
  console.log("-".repeat(78));

  // 1. Records Table
  console.log("\n📋 CORE AUTHENTICATION RECORDS (RFC 7208 / 6376 / 7489 / 5321):");
  for (const check of audit.checks) {
    const icon =
      check.status === "pass"
        ? "\x1b[32m✔ PASS\x1b[0m"
        : check.status === "warn"
        ? "\x1b[33m▲ WARN\x1b[0m"
        : "\x1b[31m✖ FAIL\x1b[0m";

    console.log(`\n  [${check.type.padEnd(5)}]  ${icon} - ${check.message}`);
    console.log(`          Expected: ${check.expected}`);
    if (check.found) {
      console.log(`          Found:    ${check.found}`);
    } else {
      console.log(`          Found:    (None / Unresolved)`);
    }
    if (check.recommendation) {
      console.log(`          \x1b[36mFix:      ${check.recommendation}\x1b[0m`);
    }
  }

  // 2. Google & Yahoo 2024 Deliverability Checklist
  console.log("\n" + "-".repeat(78));
  console.log("🛡️  GOOGLE & YAHOO 2024 BULK-SENDER COMPLIANCE CHECKLIST:");
  const cl = audit.compliance.checklist;
  console.log(`  • SPF Authorized:               ${cl.spfConfigured ? "✔ Yes" : "✖ No"}`);
  console.log(`  • DKIM 2048-bit Signed:         ${cl.dkimConfigured ? "✔ Yes" : "✖ No"}`);
  console.log(`  • DMARC Policy Defined:         ${cl.dmarcConfigured ? "✔ Yes" : "✖ No"}`);
  console.log(`  • DMARC Enforced (Quar/Reject): ${cl.dmarcEnforced ? "✔ Yes (Strict)" : "▲ No (Monitoring p=none)"}`);
  console.log(`  • Inbound MX Exchanger Active:  ${cl.validMx ? "✔ Yes" : "✖ No"}`);
  console.log(`  • DMARC Reporting (rua) Target: ${cl.hasReportEmail ? "✔ Yes" : "▲ Missing"}`);

  const scoreColor =
    audit.compliance.score >= 80 ? "\x1b[32m" : audit.compliance.score >= 60 ? "\x1b[33m" : "\x1b[31m";
  console.log(`\n  ⭐ DELIVERABILITY HEALTH SCORE: ${scoreColor}${audit.compliance.score} / 100\x1b[0m`);
  if (audit.compliance.compliant) {
    console.log("  \x1b[32m✔ DOMAIN MEETS 2024 PRODUCTION DELIVERABILITY REQUIREMENTS\x1b[0m");
  } else {
    console.log("  \x1b[33m▲ DOMAIN HAS WARNINGS — APPLY RECOMMENDED DNS ENTRIES BEFORE HIGH-VOLUME SENDING\x1b[0m");
  }

  // 3. Staged Warm-Up Schedule
  console.log("\n" + "-".repeat(78));
  console.log("📈 21-DAY STAGED DELIVERABILITY WARM-UP SCHEDULE:");
  for (const tier of audit.warmupSchedule) {
    const marker = tier.status === "current" ? "▶ [CURRENT]" : " ";
    console.log(`  ${marker.padEnd(12)} ${tier.phase} (${tier.dayRange})`);
    console.log(`               Max Volume:  ${tier.maxDailyVolume.toLocaleString()} emails/day`);
    console.log(`               Audience:    ${tier.targetAudience}`);
  }

  // 4. DNS Copy-Paste Snippets
  if (audit.recommendedDnsRecords.length > 0) {
    console.log("\n" + "-".repeat(78));
    console.log("🔧 RECOMMENDED DNS RECORDS TO APPLY (Cloudflare / Namecheap / Route53):");
    console.log("  Type   Host/Name                   Value / Target");
    console.log("  --------------------------------------------------------------------------");
    for (const rec of audit.recommendedDnsRecords) {
      const prio = rec.priority ? `(Pri: ${rec.priority}) ` : "";
      console.log(`  ${rec.recordType.padEnd(6)} ${rec.host.padEnd(27)} ${prio}${rec.value}`);
    }
  }
  console.log("\n" + "=".repeat(78) + "\n");
}

async function run() {
  const { domain: cliDomain, mock, json, all } = parseArgs();

  if (json) {
    const targetDomain = cliDomain || getSenderDomainFromEnv();
    const result = await auditDomainDeliverability(targetDomain, { mock });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printHeader("PRODUCTION DELIVERABILITY & DNS AUDIT (Google & Yahoo 2024)");

  if (mock) {
    console.log("🧪 RUNNING IN MOCK / TEST FIXTURE MODE\n");
    const target = cliDomain || "mail.systemdevify.com";
    const result = await auditDomainDeliverability(target, { mock: true });
    printAuditReport(result);
    return;
  }

  // If --all specified, query all domains from Resend
  if (all) {
    try {
      const res = await resend.domains.list();
      const domains = res.data?.data || [];
      if (domains.length === 0) {
        console.log("No domains found in Resend account. Auditing default domain...");
        const target = getSenderDomainFromEnv();
        const result = await auditDomainDeliverability(target);
        printAuditReport(result);
      } else {
        console.log(`Discovered ${domains.length} domain(s) in Resend Console:`);
        for (const d of domains) {
          const result = await auditDomainDeliverability(d.name);
          printAuditReport(result);
        }
      }
    } catch {
      console.log("Could not fetch domain list from Resend. Auditing default domain...");
      const target = getSenderDomainFromEnv();
      const result = await auditDomainDeliverability(target);
      printAuditReport(result);
    }
    return;
  }

  const targetDomain = cliDomain || getSenderDomainFromEnv();
  try {
    const result = await auditDomainDeliverability(targetDomain);
    printAuditReport(result);
  } catch (err) {
    console.error(`\x1b[31mAudit failed for ${targetDomain}:\x1b[0m`, err);
    console.log("\n💡 Tip: If running inside a sandboxed environment without external DNS access, use --mock:");
    console.log("   npm run verify:dns -- --mock");
  }
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
