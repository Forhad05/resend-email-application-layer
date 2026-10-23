"use client";

import { useState, useTransition } from "react";
import { replyAction } from "@/app/(dashboard)/inbox/[threadId]/actions";
import { Send, Loader2, AlertCircle, ShieldAlert, Sparkles } from "lucide-react";

interface CannedTemplate {
  id: string;
  name: string;
  slug: string;
  textBody: string | null;
}

interface ThreadReplyBoxProps {
  threadId: string;
  contactEmail?: string;
  isSuppressed?: boolean;
  suppressionReason?: string | null;
  templates?: CannedTemplate[];
}

export function ThreadReplyBox({
  threadId,
  contactEmail,
  isSuppressed = false,
  suppressionReason = null,
  templates = [],
}: ThreadReplyBoxProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || isSuppressed) return;
    setError(null);

    startTransition(async () => {
      const res = await replyAction(threadId, body);
      if (res.success) {
        setBody("");
      } else {
        setError(res.error || "Failed to send reply");
      }
    });
  };

  const handleTemplateInsert = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = templates.find((t) => t.id === e.target.value);
    if (selected?.textBody) {
      const customerName = contactEmail ? contactEmail.split("@")[0] : "there";
      const filled = selected.textBody
        .replace(/\{\{\s*customer_name\s*\}\}/g, customerName)
        .replace(/\{\{\s*company\s*\}\}/g, "SystemDevify")
        .replace(/\{\{\s*agent_name\s*\}\}/g, "Support Team")
        .replace(/\{\{\s*ticket_id\s*\}\}/g, threadId.slice(0, 8));

      setBody((prev) => (prev.trim() ? `${prev}\n\n${filled}` : filled));
    }
    e.target.value = "";
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-4 shadow-sm">
      {/* Suppression Warning Banner */}
      {isSuppressed && (
        <div className="mb-3 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-xs flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          <div>
            <span className="font-semibold">Recipient is Suppressed:</span>{" "}
            <span className="font-mono font-bold">{contactEmail}</span> previously{" "}
            {suppressionReason === "hard_bounce"
              ? "hard-bounced"
              : "filed a spam complaint"}
            . Replying to this address is blocked to protect domain reputation.
          </div>
        </div>
      )}

      {/* General Error Banner */}
      {error && (
        <div className="mb-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleReply} className="space-y-3">
        {/* Quick Canned Template Selector */}
        {templates.length > 0 && !isSuppressed && (
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Canned Response:</span>
              <select
                defaultValue=""
                onChange={handleTemplateInsert}
                className="appearance-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-0.5 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white cursor-pointer"
              >
                <option value="" disabled>
                  Insert template...
                </option>
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <textarea
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={isSuppressed}
          placeholder={
            isSuppressed
              ? "Cannot reply: recipient email address is on the suppression list."
              : "Write your reply to this conversation..."
          }
          className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none resize-y font-sans disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-xs text-zinc-400">
            {isSuppressed
              ? "Replies disabled due to suppression enforcement"
              : "Replies include In-Reply-To and References headers"}
          </span>
          <button
            type="submit"
            disabled={isPending || !body.trim() || isSuppressed}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : isSuppressed ? (
              <>
                <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                <span>Blocked</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Send Reply</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
