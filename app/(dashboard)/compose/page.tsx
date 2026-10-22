"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendEmailAction } from "./actions";
import { Send, Eye, Edit3, AlertCircle, Loader2, X } from "lucide-react";
import Link from "next/link";

export default function ComposePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [to, setTo] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("to", to);
    if (showCc && cc) formData.append("cc", cc);
    if (showBcc && bcc) formData.append("bcc", bcc);
    formData.append("subject", subject);
    formData.append("body", body);

    startTransition(async () => {
      const res = await sendEmailAction(formData);
      if (res.success && res.threadId) {
        router.push(`/inbox/${res.threadId}`);
      } else {
        setErrorMessage(res.error || "Failed to send email. Please try again.");
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Compose New Email
          </h1>
          <p className="text-sm text-zinc-500">
            Send an email through Resend and save the conversation history to your database.
          </p>
        </div>
        <Link
          href="/inbox"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Cancel
        </Link>
      </div>

      {/* Error alert banner */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{errorMessage}</div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-600 dark:text-red-400 hover:opacity-75"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          {/* Recipient Fields */}
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {/* TO field */}
            <div className="flex items-center px-4 py-3">
              <label
                htmlFor="to"
                className="w-16 text-sm font-medium text-zinc-500"
              >
                To:
              </label>
              <input
                id="to"
                type="text"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com (comma separated for multiple)"
                className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
              />
              <div className="flex items-center gap-2 text-xs">
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 font-medium px-1.5 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    onClick={() => setShowBcc(true)}
                    className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 font-medium px-1.5 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    Bcc
                  </button>
                )}
              </div>
            </div>

            {/* CC field (collapsible) */}
            {showCc && (
              <div className="flex items-center px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                <label
                  htmlFor="cc"
                  className="w-16 text-sm font-medium text-zinc-500"
                >
                  Cc:
                </label>
                <input
                  id="cc"
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCc(false);
                    setCc("");
                  }}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* BCC field (collapsible) */}
            {showBcc && (
              <div className="flex items-center px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                <label
                  htmlFor="bcc"
                  className="w-16 text-sm font-medium text-zinc-500"
                >
                  Bcc:
                </label>
                <input
                  id="bcc"
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@example.com"
                  className="flex-1 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowBcc(false);
                    setBcc("");
                  }}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Subject field */}
            <div className="flex items-center px-4 py-3">
              <label
                htmlFor="subject"
                className="w-16 text-sm font-medium text-zinc-500"
              >
                Subject:
              </label>
              <input
                id="subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What is this email about?"
                className="flex-1 bg-transparent text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Write / Preview Tab Switcher */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("write")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "write"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <Edit3 className="h-3.5 w-3.5" />
                Write
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeTab === "preview"
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </button>
            </div>
            <span className="text-xs text-zinc-400">
              Plain text & HTML supported
            </span>
          </div>

          {/* Editor Area */}
          <div className="p-4 min-h-[300px]">
            {activeTab === "write" ? (
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                placeholder="Write your email message here..."
                required
                className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none resize-y font-sans leading-relaxed"
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none text-sm min-h-[250px]">
                {body.trim() ? (
                  <div className="whitespace-pre-wrap leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {body}
                  </div>
                ) : (
                  <p className="text-zinc-400 italic">
                    Nothing to preview yet. Start typing in the Write tab!
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-zinc-500">
            Sends from:{" "}
            <span className="font-mono text-zinc-700 dark:text-zinc-300">
              {process.env.NEXT_PUBLIC_APP_URL || "Resend Default Sender"}
            </span>
          </div>
          <button
            type="submit"
            disabled={isPending || !to.trim()}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>Send Email</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
