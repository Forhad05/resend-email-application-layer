"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { checkInboxUpdatesAction } from "@/lib/email/inbox-actions";

interface InboxLiveRefresherProps {
  latestTimestamp: string | null;
  unreadCount: number;
}

export function InboxLiveRefresher({
  latestTimestamp,
  unreadCount,
}: InboxLiveRefresherProps) {
  const router = useRouter();
  const latestTimestampRef = useRef(latestTimestamp);
  const unreadCountRef = useRef(unreadCount);

  useEffect(() => {
    latestTimestampRef.current = latestTimestamp;
    unreadCountRef.current = unreadCount;
  }, [latestTimestamp, unreadCount]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const performCheck = async () => {
      if (document.visibilityState !== "visible") return;

      try {
        const update = await checkInboxUpdatesAction(
          latestTimestampRef.current,
          unreadCountRef.current
        );

        if (update.hasUpdates) {
          latestTimestampRef.current = update.latestTimestamp;
          unreadCountRef.current = update.unreadCount;
          router.refresh();
        }
      } catch (err) {
        console.warn("Inbox sync check error:", err);
      }
    };

    // Poll every 5 seconds
    timer = setInterval(performCheck, 5000);

    const onFocus = () => {
      performCheck();
    };
    window.addEventListener("focus", onFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [router]);

  return null;
}

