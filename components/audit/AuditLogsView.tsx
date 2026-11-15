"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Send,
  FileText,
  Activity,
  ArrowRight,
  Code2,
  X,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { WebhookEvent } from "@/lib/db/schema";
import { WebhookDlqView } from "./WebhookDlqView";

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  details: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  userAvatar?: string | null;
}

interface AuditLogsViewProps {
  initialLogs: AuditLogItem[];
  webhookEvents?: WebhookEvent[];
  webhookStats?: {
    total: number;
    processed: number;
    failed: number;
    deadLetter: number;
  };
}

export function AuditLogsView({
  initialLogs,
  webhookEvents = [],
  webhookStats = { total: 0, processed: 0, failed: 0, deadLetter: 0 },
}: AuditLogsViewProps) {
  const [activeTab, setActiveTab] = useState<"audit" | "dlq">("audit");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedActionFilter, setSelectedActionFilter] = useState("all");
  const [selectedEntityFilter, setSelectedEntityFilter] = useState("all");
  const [inspectingLog, setInspectingLog] = useState<AuditLogItem | null>(null);

  // Statistics
  const stats = useMemo(() => {
    let statusChanges = 0;
    let assignments = 0;
    let templateEdits = 0;
    let replies = 0;

    for (const log of initialLogs) {
      if (log.action.includes("status")) statusChanges++;
      else if (log.action.includes("assign")) assignments++;
      else if (log.action.includes("template")) templateEdits++;
      else if (log.action.includes("reply")) replies++;
    }

    return {
      total: initialLogs.length,
      statusChanges,
      assignments,
      templateEdits,
      replies,
    };
  }, [initialLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      // Filter by Action
      if (selectedActionFilter !== "all") {
        if (selectedActionFilter === "status" && !log.action.includes("status"))
          return false;
        if (selectedActionFilter === "priority" && !log.action.includes("priority"))
          return false;
        if (selectedActionFilter === "assign" && !log.action.includes("assign"))
          return false;
        if (selectedActionFilter === "reply" && !log.action.includes("reply"))
          return false;
        if (selectedActionFilter === "note" && !log.action.includes("note"))
          return false;
        if (selectedActionFilter === "template" && !log.action.includes("template"))
          return false;
        if (selectedActionFilter === "suppression" && !log.action.includes("suppression"))
          return false;
      }

      // Filter by Entity
      if (selectedEntityFilter !== "all" && log.entityType !== selectedEntityFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const actorNameMatch = log.actorName?.toLowerCase().includes(term);
        const actorEmailMatch = log.actorEmail?.toLowerCase().includes(term);
        const entityIdMatch = log.entityId.toLowerCase().includes(term);
        const actionMatch = log.action.toLowerCase().includes(term);
        if (
          !actorNameMatch &&
          !actorEmailMatch &&
          !entityIdMatch &&
          !actionMatch
        ) {
          return false;
        }
      }

      return true;
    });
  }, [initialLogs, selectedActionFilter, selectedEntityFilter, searchTerm]);

  const getActionBadge = (action: string) => {
    if (action.includes("status")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" />
          Status
        </span>
      );
    }
    if (action.includes("priority")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
          <AlertCircle className="h-3 w-3" />
          Priority
        </span>
      );
    }
    if (action.includes("assign")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300">
          <UserCheck className="h-3 w-3" />
          Assignee
        </span>
      );
    }
    if (action.includes("reply")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300">
          <Send className="h-3 w-3" />
          Reply
        </span>
      );
    }
    if (action.includes("note")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-950/70 dark:text-yellow-300">
          <FileText className="h-3 w-3" />
          Note
        </span>
      );
    }
    if (action.includes("template")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-300">
          <Code2 className="h-3 w-3" />
          Template
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
        <Activity className="h-3 w-3" />
        {action}
      </span>
    );
  };

  const renderReadableDetails = (log: AuditLogItem) => {
    const d = (log.details as Record<string, unknown>) || {};
    if (log.action === "thread.status_updated") {
      return (
        <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <span className="capitalize">{String(d.previousStatus || "unknown")}</span>
          <ArrowRight className="h-3 w-3 text-zinc-400" />
          <span className="font-semibold capitalize text-zinc-900 dark:text-zinc-100">
            {String(d.newStatus || "unknown")}
          </span>
        </div>
      );
    }
    if (log.action === "thread.priority_updated") {
      return (
        <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <span className="capitalize">{String(d.previousPriority || "normal")}</span>
          <ArrowRight className="h-3 w-3 text-zinc-400" />
          <span className="font-semibold capitalize text-zinc-900 dark:text-zinc-100">
            {String(d.newPriority || "normal")}
          </span>
        </div>
      );
    }
    if (log.action === "thread.assigned") {
      return (
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {d.newAssigneeId ? "Assigned to team member" : "Unassigned"}
        </div>
      );
    }
    if (log.action === "thread.reply_sent") {
      return (
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          To: {String(d.recipient || "customer")}
          {Boolean(d.hasAttachments) && " (with attachments)"}
        </div>
      );
    }
    if (log.action === "thread.note_added") {
      return (
        <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate max-w-xs">
          &quot;{String(d.preview || "...")}&quot;
        </div>
      );
    }
    if (log.action.startsWith("template.")) {
      return (
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          Template: <span className="font-medium">{String(d.name || d.slug || log.entityId)}</span>
        </div>
      );
    }
    return (
      <div className="text-xs text-zinc-500 font-mono truncate max-w-xs">
        {JSON.stringify(d).slice(0, 45)}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Audit Logging & Activity Trail
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            System-wide activity ledger recording mutations, ticket workflow transitions, and team actions.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === "audit"
              ? "border-black dark:border-white text-zinc-900 dark:text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-indigo-500" />
          <span>Activity Audit Trail</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {initialLogs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("dlq")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 flex items-center gap-2 transition ${
            activeTab === "dlq"
              ? "border-black dark:border-white text-zinc-900 dark:text-zinc-100"
              : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          <RotateCcw className="h-4 w-4 text-amber-500" />
          <span>Webhook Events & DLQ</span>
          {webhookStats.failed + webhookStats.deadLetter > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-300">
              {webhookStats.failed + webhookStats.deadLetter} DLQ
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {webhookStats.total}
            </span>
          )}
        </button>
      </div>

      {activeTab === "dlq" ? (
        <WebhookDlqView initialEvents={webhookEvents} stats={webhookStats} />
      ) : (
        <>
          {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <div className="text-xs text-zinc-500 font-medium">Total Events</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {stats.total}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            Status Changes
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {stats.statusChanges}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
            Reassignments
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {stats.assignments}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
            Replies Sent
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {stats.replies}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            Template Updates
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {stats.templateEdits}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by actor name, email, action, or entity ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Filter className="h-3.5 w-3.5" />
            <span>Action:</span>
          </div>
          <select
            value={selectedActionFilter}
            onChange={(e) => setSelectedActionFilter(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Actions</option>
            <option value="status">Status Changes</option>
            <option value="priority">Priority Changes</option>
            <option value="assign">Assignments</option>
            <option value="reply">Replies Sent</option>
            <option value="note">Internal Notes</option>
            <option value="template">Templates</option>
            <option value="suppression">Suppressions</option>
          </select>

          <select
            value={selectedEntityFilter}
            onChange={(e) => setSelectedEntityFilter(e.target.value)}
            className="text-xs px-2.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Entities</option>
            <option value="thread">Threads</option>
            <option value="template">Templates</option>
            <option value="suppression">Suppressions</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
              <tr>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
                <th className="py-3 px-4 font-semibold">Actor</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Entity</th>
                <th className="py-3 px-4 font-semibold">Activity Summary</th>
                <th className="py-3 px-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
                    <p className="font-medium text-zinc-700 dark:text-zinc-300">
                      No audit events found
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {searchTerm || selectedActionFilter !== "all"
                        ? "Try adjusting your filters or search terms."
                        : "Perform ticket status changes or team actions to see them tracked in real time."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isThread = log.entityType === "thread";
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-xs text-zinc-500 whitespace-nowrap font-mono">
                        {new Date(log.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black flex items-center justify-center font-bold text-[10px]">
                            {log.actorName
                              ? log.actorName.charAt(0).toUpperCase()
                              : "S"}
                          </div>
                          <div>
                            <div className="font-medium text-xs text-zinc-900 dark:text-zinc-100">
                              {log.actorName || "System"}
                            </div>
                            {log.actorEmail && (
                              <div className="text-[11px] text-zinc-400">
                                {log.actorEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        {isThread ? (
                          <Link
                            href={`/inbox/${log.entityId}`}
                            className="inline-flex items-center gap-1 font-mono text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            <span>thread:{log.entityId.slice(0, 8)}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : (
                          <span className="font-mono text-zinc-500">
                            {log.entityType}:{log.entityId.slice(0, 8)}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {renderReadableDetails(log)}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setInspectingLog(log)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <Code2 className="h-3 w-3" />
                          <span>Payload</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Payload Inspection Modal */}
      {inspectingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-indigo-500" />
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                  Audit Event Payload ({inspectingLog.action})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingLog(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto font-mono text-xs">
              <div className="grid grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div><strong>Log ID:</strong> {inspectingLog.id}</div>
                <div><strong>Entity Type:</strong> {inspectingLog.entityType}</div>
                <div><strong>Actor:</strong> {inspectingLog.actorName || "System"} ({inspectingLog.actorEmail || "n/a"})</div>
                <div><strong>Entity ID:</strong> {inspectingLog.entityId}</div>
                <div><strong>IP Address:</strong> {inspectingLog.ipAddress || "Internal"}</div>
                <div><strong>Timestamp:</strong> {new Date(inspectingLog.createdAt).toISOString()}</div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">
                  Structured Details JSON
                </div>
                <pre className="p-3 rounded-lg bg-zinc-950 text-zinc-200 overflow-x-auto text-[11px] leading-relaxed border border-zinc-800">
                  {JSON.stringify(inspectingLog.details, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectingLog(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
