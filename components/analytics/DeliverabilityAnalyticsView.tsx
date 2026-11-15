"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { DeliverabilityMetricsResult } from "@/lib/email/analytics";
import {
  Send,
  CheckCircle2,
  Eye,
  MousePointerClick,
  AlertTriangle,
  ShieldAlert,
  Globe,
  Search,
  ChevronRight,
} from "lucide-react";

interface DeliverabilityAnalyticsViewProps {
  initialData: DeliverabilityMetricsResult;
}

export function DeliverabilityAnalyticsView({
  initialData,
}: DeliverabilityAnalyticsViewProps) {
  const { stats, bounceTaxonomy, domains } = initialData;
  const [domainSearch, setDomainSearch] = useState("");

  const filteredDomains = useMemo(() => {
    if (!domainSearch.trim()) return domains;
    return domains.filter((d) =>
      d.domain.toLowerCase().includes(domainSearch.trim().toLowerCase())
    );
  }, [domains, domainSearch]);

  const getDomainHealthBadge = (health: "optimal" | "warning" | "critical") => {
    switch (health) {
      case "optimal":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Optimal (&lt;1%)
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            Warning (1-3%)
          </span>
        );
      case "critical":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
            <AlertTriangle className="h-3 w-3" />
            Critical (&gt;3%)
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Outbound Volume */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-500">
            <span>Total Sent</span>
            <Send className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
            {stats.totalOutbound}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Outbound messages</p>
        </div>

        {/* Delivered Rate */}
        <div className="p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <span>Delivered</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-2">
            {stats.deliveredRate}%
          </div>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70 mt-1">
            {stats.deliveredCount} delivered
          </p>
        </div>

        {/* Open Rate */}
        <div className="p-4 rounded-xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-blue-700 dark:text-blue-400">
            <span>Open Rate</span>
            <Eye className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-2">
            {stats.openRate}%
          </div>
          <p className="text-[11px] text-blue-600/80 dark:text-blue-400/70 mt-1">
            {stats.openedCount} opened
          </p>
        </div>

        {/* Click Rate */}
        <div className="p-4 rounded-xl border border-purple-200/60 dark:border-purple-900/40 bg-purple-50/20 dark:bg-purple-950/10 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-purple-700 dark:text-purple-400">
            <span>Click Rate</span>
            <MousePointerClick className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-2">
            {stats.clickRate}%
          </div>
          <p className="text-[11px] text-purple-600/80 dark:text-purple-400/70 mt-1">
            {stats.clickedCount} clicks tracked
          </p>
        </div>

        {/* Bounce Rate */}
        <div className="p-4 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-amber-700 dark:text-amber-400">
            <span>Bounce Rate</span>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-2">
            {stats.bounceRate}%
          </div>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/70 mt-1">
            {stats.bouncedCount} bounced
          </p>
        </div>

        {/* Suppressed Recipients */}
        <div className="p-4 rounded-xl border border-red-200/60 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10 shadow-xs">
          <div className="flex items-center justify-between text-xs font-medium text-red-700 dark:text-red-400">
            <span>Suppressed</span>
            <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-700 dark:text-red-400 mt-2">
            {stats.suppressedCount}
          </div>
          <p className="text-[11px] text-red-600/80 dark:text-red-400/70 mt-1">
            Hard blocks active
          </p>
        </div>
      </div>

      {/* Bounce Taxonomy & Classification Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Bounce Taxonomy
              </h2>
              <span className="text-xs font-medium text-zinc-500">
                Total: {bounceTaxonomy.total}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mb-6">
              Classification of delivery failures and blocks recorded by Resend webhooks and manual enforcement.
            </p>

            <div className="space-y-4">
              {/* Hard Bounces */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-zinc-700 dark:text-zinc-300">Hard Bounces (Invalid Mailbox)</span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {bounceTaxonomy.hardBounce}
                  </span>
                </div>
                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{
                      width: `${
                        bounceTaxonomy.total > 0
                          ? (bounceTaxonomy.hardBounce / bounceTaxonomy.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Spam Complaints */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-zinc-700 dark:text-zinc-300">Spam Complaints</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {bounceTaxonomy.complaint}
                  </span>
                </div>
                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${
                        bounceTaxonomy.total > 0
                          ? (bounceTaxonomy.complaint / bounceTaxonomy.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Unsubscribes */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-zinc-700 dark:text-zinc-300">Unsubscribes</span>
                  <span className="font-bold text-zinc-600 dark:text-zinc-400">
                    {bounceTaxonomy.unsubscribe}
                  </span>
                </div>
                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-zinc-400 dark:bg-zinc-600 rounded-full"
                    style={{
                      width: `${
                        bounceTaxonomy.total > 0
                          ? (bounceTaxonomy.unsubscribe / bounceTaxonomy.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Manual Blocks */}
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-zinc-700 dark:text-zinc-300">Manual / Administrative Blocks</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {bounceTaxonomy.manual}
                  </span>
                </div>
                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{
                      width: `${
                        bounceTaxonomy.total > 0
                          ? (bounceTaxonomy.manual / bounceTaxonomy.total) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-6">
            <Link
              href="/settings#suppressions"
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center justify-between"
            >
              <span>Manage Suppression List</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Recipient Domain Health Breakdown */}
        <div className="lg:col-span-2 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Globe className="h-4 w-4 text-indigo-500" />
                Recipient Domain Health Breakdown
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Delivery and bounce performance by major email providers.
              </p>
            </div>

            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Filter domains..."
                value={domainSearch}
                onChange={(e) => setDomainSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {filteredDomains.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
              No outbound domain activity recorded yet. Outbound emails will populate domain performance statistics automatically.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 text-zinc-500 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">Domain</th>
                    <th className="py-2.5 px-3">Sent</th>
                    <th className="py-2.5 px-3">Delivered</th>
                    <th className="py-2.5 px-3">Opened</th>
                    <th className="py-2.5 px-3">Bounce Rate</th>
                    <th className="py-2.5 px-3 text-right">Reputation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono">
                  {filteredDomains.map((d) => (
                    <tr key={d.domain} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                        {d.domain}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-600 dark:text-zinc-400">
                        {d.sent}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-600 dark:text-emerald-400">
                        {d.delivered} ({d.deliveryRate}%)
                      </td>
                      <td className="py-2.5 px-3 text-blue-600 dark:text-blue-400">
                        {d.opened}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-amber-600 dark:text-amber-400">
                        {d.bounceRate}%
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {getDomainHealthBadge(d.health)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
