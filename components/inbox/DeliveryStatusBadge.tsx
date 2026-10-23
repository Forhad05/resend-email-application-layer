"use client";

import {
  Check,
  CheckCircle2,
  Clock,
  Eye,
  MousePointerClick,
  AlertTriangle,
  AlertOctagon,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DeliveryStatusBadgeProps {
  status: string | null;
  className?: string;
}

export function DeliveryStatusBadge({
  status,
  className,
}: DeliveryStatusBadgeProps) {
  const normStatus = (status || "sent").toLowerCase();

  switch (normStatus) {
    case "delivered":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60",
            className
          )}
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          <span>Delivered</span>
        </span>
      );

    case "opened":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60",
            className
          )}
        >
          <Eye className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
          <span>Opened</span>
        </span>
      );

    case "clicked":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60",
            className
          )}
        >
          <MousePointerClick className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          <span>Clicked</span>
        </span>
      );

    case "bounced":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800/60",
            className
          )}
        >
          <AlertTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />
          <span>Bounced</span>
        </span>
      );

    case "complained":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60",
            className
          )}
        >
          <AlertOctagon className="h-3 w-3 text-rose-600 dark:text-rose-400" />
          <span>Spam Complaint</span>
        </span>
      );

    case "queued":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60",
            className
          )}
        >
          <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          <span>Queued</span>
        </span>
      );

    case "failed":
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800/60",
            className
          )}
        >
          <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
          <span>Failed</span>
        </span>
      );

    case "sent":
    default:
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700",
            className
          )}
        >
          <Check className="h-3 w-3 text-zinc-500" />
          <span>Sent</span>
        </span>
      );
  }
}

