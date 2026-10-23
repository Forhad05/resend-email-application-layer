"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Inbox,
  Search,
  User,
  AlertCircle,
  AlertTriangle,
  X,
} from "lucide-react";
import { InboxLiveRefresher } from "./InboxLiveRefresher";

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
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: initialThreads.length,
      open: initialThreads.filter((t) => t.status === "open").length,
      pending: initialThreads.filter((t) => t.status === "pending").length,
      resolved: initialThreads.filter((t) => t.status === "resolved").length,
      closed: initialThreads.filter((t) => t.status === "closed").length,
    };
  }, [initialThreads]);

  // Filtered thread list
  const filteredThreads = useMemo(() => {
    return initialThreads.filter((thread) => {
      // Status filter
      if (selectedStatus !== "all" && thread.status !== selectedStatus) {
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

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSubject = thread.subject.toLowerCase().includes(q);
        const matchEmail = thread.contactEmail.toLowerCase().includes(q);
        const matchAssignee = (thread.assigneeName || "").toLowerCase().includes(q);
        return matchSubject || matchEmail || matchAssignee;
      }

      return true;
    });
  }, [initialThreads, selectedStatus, selectedAssignee, searchQuery]);

  const unreadCount = initialThreads.filter((t) => !t.isRead).length;
  const latestTimestamp = initialThreads[0]?.lastMessageAt
    ? new Date(initialThreads[0].lastMessageAt).toISOString()
    : null;

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
                      ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive
                        ? "bg-zinc-800 text-zinc-200 dark:bg-zinc-200 dark:text-black font-bold"
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
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
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
              {searchQuery || selectedStatus !== "all" || selectedAssignee !== "all"
                ? "No tickets match your active status, assignee, or search filters."
                : "Your inbox is currently empty. Incoming customer emails or new outbound threads will appear here."}
            </p>
            {(searchQuery || selectedStatus !== "all" || selectedAssignee !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedStatus("all");
                  setSelectedAssignee("all");
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
            {filteredThreads.map((thread) => {
              const isUnread = !thread.isRead;
              const formattedDate = thread.lastMessageAt
                ? new Date(thread.lastMessageAt).toLocaleDateString()
                : "Just now";

              return (
                <Link
                  key={thread.id}
                  href={`/inbox/${thread.id}`}
                  className={`block p-4 transition-colors ${
                    isUnread
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
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

