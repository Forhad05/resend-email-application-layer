"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { isInputFocused } from "@/components/shortcuts/KeyboardShortcutsProvider";
import { updateThreadStatusAction } from "@/app/(dashboard)/inbox/[threadId]/actions";

interface ThreadKeyboardShortcutsProps {
  threadId: string;
  currentStatus: string;
}

export function ThreadKeyboardShortcuts({
  threadId,
  currentStatus,
}: ThreadKeyboardShortcutsProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isInputFocused()) {
        return;
      }

      // r -> Focus reply textarea
      if (e.key.toLowerCase() === "r" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const textarea = document.getElementById("thread-reply-textarea");
        if (textarea) {
          textarea.focus();
          textarea.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      // e -> Quick toggle ticket status (resolved / open)
      if (e.key.toLowerCase() === "e" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const nextStatus = currentStatus === "resolved" ? "open" : "resolved";
        startTransition(async () => {
          await updateThreadStatusAction(threadId, nextStatus);
        });
        return;
      }

      // u -> Back to inbox
      if (e.key.toLowerCase() === "u" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        router.push("/inbox");
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [threadId, currentStatus, router]);

  return null;
}
