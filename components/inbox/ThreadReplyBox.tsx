"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { replyAction } from "@/app/(dashboard)/inbox/[threadId]/actions";
import {
  Send,
  Loader2,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  Bot,
  FileText,
  Zap,
  HelpCircle,
  Check,
  Copy,
  X,
} from "lucide-react";
import { AttachmentUploader } from "@/components/email/AttachmentUploader";
import {
  generateAiReplyDraftAction,
  ReplyTone,
} from "@/lib/ai/reply-assistant";

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
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // AI Assistant Drawer State
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [selectedTone, setSelectedTone] = useState<ReplyTone>("formal");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<"gemini" | "smart_context" | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [aiInserted, setAiInserted] = useState(false);

  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const insertTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timers on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (insertTimerRef.current) clearTimeout(insertTimerRef.current);
    };
  }, []);

  // Keyboard accessibility: Escape to dismiss AI assistant drawer
  useEffect(() => {
    if (!showAiDrawer) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowAiDrawer(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showAiDrawer]);

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || isSuppressed) return;
    setError(null);

    const formData = new FormData();
    formData.append("threadId", threadId);
    formData.append("body", body);
    for (const file of files) {
      formData.append("files", file);
    }

    startTransition(async () => {
      const res = await replyAction(formData);
      if (res.success) {
        setBody("");
        setFiles([]);
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

  const handleGenerateAiDraft = async () => {
    setIsGeneratingAi(true);
    setAiError(null);

    try {
      const res = await generateAiReplyDraftAction({
        threadId,
        tone: selectedTone,
      });

      if (res.success && res.draft) {
        setAiDraft(res.draft);
        setAiSource(res.source);
      } else {
        setAiError(res.error || "Failed to generate AI draft");
      }
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "Failed to generate AI draft");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleInsertAiDraft = () => {
    if (!aiDraft) return;
    if (body.trim() && body.trim() !== aiDraft.trim()) {
      if (!confirm("Replace your current draft in the editor with this AI suggestion?")) {
        return;
      }
    }
    setBody(aiDraft);
    setAiInserted(true);
    if (insertTimerRef.current) clearTimeout(insertTimerRef.current);
    insertTimerRef.current = setTimeout(() => setAiInserted(false), 3000);
    setShowAiDrawer(false);
  };

  const handleCopyDraft = async () => {
    if (!aiDraft) return;
    try {
      await navigator.clipboard.writeText(aiDraft);
      setIsCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Non-fatal clipboard error
    }
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
        {/* Composer Action Toolbar (Canned Templates + AI Suggestion) */}
        {!isSuppressed && (
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAiDrawer((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  showAiDrawer
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Suggest AI Reply</span>
              </button>

              {templates.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <FileText className="h-3.5 w-3.5 text-zinc-400" />
                  <select
                    defaultValue=""
                    onChange={handleTemplateInsert}
                    className="appearance-none bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white cursor-pointer"
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
              )}
            </div>

            {aiInserted && (
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                <Check className="h-3 w-3" /> Draft inserted into editor
              </span>
            )}
          </div>
        )}

        {/* AI Assistant Drawer */}
        {showAiDrawer && !isSuppressed && (
          <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/60 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Smart AI Reply Assistant
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 font-medium">
                  Context-Aware
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAiDrawer(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tone Selector */}
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-zinc-500">Select Tone:</span>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  {
                    id: "formal",
                    label: "Formal Resolution",
                    icon: FileText,
                  },
                  {
                    id: "quick_ack",
                    label: "Quick Acknowledgment",
                    icon: Zap,
                  },
                  {
                    id: "clarification",
                    label: "Clarification Request",
                    icon: HelpCircle,
                  },
                ].map((t) => {
                  const isSelected = selectedTone === t.id;
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTone(t.id as ReplyTone)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-indigo-600 text-white border-transparent shadow-2xs font-semibold"
                          : "bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={handleGenerateAiDraft}
                  disabled={isGeneratingAi}
                  className="ml-auto px-3 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition flex items-center gap-1.5"
                >
                  {isGeneratingAi ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      <span>{aiDraft ? "Regenerate Draft" : "Generate Draft"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated Draft Preview Card */}
            {aiDraft && (
              <div className="space-y-2 pt-1 border-t border-indigo-100/80 dark:border-indigo-900/40">
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    Suggested Draft ({aiSource === "gemini" ? "Gemini 2.5 Flash" : "Smart Context Engine"}):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyDraft}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800"
                    >
                      {isCopied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      <span>{isCopied ? "Copied" : "Copy"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertAiDraft}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-2xs"
                    >
                      <Check className="h-3 w-3" />
                      <span>Insert into Editor</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 font-sans whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed">
                  {aiDraft}
                </div>
              </div>
            )}

            {aiError && (
              <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{aiError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAiError(null)}
                  className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <p className="text-[11px] text-zinc-400 italic">
              • Human-in-the-loop: Inserting the draft will not send the email automatically. You can edit, attach files, and send manually.
            </p>
          </div>
        )}

        <textarea
          id="thread-reply-textarea"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              handleReply(e);
            }
          }}
          disabled={isSuppressed}
          placeholder={
            isSuppressed
              ? "Cannot reply: recipient email address is on the suppression list."
              : "Write your reply to this conversation... (Press ⌘/Ctrl+Enter to send)"
          }
          className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none resize-y font-sans disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Compact Attachment Uploader */}
        <div className="pt-2">
          <AttachmentUploader
            files={files}
            onFilesChange={setFiles}
            compact={true}
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>
              {isSuppressed
                ? "Replies disabled due to suppression enforcement"
                : "Replies include In-Reply-To and References headers"}
            </span>
            {!isSuppressed && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-zinc-400">
                • Press{" "}
                <kbd className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono text-[10px]">
                  ⌘/Ctrl+Enter
                </kbd>{" "}
                to send
              </span>
            )}
          </div>
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

