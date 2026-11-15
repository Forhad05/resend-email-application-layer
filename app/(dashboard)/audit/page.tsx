import { Suspense } from "react";
import { connection } from "next/server";
import { getAuditLogs } from "@/lib/audit";
import { AuditLogsView } from "@/components/audit/AuditLogsView";

export const metadata = {
  title: "Audit Log - Internal Mail",
  description: "Comprehensive activity trail tracking all system mutations and agent actions.",
};

async function AuditContent() {
  await connection();
  const logs = await getAuditLogs({ limit: 100 });
  return <AuditLogsView initialLogs={logs} />;
}

export default function AuditPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-sm text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
          Loading audit activity trail...
        </div>
      }
    >
      <AuditContent />
    </Suspense>
  );
}
