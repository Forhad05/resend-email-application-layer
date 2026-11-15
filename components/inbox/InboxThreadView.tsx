"use client";

import { useState, useMemo, useRef, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Search,
  User,
  AlertCircle,
  AlertTriangle,
  X,
  Tag,
  CornerDownLeft,
  Clock,
} from "lucide-react";
import { InboxLiveRefresher } from "./InboxLiveRefresher";
import { getLabelColorClass } from "@/lib/email/labels";
import { isInputFocused } from "@/components/shortcuts/KeyboardShortcutsProvider";
import { updateThreadStatusAction } from "@/app/(dashboard)/inbox/[threadId]/actions";
import { calculateSlaStatus } from "@/lib/email/sla-utils";

function subscribeClock(callback: () => void) {
  const timer = setInterval(callback, 60000);
  return () => clearInterval(timer);
}

function getClockSnapshot() {
  return Date.now();
}

function getServerClockSnapshot() {
  return 0;
}

export interface ThreadItem {
  id: string;
  subject: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  assigneeName?: string | null;
  contactEmail: string;
  messageCount: number;
  lastMessageAt: Date | string | null;
  isRead: boolean;
  labels?: string[] | null;
  slaDueAt?: Date | string | null;
  slaBreached?: boolean;
}

interface TeamMember {
  id: string;
  name: string;
}

interface InboxThreadViewProps {
  initialThreads: ThreadItem[];
  teamMembers: TeamMember[];
}

export function InboxThreadView({
  initialThreads,
  teamMembers,
}: InboxThreadViewProps) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [selectedLabel, setSelectedLabel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentNow = useSyncExternalStore(
    subscribeClock,
    getClockSnapshot,
    getServerClockSnapshot
  );

  // Collect all unique labels and their frequency counts
  const labelCounts = useMemo(() => {
    const countsMap = new Map<string, number>();
    for (const t of initialThreads) {
      if (t.labels) {
        for (const l of t.labels) {
          countsMap.set(l, (countsMap.get(l) || 0) + 1);
        }
      }
    }
    return countsMap;
  }, [initialThreads]);

  const uniqueLabels = useMemo(() => {
    return Array.from(labelCounts.keys()).sort();
  }, [labelCounts]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: initialThreads.length,
      open: initialThreads.filter((t) => t.status === "open").length,
      pending: initialThreads.filter((t) => t.status === "pending").length,
      resolved: initialThreads.filter((t) => t.status === "resolved").length,
      closed: initialThreads.filter((t) => t.status === "closed").length,
      breached: initialThreads.filter(
        (t) =>
          (t.status === "open" || t.status === "pending") &&
          (t.slaBreached ||
            (currentNow > 0 && t.slaDueAt ? new Date(t.slaDueAt).getTime() <= currentNow : false))
      ).length,
    };
  }, [initialThreads, currentNow]);

  // Filtered thread list
  const filteredThreads = useMemo(() => {
    return initialThreads.filter((thread) => {
      // Status filter
      if (selectedStatus === "breached") {
        const isBreached =
          (thread.status === "open" || thread.status === "pending") &&
          (thread.slaBreached ||
            (currentNow > 0 && thread.slaDueAt
              ? new Date(thread.slaDueAt).getTime() <= currentNow
              : false));
        if (!isBreached) return false;
      } else if (selectedStatus !== "all" && thread.status !== selectedStatus) {
        return false;
      }

      // Assignee filter
      if (selectedAssignee === "unassigned" && thread.assignedTo !== null) {
        return false;
      }
      if (
        selectedAssignee !== "all" &&
        selectedAssignee !== "unassigned" &&
        thread.assignedTo !== selectedAssignee
      ) {
        return false;
      }

      // Label filter
      if (
        selectedLabel !== "all" &&
        (!thread.labels || !thread.labels.includes(selectedLabel))
      ) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSubject = thread.subject.toLowerCase().includes(q);
        const matchEmail = thread.contactEmail.toLowerCase().includes(q);
        const matchAssignee = (thread.assigneeName || "").toLowerCase().includes(q);
        const matchLabels = (thread.labels || []).some((l) =>
          l.toLowerCase().includes(q)
        );
        return matchSubject || matchEmail || matchAssignee || matchLabels;
      }

      return true;
    });
  }, [
    initialThreads,
    selectedStatus,
    selectedAssignee,
    selectedLabel,
    searchQuery,
    currentNow,
  ]);

  const unreadCount = initialThreads.filter((t) => !t.isRead).length;
  const latestTimestamp = initialThreads[0]?.lastMessageAt
    ? new Date(initialThreads[0].lastMessageAt).toISOString()
    : null;

  // Keyboard navigation listener (j/k, Enter, e, /)
  useEffect(() => {
    function handleInboxKeyDown(e: KeyboardEvent) {
      if (isInputFocused()) {
        if (e.key === "Escape") {
          (document.activeElement as HTMLElement)?.blur();
          e.preventDefault();
        }
        return;
      }

      // / focuses search bar
      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // j or ArrowDown -> Next thread
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (filteredThreads.length === 0) return -1;
          const next = prev + 1;
          return next >= filteredThreads.length ? 0 : next;
        });
        return;
      }

      // k or ArrowUp -> Previous thread
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => {
          if (filteredThreads.length === 0) return -1;
          const next = prev - 1;
          return next < 0 ? filteredThreads.length - 1 : next;
        });
        return;
      }

      // Enter or 'o' -> Open active thread
      if (e.key === "Enter" || e.key === "o") {
        if (selectedIndex >= 0 && selectedIndex < filteredThreads.length) {
          e.preventDefault();
          router.push(`/inbox/${filteredThreads[selectedIndex].id}`);
          return;
        }
      }

      // e -> Quick toggle resolve/open on highlighted thread
      if (e.key === "e") {
        if (selectedIndex >= 0 && selectedIndex < filteredThreads.length) {
          e.preventDefault();
          const target = filteredThreads[selectedIndex];
          const newStatus = target.status === "resolved" ? "open" : "resolved";
          updateThreadStatusAction(target.id, newStatus);
        }
      }
    }

    window.addEventListener("keydown", handleInboxKeyDown);
    return () => window.removeEventListener("keydown", handleInboxKeyDown);
  }, [filteredThreads, selectedIndex, router]);

  // Status visual pill styles
  const statusStyles: Record<string, string> = {
    open: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
    resolved: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
    closed: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  };

  // Priority badge renderer
  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 flex items-center gap-1 shrink-0">
            <AlertCircle className="h-3 w-3" />
            Urgent
          </span>
        );
      case "high":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 flex items-center gap-1 shrink-0">
            <AlertTriangle className="h-3 w-3" />
            High
          </span>
        );
      case "low":
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-zinc-400 dark:text-zinc-500 shrink-0">
            Low
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <InboxLiveRefresher
        latestTimestamp={latestTimestamp}
        unreadCount={unreadCount}
      />

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: "all", label: "All", count: counts.all },
              { id: "open", label: "Open", count: counts.open },
              { id: "pending", label: "Pending", count: counts.pending },
              {
                id: "breached",
                label: "Breached SLA",
                count: counts.breached,
                isAlert: counts.breached > 0,
              },
              { id: "resolved", label: "Resolved", count: counts.resolved },
              { id: "closed", label: "Closed", count: counts.closed },
            ].map((tab) => {
              const isActive = selectedStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStatus(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? tab.id === "breached"
                        ? "bg-red-600 text-white shadow-xs"
                        : "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                      : tab.isAlert
                      ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive
                        ? "bg-black/20 dark:bg-white/20 text-white dark:text-black font-bold"
                        : tab.isAlert
                        ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 font-bold"
                        : "bg-zinc-200/80 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search + Assignee Filter */}
          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations... (Press /)"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Assignee Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-3 pr-7 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white cursor-pointer"
              >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Label / Tag Filter Bar */}
        {uniqueLabels.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800/80">
            <span className="text-zinc-400 font-medium flex items-center gap-1 shrink-0 mr-1 text-[11px]">
              <Tag className="h-3 w-3" />
              Tags:
            </span>
            <button
              type="button"
              onClick={() => setSelectedLabel("all")}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                selectedLabel === "all"
                  ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black border-transparent"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100"
              }`}
            >
              All Tags
            </button>
            {uniqueLabels.map((lbl) => {
              const isSelected = selectedLabel === lbl;
              const count = labelCounts.get(lbl) || 0;
              const colorClass = getLabelColorClass(lbl);
              return (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => setSelectedLabel(isSelected ? "all" : lbl)}
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
                    isSelected
                      ? "ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-zinc-950 font-bold " +
                        colorClass
                      : colorClass + " opacity-80 hover:opacity-100"
                  }`}
                >
                  <span>#{lbl}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Thread List Table */}
        {filteredThreads.length === 0 ? (
          <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center bg-white dark:bg-zinc-950">
            <div className="mx-auto h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
              <Inbox className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              No conversations found
            </h3>
            <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
              {searchQuery ||
              selectedStatus !== "all" ||
              selectedAssignee !== "all" ||
              selectedLabel !== "all"
                ? "No tickets match your active status, assignee, label, or search filters."
                : "Your inbox is currently empty. Incoming customer emails or new outbound threads will appear here."}
            </p>
            {(searchQuery ||
              selectedStatus !== "all" ||
              selectedAssignee !== "all" ||
              selectedLabel !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus("all");
                  setSelectedAssignee("all");
                  setSelectedLabel("all");
                  setSearchQuery("");
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-semibold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-xs">
            {filteredThreads.map((thread, idx) => {
              const isUnread = !thread.isRead;
              const isSelected = selectedIndex === idx;
              const formattedDate = thread.lastMessageAt
                ? new Date(thread.lastMessageAt).toLocaleDateString()
                : "Just now";
              const sla = calculateSlaStatus({
                status: thread.status,
                priority: thread.priority,
                slaDueAt: thread.slaDueAt,
                slaBreached: thread.slaBreached,
                referenceTime: currentNow > 0 ? currentNow : undefined,
              });

              return (
                <Link
                  key={thread.id}
                  href={`/inbox/${thread.id}`}
                  className={`block p-4 transition-all ${
                    isSelected
                      ? "ring-2 ring-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 relative z-10"
                      : isUnread
                      ? "bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 border-l-4 border-l-blue-600"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      {isUnread && (
                        <span
                          title="Unread message"
                          className="h-2 w-2 rounded-full bg-blue-600 shrink-0"
                        />
                      )}
                      <span
                        className={`truncate text-sm ${
                          isUnread
                            ? "font-bold text-zinc-950 dark:text-white"
                            : "font-semibold text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {thread.contactEmail}
                      </span>
                      {isUnread && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 shrink-0">
                          Unread
                        </span>
                      )}

                      {/* Status Pill */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0 capitalize ${
                          statusStyles[thread.status] || statusStyles.open
                        }`}
                      >
                        {thread.status}
                      </span>

                      {/* Priority Badge */}
                      {renderPriorityBadge(thread.priority)}

                      {/* Dynamic SLA Countdown / Breach Badge */}
                      {sla && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 shrink-0 ${
                            sla.state === "breached"
                              ? "bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800 animate-pulse font-bold"
                              : sla.state === "warning"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold"
                              : sla.state === "met"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400"
                          }`}
                        >
                          <Clock className="h-3 w-3" />
                          <span>{sla.label}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-xs text-zinc-500">
                      {/* Assignee Indicator */}
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                        <User className="h-3 w-3 text-zinc-400" />
                        <span className="truncate max-w-[120px]">
                          {thread.assigneeName || "Unassigned"}
                        </span>
                      </div>

                      <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                        {thread.messageCount}{" "}
                        {thread.messageCount === 1 ? "msg" : "msgs"}
                      </span>
                      <span>{formattedDate}</span>
                      {isSelected && (
                        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-100/80 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded">
                          <CornerDownLeft className="h-3 w-3" /> Enter
                        </span>
                      )}
                    </div>
                  </div>

                  <p
                    className={`text-sm mt-1 truncate ${
                      isUnread
                        ? "font-semibold text-zinc-900 dark:text-zinc-100"
                        : "font-normal text-zinc-600 dark:text-zinc-400"
                    }`}
                  >
                    {thread.subject}
                  </p>

                  {/* Thread Label Pills */}
                  {thread.labels && thread.labels.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {thread.labels.map((lbl) => (
                        <span
                          key={lbl}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getLabelColorClass(
                            lbl
                          )}`}
                        >
                          #{lbl}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

