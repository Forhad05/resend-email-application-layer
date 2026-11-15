import { Suspense } from "react";
import { connection } from "next/server";
import { getAuditLogs } from "@/lib/audit";
import { getWebhookEvents, getWebhookEventStats } from "@/lib/webhook/queue";
import { AuditLogsView } from "@/components/audit/AuditLogsView";

export const metadata = {
  title: "Audit Log & Webhook DLQ - Internal Mail",
  description: "Comprehensive activity trail tracking all system mutations, agent actions, and inbound webhook resiliency.",
};

async function AuditContent() {
  await connection();
  const [logs, webhookEventsList, webhookStats] = await Promise.all([
    getAuditLogs({ limit: 100 }),
    getWebhookEvents({ limit: 50 }),
    getWebhookEventStats(),
  ]);

  return (
    <AuditLogsView
      initialLogs={logs}
      webhookEvents={webhookEventsList}
      webhookStats={webhookStats}
    />
  );
}

export default function AuditPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-sm text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
          Loading audit activity trail & webhook queue...
        </div>
      }
    >
      <AuditContent />
    </Suspense>
  );
}
