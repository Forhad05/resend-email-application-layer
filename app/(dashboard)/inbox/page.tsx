import { Suspense } from "react";
import { db } from "@/lib/db";
import { threads } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Inbox, Mail, Plus } from "lucide-react";
import Link from "next/link";

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

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
      {threadList.map((thread) => (
        <Link
          key={thread.id}
          href={`/inbox/${thread.id}`}
          className="block p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
              {thread.contactEmail}
            </span>
            <span className="text-xs text-zinc-500">
              {thread.lastMessageAt?.toLocaleDateString() ?? "Just now"}
            </span>
          </div>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200 mt-1">
            {thread.subject}
          </p>
        </Link>
      ))}
    </div>
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

