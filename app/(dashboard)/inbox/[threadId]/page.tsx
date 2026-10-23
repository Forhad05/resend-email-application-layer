import { Suspense } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { threads, messages } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { ThreadReplyBox } from "@/components/inbox/ThreadReplyBox";
import { ThreadLiveRefresher } from "@/components/inbox/ThreadLiveRefresher";
import { DeliveryStatusBadge } from "@/components/inbox/DeliveryStatusBadge";
import { ArrowLeft, Clock, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface PageProps {
  params: Promise<{ threadId: string }>;
}

async function ThreadDetails({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  const [thread] = await db
    .select()
    .from(threads)
    .where(eq(threads.id, threadId))
    .limit(1);

  if (!thread) {
    notFound();
  }

  const messageList = await db
    .select()
    .from(messages)
    .where(eq(messages.threadId, threadId))
    .orderBy(asc(messages.createdAt));

  return (
    <div className="space-y-6">
      {/* Thread Header Info */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                {thread.status}
              </span>
              <span className="text-xs text-zinc-400">
                {messageList.length}{" "}
                {messageList.length === 1 ? "message" : "messages"}
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <ThreadLiveRefresher
                threadId={thread.id}
                initialMessageCount={thread.messageCount || messageList.length}
                initialLastMessageAt={thread.lastMessageAt?.toISOString() || null}
                isRead={thread.isRead}
              />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">
              {thread.subject}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5 flex items-center gap-1.5">
              <span>Customer:</span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {thread.contactEmail}
              </span>
            </p>
          </div>

          <div className="text-xs text-zinc-400 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Updated: {thread.lastMessageAt?.toLocaleString() ?? "N/A"}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Timeline */}
      <div className="space-y-4">
        {messageList.map((msg) => {
          const isOutbound = msg.direction === "outbound";
          return (
            <div
              key={msg.id}
              className={`rounded-xl border p-5 transition-shadow ${
                isOutbound
                  ? "bg-zinc-50/70 border-zinc-200 dark:bg-zinc-900/60 dark:border-zinc-800 ml-6 sm:ml-12"
                  : "bg-white border-zinc-200 dark:bg-zinc-950 dark:border-zinc-800 mr-6 sm:mr-12"
              }`}
            >
              {/* Message Meta */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-200/60 dark:border-zinc-800 text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                      isOutbound
                        ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-black"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    {isOutbound ? "YOU" : "CUST"}
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {isOutbound
                        ? msg.fromEmail
                        : msg.fromName || msg.fromEmail}
                    </span>
                    <span className="text-zinc-400 mx-1.5">→</span>
                    <span className="text-zinc-500">
                      {msg.toEmails.join(", ")}
                    </span>
                  </div>
                </div>
                <div className="text-zinc-400">
                  {msg.createdAt.toLocaleString()}
                </div>
              </div>

              {/* Message Body */}
              <div className="pt-3 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap font-sans">
                {msg.textBody || msg.htmlBody || "(No content)"}
              </div>

              {/* Status footer for outbound messages */}
              {isOutbound && (
                <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-100 dark:border-zinc-800/60">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3 text-emerald-500" />
                      Resend
                    </span>
                    <DeliveryStatusBadge status={msg.status} />
                  </div>
                  {msg.resendEmailId && (
                    <span className="font-mono text-[10px]">
                      ID: {msg.resendEmailId}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reply Box */}
      <div className="pt-2">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
          Reply to Conversation
        </h3>
        <ThreadReplyBox threadId={thread.id} />
      </div>
    </div>
  );
}

export default function ThreadPage({ params }: PageProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top back navigation */}
      <div>
        <Link
          href="/inbox"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Inbox</span>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="p-12 text-center text-sm text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
            Loading conversation details...
          </div>
        }
      >
        <ThreadDetails params={params} />
      </Suspense>
    </div>
  );
}
