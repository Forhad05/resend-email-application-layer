"use client";

import { useState } from "react";
import { ThreadReplyBox } from "@/components/inbox/ThreadReplyBox";
import { InternalNoteBox } from "@/components/inbox/InternalNoteBox";
import { MessageSquare, Lock } from "lucide-react";

interface CannedTemplate {
  id: string;
  name: string;
  slug: string;
  textBody: string | null;
}

interface ThreadComposerTabsProps {
  threadId: string;
  contactEmail: string;
  isSuppressed: boolean;
  suppressionReason: string | null;
  templates?: CannedTemplate[];
}

export function ThreadComposerTabs({
  threadId,
  contactEmail,
  isSuppressed,
  suppressionReason,
  templates = [],
}: ThreadComposerTabsProps) {
  const [activeTab, setActiveTab] = useState<"reply" | "note">("reply");

  return (
    <div className="space-y-3">
      {/* Tab Switcher Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("reply")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "reply"
                ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Reply to Customer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("note")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "note"
                ? "bg-amber-600 text-white dark:bg-amber-500 shadow-xs"
                : "text-zinc-600 dark:text-zinc-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            }`}
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Internal Note</span>
          </button>
        </div>

        <span className="text-[11px] text-zinc-400">
          {activeTab === "reply"
            ? "Sends outbound email to customer"
            : "Private to agents only"}
        </span>
      </div>

      {/* Tab Content */}
      {activeTab === "reply" ? (
        <ThreadReplyBox
          threadId={threadId}
          contactEmail={contactEmail}
          isSuppressed={isSuppressed}
          suppressionReason={suppressionReason}
          templates={templates}
        />
      ) : (
        <InternalNoteBox threadId={threadId} />
      )}
    </div>
  );
}
