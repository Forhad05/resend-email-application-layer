"use client";

import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Flame,
  Globe,
  ExternalLink,
} from "lucide-react";
import type { DomainDNSAuditResult } from "@/lib/email/dns";
import { runDomainAuditAction } from "./actions";

interface DeliverabilityAuditProps {
  initialAudits: DomainDNSAuditResult[];
  availableDomains: string[];
}

export function DeliverabilityAudit({
  initialAudits,
  availableDomains,
}: DeliverabilityAuditProps) {
  const [audits, setAudits] = useState<Record<string, DomainDNSAuditResult>>(
    () => {
      const map: Record<string, DomainDNSAuditResult> = {};
      for (const a of initialAudits) {
        map[a.domain] = a;
      }
      return map;
    }
  );

  const defaultDomain =
    initialAudits[0]?.domain || availableDomains[0] || "mail.systemdevify.com";
  const [selectedDomain, setSelectedDomain] = useState<string>(defaultDomain);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const currentAudit = audits[selectedDomain] || initialAudits[0];

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRefresh = async () => {
    if (!selectedDomain || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await runDomainAuditAction(selectedDomain);
      if (res.success && res.result) {
        setAudits((prev) => ({
          ...prev,
          [selectedDomain]: res.result as DomainDNSAuditResult,
        }));
      }
    } catch (err) {
      console.error("Failed to refresh audit:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatAllDnsRecords = (audit: DomainDNSAuditResult) => {
    return audit.recommendedDnsRecords
      .map(
        (r) =>
          `${r.recordType.padEnd(6)} ${r.host.padEnd(25)} ${r.priority ? `(Pri: ${r.priority}) ` : ""}${r.value}`
      )
      .join("\n");
  };

  if (!currentAudit) {
    return null;
  }

  const score = currentAudit.compliance.score;
  const isCompliant = currentAudit.compliance.compliant;

  return (
    <div className="space-y-6">
      {/* Header & Domain Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-500" />
            DNS & Deliverability Hardening (Google & Yahoo 2024)
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Strict email authentication (SPF, DKIM, DMARC, MX) and staged 21-day warm-up tracking to protect domain sender reputation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {availableDomains.length > 1 && (
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="text-xs font-mono bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {availableDomains.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Auditing..." : "Re-Audit DNS"}</span>
          </button>
        </div>
      </div>

      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Deliverability Score */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Deliverability Score
            </div>
            <div className="text-2xl font-bold font-mono mt-1 flex items-baseline gap-1.5">
              <span
                className={
                  score >= 80
                    ? "text-emerald-600 dark:text-emerald-400"
                    : score >= 60
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
                }
              >
                {score}
              </span>
              <span className="text-xs text-zinc-400 font-normal">/ 100</span>
            </div>
          </div>
          <div
            className={`h-12 w-12 rounded-xl flex items-center justify-center ${
              score >= 80
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                : score >= 60
                ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                : "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
            }`}
          >
            {score >= 80 ? (
              <ShieldCheck className="h-6 w-6" />
            ) : (
              <ShieldAlert className="h-6 w-6" />
            )}
          </div>
        </div>

        {/* 2024 Google & Yahoo Policy */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              2024 Bulk Compliance
            </div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1 flex items-center gap-1.5">
              {isCompliant ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Production Ready</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>Warnings Present</span>
                </>
              )}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Target domain: <span className="font-mono text-zinc-700 dark:text-zinc-300">{currentAudit.domain}</span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 flex items-center justify-center">
            <Globe className="h-5 w-5" />
          </div>
        </div>

        {/* Warm-Up State */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              Current Warm-Up Tier
            </div>
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mt-1 flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-amber-500" />
              <span>Phase 1 (Week 1)</span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              Limit: <span className="font-semibold text-zinc-700 dark:text-zinc-300">50 emails/day</span>
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center">
            <Flame className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Core Authentication Records (SPF, DKIM, DMARC, MX) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
            Authentication Pillar Verification
          </h3>
          {currentAudit.recommendedDnsRecords.length > 0 && (
            <button
              type="button"
              onClick={() =>
                handleCopy(formatAllDnsRecords(currentAudit), "all-dns")
              }
              className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {copiedKey === "all-dns" ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Copied All Fixes!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Fix Snippets</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentAudit.checks.map((check) => {
            const isPass = check.status === "pass";
            const isWarn = check.status === "warn";

            return (
              <div
                key={check.type}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs bg-zinc-100 dark:bg-zinc-800 font-mono">
                        {check.type}
                      </span>
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isPass
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : isWarn
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                      }`}
                    >
                      {isPass ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : isWarn ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      {check.status.toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
                    {check.message}
                  </p>

                  <div className="mt-2.5 space-y-1.5 text-[11px] font-mono">
                    <div className="text-zinc-500 truncate">
                      <span className="text-zinc-400 font-sans">Found: </span>
                      {check.found || "(None detected)"}
                    </div>
                  </div>
                </div>

                {check.recommendation && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-200 flex items-start justify-between gap-2">
                    <div>
                      <strong className="font-semibold">Recommended Fix: </strong>
                      {check.recommendation}
                    </div>
                    {check.dnsEntry && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(check.dnsEntry!.value, `copy-${check.type}`)
                        }
                        className="shrink-0 text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 p-1"
                        title="Copy record value"
                      >
                        {copiedKey === `copy-${check.type}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 21-Day Staged Warm-Up Roadmap */}
      <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-500" />
              21-Day Deliverability Warm-Up Schedule
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Prevent domain spam-filter penalties by gradually ramping outbound transactional volume over 3 weeks.
            </p>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            Bounce limit: &lt; 0.1%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {currentAudit.warmupSchedule.map((tier) => {
            const isCurrent = tier.status === "current";
            return (
              <div
                key={tier.phase}
                className={`p-3.5 rounded-xl border transition-all ${
                  isCurrent
                    ? "border-amber-400 dark:border-amber-500/80 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs"
                    : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {tier.dayRange}
                  </span>
                  {isCurrent && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500 text-white">
                      Active
                    </span>
                  )}
                </div>

                <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
                  {tier.maxDailyVolume.toLocaleString()}
                  <span className="text-xs font-normal text-zinc-500 ml-1">
                    emails/day
                  </span>
                </div>

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                  {tier.targetAudience}
                </p>
              </div>
            );
          })}
        </div>

        <div className="text-xs text-zinc-500 flex items-center gap-1.5 pt-1">
          <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
          <span>
            Check Google Postmaster Tools and Yahoo Sender Hub regularly to verify spam complaint rates stay strictly below 0.1%.
          </span>
        </div>
      </div>
    </div>
  );
}
