"use client";

import { useState, useTransition } from "react";
import {
  updateThreadStatusAction,
  updateThreadPriorityAction,
  updateThreadAssigneeAction,
} from "@/app/(dashboard)/inbox/[threadId]/actions";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Shield,
  Loader2,
  Check,
  ChevronDown,
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
}

interface ThreadWorkflowControlsProps {
  threadId: string;
  currentStatus: string;
  currentPriority: string;
  currentAssigneeId: string | null;
  teamMembers: TeamMember[];
}

export function ThreadWorkflowControls({
  threadId,
  currentStatus,
  currentPriority,
  currentAssigneeId,
  teamMembers,
}: ThreadWorkflowControlsProps) {
  const [status, setStatus] = useState(currentStatus);
  const [priority, setPriority] = useState(currentPriority);
  const [assigneeId, setAssigneeId] = useState<string | null>(currentAssigneeId);

  const [isStatusPending, startStatusTransition] = useTransition();
  const [isPriorityPending, startPriorityTransition] = useTransition();
  const [isAssigneePending, startAssigneeTransition] = useTransition();

  const handleStatusChange = (newStatus: "open" | "pending" | "resolved" | "closed") => {
    if (newStatus === status) return;
    setStatus(newStatus);
    startStatusTransition(async () => {
      await updateThreadStatusAction(threadId, newStatus);
    });
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPriority = e.target.value as "low" | "normal" | "high" | "urgent";
    setPriority(newPriority);
    startPriorityTransition(async () => {
      await updateThreadPriorityAction(threadId, newPriority);
    });
  };

  const handleAssigneeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const newAssigneeId = val === "unassigned" ? null : val;
    setAssigneeId(newAssigneeId);
    startAssigneeTransition(async () => {
      await updateThreadAssigneeAction(threadId, newAssigneeId);
    });
  };

  // Status visual styles
  const statusStyles: Record<string, string> = {
    open: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800",
    resolved: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800",
    closed: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700",
  };

  // Priority color accents
  const priorityColors: Record<string, string> = {
    low: "text-zinc-500",
    normal: "text-blue-600 dark:text-blue-400",
    high: "text-amber-600 dark:text-amber-400 font-semibold",
    urgent: "text-red-600 dark:text-red-400 font-bold",
  };

  return (
    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
      {/* Status Segmented Buttons */}
      <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/60 text-xs font-medium">
        {(["open", "pending", "resolved", "closed"] as const).map((s) => {
          const isActive = status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => handleStatusChange(s)}
              disabled={isStatusPending}
              className={`px-2.5 py-1 rounded-md capitalize transition-all flex items-center gap-1 ${
                isActive
                  ? `${statusStyles[s]} shadow-xs font-semibold`
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50"
              }`}
            >
              {isStatusPending && isActive ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : s === "resolved" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : s === "pending" ? (
                <Clock className="h-3 w-3" />
              ) : null}
              <span>{s}</span>
            </button>
          );
        })}
      </div>

      <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

      {/* Priority Dropdown */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
        <AlertTriangle className="h-3.5 w-3.5 text-zinc-400" />
        <span className="font-medium">Priority:</span>
        <div className="relative inline-flex items-center">
          <select
            value={priority}
            onChange={handlePriorityChange}
            disabled={isPriorityPending}
            className={`appearance-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md pl-2.5 pr-7 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-zinc-400 capitalize cursor-pointer ${
              priorityColors[priority] || ""
            }`}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <div className="pointer-events-none absolute right-1.5 flex items-center text-zinc-400">
            {isPriorityPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </div>
        </div>
      </div>

      <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block" />

      {/* Assignee Dropdown */}
      <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
        <User className="h-3.5 w-3.5 text-zinc-400" />
        <span className="font-medium">Assignee:</span>
        <div className="relative inline-flex items-center">
          <select
            value={assigneeId || "unassigned"}
            onChange={handleAssigneeChange}
            disabled={isAssigneePending}
            className="appearance-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md pl-2.5 pr-7 py-1 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer max-w-[180px] truncate"
          >
            <option value="unassigned">Unassigned</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-1.5 flex items-center text-zinc-400">
            {isAssigneePending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

