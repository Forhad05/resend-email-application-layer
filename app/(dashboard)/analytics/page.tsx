import { Suspense } from "react";
import { db } from "@/lib/db";
import { messages, threads, suppressions } from "@/lib/db/schema";
import { sql } from "drizzle-orm";
import { Mail, MessageSquare, ShieldAlert } from "lucide-react";

async function StatsGrid() {
  const [msgCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages);
  const [threadCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(threads);
  const [suppressedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(suppressions);

  const stats = [
    {
      name: "Total Messages",
      value: msgCount?.count || 0,
      icon: Mail,
      description: "Emails sent & received",
    },
    {
      name: "Active Conversations",
      value: threadCount?.count || 0,
      icon: MessageSquare,
      description: "Support threads tracked",
    },
    {
      name: "Suppressed Emails",
      value: suppressedCount?.count || 0,
      icon: ShieldAlert,
      description: "Bounces & complaints blocked",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {stats.map((item) => (
        <div
          key={item.name}
          className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 bg-white dark:bg-zinc-900 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-500">
              {item.name}
            </span>
            <item.icon className="h-5 w-5 text-zinc-400" />
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {item.value}
            </span>
            <p className="text-xs text-zinc-500 mt-1">{item.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Analytics & Metrics
        </h1>
        <p className="text-sm text-zinc-500">
          Live overview of message volumes and deliverability hygiene.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="p-12 text-center text-sm text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
            Loading analytics...
          </div>
        }
      >
        <StatsGrid />
      </Suspense>
    </div>
  );
}

