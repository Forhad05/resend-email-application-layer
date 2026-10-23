import { Suspense } from "react";
import { db } from "@/lib/db";
import { threads, user } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";
import { InboxThreadView } from "@/components/inbox/InboxThreadView";
import { getTeamMembers } from "@/lib/db/team";
import { connection } from "next/server";

async function ThreadList() {
  await connection();
  const [threadList, teamMembers] = await Promise.all([
    db
      .select({
        id: threads.id,
        subject: threads.subject,
        status: threads.status,
        priority: threads.priority,
        assignedTo: threads.assignedTo,
        assigneeName: user.name,
        contactEmail: threads.contactEmail,
        messageCount: threads.messageCount,
        lastMessageAt: threads.lastMessageAt,
        isRead: threads.isRead,
      })
      .from(threads)
      .leftJoin(user, eq(threads.assignedTo, user.id))
      .orderBy(desc(threads.lastMessageAt))
      .limit(100),
    getTeamMembers(),
  ]);

  return (
    <InboxThreadView
      initialThreads={threadList}
      teamMembers={teamMembers.map((m) => ({ id: m.id, name: m.name }))}
    />
  );
}

export default function InboxPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Inbox
          </h1>
          <p className="text-sm text-zinc-500">
            Support conversations and tickets synced in real-time.
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
