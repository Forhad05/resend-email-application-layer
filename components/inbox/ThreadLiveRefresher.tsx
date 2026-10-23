"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  checkThreadUpdatesAction,
  markThreadAsReadAction,
} from "@/app/(dashboard)/inbox/[threadId]/actions";
import { Mail, RefreshCw } from "lucide-react";

interface ThreadLiveRefresherProps {
  threadId: string;
  initialMessageCount: number;
  initialLastMessageAt: string | null;
  isRead: boolean;
}

export function ThreadLiveRefresher({
  threadId,
  initialMessageCount,
  initialLastMessageAt,
  isRead,
}: ThreadLiveRefresherProps) {
  const router = useRouter();
  const [newActivityToast, setNewActivityToast] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const messageCountRef = useRef(initialMessageCount);
  const lastMessageAtRef = useRef(initialLastMessageAt);

  // Update refs when props change
  useEffect(() => {
    messageCountRef.current = initialMessageCount;
    lastMessageAtRef.current = initialLastMessageAt;
  }, [initialMessageCount, initialLastMessageAt]);

  // 1. Automatically mark as read if currently unread
  useEffect(() => {
    if (!isRead) {
      markThreadAsReadAction(threadId);
    }
  }, [threadId, isRead]);

  // 2. Periodic polling & focus checking
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const performSyncCheck = async () => {
      if (document.visibilityState !== "visible") return;

      setIsSyncing(true);
      try {
        const update = await checkThreadUpdatesAction(
          threadId,
          messageCountRef.current,
          lastMessageAtRef.current
        );

        if (update.hasNewMessages) {
          setNewActivityToast(true);
          messageCountRef.current = update.messageCount ?? messageCountRef.current;
          lastMessageAtRef.current = update.lastMessageAt ?? lastMessageAtRef.current;
          router.refresh();

          // Auto-hide toast after 5s
          setTimeout(() => {
            setNewActivityToast(false);
          }, 5000);
        }
      } catch (err) {
        console.warn("Background sync error:", err);
      } finally {
        setIsSyncing(false);
      }
    };

    // Poll every 4 seconds
    timer = setInterval(performSyncCheck, 4000);

    // Also check immediately when window receives focus
    const onFocus = () => {
      performSyncCheck();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [threadId, router]);

  return (
    <>
      {/* Toast Notification for New Incoming Messages */}
      {newActivityToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl shadow-lg border border-zinc-800 dark:border-zinc-200">
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold">New Message Received!</p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-600">
                Timeline has updated automatically.
              </p>
            </div>
            <button
              onClick={() => setNewActivityToast(false)}
              className="ml-2 text-xs text-zinc-400 hover:text-white dark:hover:text-black p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Subtle Live Sync Pulse in Thread Header */}
      <span
        title={isSyncing ? "Checking for updates..." : "Live Sync Active"}
        className="inline-flex items-center gap-1 text-[11px] text-zinc-400"
      >
        <span
          className={`h-2 w-2 rounded-full ${
            isSyncing ? "bg-amber-400 animate-ping" : "bg-emerald-500"
          }`}
        />
        <span>Live</span>
      </span>
    </>
  );
}

