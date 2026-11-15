"use client";

import { useState, useTransition, useMemo, useEffect, useRef } from "react";
import { SuppressionItem, SuppressionSummary } from "@/lib/email/suppression";
import {
  removeSuppressionAction,
  addSuppressionAction,
} from "@/lib/email/suppression";
import {
  ShieldAlert,
  Search,
  Filter,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  RefreshCw,
  UserX,
} from "lucide-react";

interface SuppressionManagerProps {
  initialSuppressions: SuppressionItem[];
  summary: SuppressionSummary;
}

export function SuppressionManager({
  initialSuppressions,
  summary,
}: SuppressionManagerProps) {
  const [items, setItems] = useState<SuppressionItem[]>(initialSuppressions);
  const [prevInitial, setPrevInitial] = useState(initialSuppressions);

  // Synchronize state with incoming server revalidations
  if (prevInitial !== initialSuppressions) {
    setPrevInitial(initialSuppressions);
    setItems(initialSuppressions);
  }

  const [searchTerm, setSearchTerm] = useState("");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addReason, setAddReason] = useState("manual");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  const alertTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-dismiss cleanup & Escape key listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && showAddModal) {
        setShowAddModal(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, [showAddModal]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (reasonFilter !== "all") {
        if (reasonFilter === "hard_bounce" && !item.reason.includes("bounce"))
          return false;
        if (reasonFilter === "complaint" && item.reason !== "complaint")
          return false;
        if (reasonFilter === "unsubscribe" && item.reason !== "unsubscribe")
          return false;
        if (reasonFilter === "manual" && item.reason !== "manual")
          return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          item.email.toLowerCase().includes(q) ||
          (item.source || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, reasonFilter, searchTerm]);

  const handleRemoveSuppression = (email: string) => {
    if (!confirm(`Are you sure you want to unsuppress "${email}"? This will allow new emails and replies to be dispatched to this recipient.`)) {
      return;
    }

    setRemovingEmail(email);
    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      const res = await removeSuppressionAction(email);
      setRemovingEmail(null);

      if (res.success) {
        setActionSuccess(`Successfully unsuppressed "${email}". Outbound messaging restored.`);
        if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
        alertTimerRef.current = setTimeout(() => setActionSuccess(null), 4000);
        setItems((prev) => prev.filter((i) => i.email !== email));
      } else {
        setActionError(res.error || "Failed to remove suppression.");
      }
    });
  };

  const handleAddSuppression = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail.trim() || !addEmail.includes("@")) {
      setActionError("Please provide a valid email address to suppress.");
      return;
    }

    setActionError(null);
    setActionSuccess(null);

    startTransition(async () => {
      const res = await addSuppressionAction(addEmail.trim(), addReason);
      if (res.success) {
        setActionSuccess(`Suppression added for "${addEmail.trim()}". Outbound sends blocked.`);
        if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
        alertTimerRef.current = setTimeout(() => setActionSuccess(null), 4000);
        setItems((prev) => [
          {
            id: crypto.randomUUID(),
            email: addEmail.trim().toLowerCase(),
            reason: addReason,
            source: "manual_dashboard_add",
            createdAt: new Date(),
          },
          ...prev.filter((i) => i.email !== addEmail.trim().toLowerCase()),
        ]);
        setAddEmail("");
        setShowAddModal(false);
      } else {
        setActionError(res.error || "Failed to add suppression.");
      }
    });
  };

  const getReasonBadge = (reason: string) => {
    if (reason.includes("bounce")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
          Hard Bounce
        </span>
      );
    }
    if (reason === "complaint") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          Spam Complaint
        </span>
      );
    }
    if (reason === "unsubscribe") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          Unsubscribe
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
        Manual Block
      </span>
    );
  };

  return (
    <div id="suppressions" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            Suppression List & Deliverability Guard
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Recipients on this list are blocked from outbound message dispatch and thread replies to prevent domain blacklisting.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-3.5 py-2 text-xs font-medium rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Suppression</span>
        </button>
      </div>

      {/* Feedback Messages */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-zinc-400 hover:text-zinc-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <div className="text-xs text-zinc-500 font-medium">Total Suppressed</div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">
            {summary.total}
          </div>
        </div>
        <div className="p-3 rounded-xl border border-red-200/60 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10 shadow-2xs">
          <div className="text-xs text-red-700 dark:text-red-400 font-medium">Hard Bounces</div>
          <div className="text-xl font-bold text-red-700 dark:text-red-400 mt-1">
            {summary.hardBounces}
          </div>
        </div>
        <div className="p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/20 dark:bg-amber-950/10 shadow-2xs">
          <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">Spam Complaints</div>
          <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1">
            {summary.complaints}
          </div>
        </div>
        <div className="p-3 rounded-xl border border-purple-200/60 dark:border-purple-900/40 bg-purple-50/20 dark:bg-purple-950/10 shadow-2xs">
          <div className="text-xs text-purple-700 dark:text-purple-400 font-medium">Manual / Other</div>
          <div className="text-xl font-bold text-purple-700 dark:text-purple-400 mt-1">
            {summary.manual + summary.unsubscribes}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search suppressed emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-zinc-400" />
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none"
          >
            <option value="all">All Reasons</option>
            <option value="hard_bounce">Hard Bounces</option>
            <option value="complaint">Spam Complaints</option>
            <option value="unsubscribe">Unsubscribes</option>
            <option value="manual">Manual Blocks</option>
          </select>
        </div>
      </div>

      {/* Suppressions Table */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 overflow-hidden shadow-2xs">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            No suppressed email addresses found. All recipient addresses are eligible for outbound dispatch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 text-zinc-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4">Recipient Email</th>
                  <th className="py-2.5 px-4">Reason</th>
                  <th className="py-2.5 px-4">Source</th>
                  <th className="py-2.5 px-4">Date Added</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {item.email}
                    </td>
                    <td className="py-2.5 px-4">{getReasonBadge(item.reason)}</td>
                    <td className="py-2.5 px-4 text-zinc-500 font-mono text-[11px] truncate max-w-[180px]">
                      {item.source || "System"}
                    </td>
                    <td className="py-2.5 px-4 text-zinc-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleRemoveSuppression(item.email)}
                        disabled={isPending && removingEmail === item.email}
                        className="px-2.5 py-1 text-xs rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition inline-flex items-center gap-1 font-medium disabled:opacity-50"
                        title="Unsuppress email and allow replies/outbound sends"
                      >
                        {isPending && removingEmail === item.email ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        Unsuppress
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Suppression Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddModal(false);
          }}
        >
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-red-500" />
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                  Add Suppressed Recipient
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSuppression} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Recipient Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. user@example.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Suppression Reason
                </label>
                <select
                  value={addReason}
                  onChange={(e) => setAddReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="manual">Manual Administrative Block</option>
                  <option value="hard_bounce">Hard Bounce (Invalid Mailbox)</option>
                  <option value="complaint">Spam Complaint</option>
                  <option value="unsubscribe">Unsubscribe Request</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 space-y-1">
                <p>• Outbound sends and thread replies to this address will be immediately blocked.</p>
                <p>• You can unsuppress this email at any time from this table.</p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Add Suppression
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
