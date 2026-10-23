import { Suspense } from "react";
import { db } from "@/lib/db";
import { threads } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Inbox, Mail, Plus } from "lucide-react";
import Link from "next/link";
import { InboxLiveRefresher } from "@/components/inbox/InboxLiveRefresher";

async function ThreadList() {
  const threadList = await db
    .select()
    .from(threads)
    .orderBy(desc(threads.lastMessageAt))
    .limit(50);

  if (threadList.length === 0) {
    return (
      <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
          <Inbox className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          No conversations yet
        </h3>
        <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
          Your inbox is empty. When customer emails arrive via the Resend webhook
          or you send an outbound email, threads will appear here.
        </p>
        <Link
          href="/compose"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:underline"
        >
          <Mail className="h-4 w-4" />
          <span>Send a test email</span>
        </Link>
      </div>
    );
  }

  const unreadCount = threadList.filter((t) => !t.isRead).length;
  const latestTimestamp = threadList[0]?.lastMessageAt?.toISOString() || null;

  return (
    <>
      <InboxLiveRefresher
        latestTimestamp={latestTimestamp}
        unreadCount={unreadCount}
      />
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
        {threadList.map((thread) => {
          const isUnread = !thread.isRead;
          return (
            <Link
              key={thread.id}
              href={`/inbox/${thread.id}`}
              className={`block p-4 transition-colors ${
                isUnread
                  ? "bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 border-l-4 border-l-blue-600"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  {isUnread && (
                    <span
                      title="Unread message"
                      className="h-2 w-2 rounded-full bg-blue-600 shrink-0"
                    />
                  )}
                  <span
                    className={`truncate text-sm ${
                      isUnread
                        ? "font-bold text-zinc-950 dark:text-white"
                        : "font-semibold text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    {thread.contactEmail}
                  </span>
                  {isUnread && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 shrink-0">
                      Unread
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 text-xs text-zinc-500">
                  <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    {thread.messageCount}{" "}
                    {thread.messageCount === 1 ? "msg" : "msgs"}
                  </span>
                  <span>
                    {thread.lastMessageAt?.toLocaleDateString() ?? "Just now"}
                  </span>
                </div>
              </div>

              <p
                className={`text-sm mt-1 truncate ${
                  isUnread
                    ? "font-semibold text-zinc-900 dark:text-zinc-100"
                    : "font-normal text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {thread.subject}
              </p>
            </Link>
          );
        })}
      </div>
    </>
  );
}

export default function InboxPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Inbox
          </h1>
          <p className="text-sm text-zinc-500">
            Support conversations and incoming emails synced via Resend.
          </p>
        </div>
        <Link
          href="/compose"
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          <span>New Email</span>
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="p-8 text-center text-sm text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-lg">
            Loading conversations...
          </div>
        }
      >
        <ThreadList />
      </Suspense>
    </div>
  );
}
