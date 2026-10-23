"use client";

import { useState, useTransition } from "react";
import { createInternalNoteAction } from "@/app/(dashboard)/inbox/[threadId]/actions";
import { Lock, Loader2, AlertCircle, Check } from "lucide-react";

interface InternalNoteBoxProps {
  threadId: string;
}

export function InternalNoteBox({ threadId }: { threadId: string }) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const res = await createInternalNoteAction(threadId, content);
      if (res.success) {
        setContent("");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2500);
      } else {
        setError(res.error || "Failed to save internal note");
      }
    });
  };

  return (
    <div className="border border-amber-200 dark:border-amber-900/60 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 p-4 shadow-xs">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">
        <Lock className="h-3.5 w-3.5" />
        <span>Add Internal Note</span>
        <span className="text-[11px] font-normal text-amber-700/80 dark:text-amber-400/70 ml-1">
          (Only team members can see this)
        </span>
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5" />
          <span>Internal note added to conversation.</span>
        </div>
      )}

      <form onSubmit={handleAddNote} className="space-y-3">
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Mention teammates, record customer call details, or leave investigation notes..."
          className="w-full bg-white dark:bg-zinc-900 border border-amber-200/80 dark:border-amber-800/60 rounded-lg p-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y font-sans"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-amber-800/70 dark:text-amber-400/70">
            Internal notes will never be emailed or visible to the customer.
          </span>
          <button
            type="submit"
            disabled={isPending || !content.trim()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-500 dark:hover:bg-amber-600 rounded-lg text-xs font-semibold disabled:opacity-50 transition-all shadow-xs"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving note...</span>
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" />
                <span>Save Note</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

