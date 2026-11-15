"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { WebhookEvent } from "@/lib/db/schema";
import { replayWebhookEventAction } from "@/lib/webhook/queue";
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Code2,
  Search,
  Filter,
  X,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";

interface WebhookDlqViewProps {
  initialEvents: WebhookEvent[];
  stats: {
    total: number;
    processed: number;
    failed: number;
    deadLetter: number;
  };
}

export function WebhookDlqView({ initialEvents, stats }: WebhookDlqViewProps) {
  const [events, setEvents] = useState<WebhookEvent[]>(initialEvents);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [inspectingEvent, setInspectingEvent] = useState<WebhookEvent | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard accessibility: Escape to dismiss inspector modal + timer cleanup
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && inspectingEvent) {
        setInspectingEvent(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, [inspectingEvent]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (statusFilter !== "all" && ev.status !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchType = ev.eventType.toLowerCase().includes(q);
        const matchSvix = (ev.svixId || "").toLowerCase().includes(q);
        const matchError = (ev.lastError || "").toLowerCase().includes(q);
        return matchType || matchSvix || matchError;
      }
      return true;
    });
  }, [events, statusFilter, searchTerm]);

  const handleReplay = (eventId: string) => {
    setReplayingId(eventId);
    setActionFeedback(null);

    startTransition(async () => {
      const res = await replayWebhookEventAction(eventId);
      setReplayingId(null);

      if (res.success) {
        setActionFeedback({
          type: "success",
          message: `Webhook event [${eventId.slice(0, 8)}] replayed and processed successfully!`,
        });
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  status: "processed",
                  lastError: null,
                  processedAt: new Date(),
                }
              : e
          )
        );
      } else {
        setActionFeedback({
          type: "error",
          message: `Replay failed: ${res.error || "Unknown error during event dispatch"}`,
        });
        setEvents((prev) =>
          prev.map((e) =>
            e.id === eventId
              ? {
                  ...e,
                  retryCount: e.retryCount + 1,
                  lastError: res.error || e.lastError,
                }
              : e
          )
        );
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "processed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Processed
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            Failed (Retrying)
          </span>
        );
      case "dead_letter":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300">
            <XCircle className="h-3 w-3" />
            Dead Letter
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in duration-200 ${
            actionFeedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
              : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
          <p className="text-xs font-medium text-zinc-500">Total Ingested</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {stats.total}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-xs">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Processed Cleanly
          </p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {stats.processed}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 shadow-xs">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
            Failed (In Retry)
          </p>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            {stats.failed}
          </p>
        </div>
        <div className="p-4 rounded-xl border border-red-200/60 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10 shadow-xs">
          <p className="text-xs font-medium text-red-700 dark:text-red-400">
            Dead Letter Queue
          </p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400 mt-1">
            {stats.deadLetter}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by event type, Svix ID, or error reason..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="dead_letter">Dead Letter Only</option>
            <option value="failed">Failed (Retrying)</option>
            <option value="pending">Pending</option>
            <option value="processed">Processed</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center text-sm text-zinc-500">
            No webhook events found matching your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Retries</th>
                  <th className="py-3 px-4">Last Error / Details</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {filteredEvents.map((ev) => (
                  <tr
                    key={ev.id}
                    className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {ev.eventType}
                      {ev.svixId && (
                        <span className="block font-normal text-[10px] text-zinc-400 mt-0.5 truncate max-w-[140px]">
                          {ev.svixId}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(ev.status)}</td>
                    <td className="py-3 px-4 text-xs text-zinc-600 dark:text-zinc-400 font-mono">
                      {ev.retryCount} / {ev.maxRetries}
                    </td>
                    <td className="py-3 px-4 text-xs max-w-[260px]">
                      {ev.lastError ? (
                        <span className="text-red-600 dark:text-red-400 truncate block font-mono text-[11px]" title={ev.lastError}>
                          {ev.lastError}
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-[11px]">
                          Processed cleanly
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-500 whitespace-nowrap">
                      {new Date(ev.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setInspectingEvent(ev)}
                        className="px-2.5 py-1 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition inline-flex items-center gap-1"
                        title="Inspect Raw JSON Payload"
                      >
                        <Code2 className="h-3 w-3" />
                        JSON
                      </button>

                      {(ev.status === "failed" || ev.status === "dead_letter") && (
                        <button
                          type="button"
                          onClick={() => handleReplay(ev.id)}
                          disabled={isPending && replayingId === ev.id}
                          className="px-2.5 py-1 text-xs rounded-lg bg-black text-white dark:bg-white dark:text-black font-medium hover:opacity-90 disabled:opacity-50 transition inline-flex items-center gap-1"
                        >
                          {isPending && replayingId === ev.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                          Replay
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Inspector Modal */}
      {inspectingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-indigo-500" />
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                  Webhook Event Payload ({inspectingEvent.eventType})
                </h3>
              </div>
              <button
                onClick={() => setInspectingEvent(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto font-mono text-xs bg-zinc-950 text-zinc-200 selection:bg-indigo-600 selection:text-white">
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(inspectingEvent.payload, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
              <span className="text-xs text-zinc-400">
                ID: {inspectingEvent.id}
              </span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(JSON.stringify(inspectingEvent.payload, null, 2))
                }
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy JSON
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
