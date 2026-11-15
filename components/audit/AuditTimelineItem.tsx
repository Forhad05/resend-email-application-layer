import React from "react";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Send,
  FileText,
  Clock,
  ArrowRight,
} from "lucide-react";

export interface AuditTimelineItemProps {
  id: string;
  action: string;
  actorName: string | null;
  actorEmail: string | null;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

export function AuditTimelineItem({
  action,
  actorName,
  details,
  createdAt,
}: AuditTimelineItemProps) {
  let icon = <Activity className="h-3.5 w-3.5 text-zinc-500" />;
  let description: React.ReactNode = action.replace(".", " ");

  if (action === "thread.status_updated") {
    const prev = (details?.previousStatus as string) || "unknown";
    const next = (details?.newStatus as string) || "updated";
    const isResolved = next === "resolved" || next === "closed";

    icon = isResolved ? (
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
    ) : (
      <Clock className="h-3.5 w-3.5 text-blue-500" />
    );

    description = (
      <span className="inline-flex items-center gap-1.5">
        <span>changed status from</span>
        <span className="font-medium text-zinc-700 dark:text-zinc-300 capitalize">{prev}</span>
        <ArrowRight className="h-3 w-3 text-zinc-400" />
        <span
          className={`font-semibold capitalize ${
            isResolved
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-blue-600 dark:text-blue-400"
          }`}
        >
          {next}
        </span>
      </span>
    );
  } else if (action === "thread.priority_updated") {
    const prev = (details?.previousPriority as string) || "normal";
    const next = (details?.newPriority as string) || "normal";
    const isUrgent = next === "urgent" || next === "high";

    icon = <AlertCircle className={`h-3.5 w-3.5 ${isUrgent ? "text-amber-500" : "text-zinc-500"}`} />;

    description = (
      <span className="inline-flex items-center gap-1.5">
        <span>updated priority from</span>
        <span className="font-medium text-zinc-700 dark:text-zinc-300 capitalize">{prev}</span>
        <ArrowRight className="h-3 w-3 text-zinc-400" />
        <span
          className={`font-semibold capitalize ${
            isUrgent
              ? "text-amber-600 dark:text-amber-400 font-bold"
              : "text-zinc-800 dark:text-zinc-200"
          }`}
        >
          {next}
        </span>
      </span>
    );
  } else if (action === "thread.assigned") {
    const newAssigneeId = details?.newAssigneeId as string | null | undefined;
    icon = <UserCheck className="h-3.5 w-3.5 text-indigo-500" />;

    description = (
      <span>
        {newAssigneeId
          ? "reassigned ticket to a team member"
          : "unassigned ticket"}
      </span>
    );
  } else if (action === "thread.reply_sent") {
    icon = <Send className="h-3.5 w-3.5 text-emerald-500" />;
    description = (
      <span>
        sent outbound reply to customer
        {Boolean(details?.hasAttachments) && " (with attachments)"}
      </span>
    );
  } else if (action === "thread.note_added") {
    icon = <FileText className="h-3.5 w-3.5 text-amber-500" />;
    description = <span>logged an internal team note</span>;
  } else if (action === "thread.created") {
    icon = <Activity className="h-3.5 w-3.5 text-blue-500" />;
    description = <span>initiated conversation</span>;
  }

  return (
    <div className="flex items-center justify-center my-3">
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/90 dark:bg-zinc-900/90 text-xs text-zinc-600 dark:text-zinc-400 shadow-2xs backdrop-blur-xs">
        {icon}
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
          {actorName || "System"}
        </span>
        <span className="text-zinc-300 dark:text-zinc-700">•</span>
        <span>{description}</span>
        <span className="text-zinc-300 dark:text-zinc-700">•</span>
        <span className="text-zinc-400 text-[11px] font-mono">
          {createdAt.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
