import { Suspense } from "react";
import { connection } from "next/server";
import { getDeliverabilityMetrics } from "@/lib/email/analytics";
import { DeliverabilityAnalyticsView } from "@/components/analytics/DeliverabilityAnalyticsView";
import { Activity } from "lucide-react";

export const metadata = {
  title: "Deliverability Analytics - Internal Mail",
  description: "Live overview of message volumes, delivery rates, bounce taxonomy, and recipient domain health.",
};

async function AnalyticsContent() {
  await connection();
  const metrics = await getDeliverabilityMetrics();
  return <DeliverabilityAnalyticsView initialData={metrics} />;
}

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
          <Activity className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          Deliverability & Analytics Dashboard
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Real-time deliverability performance, bounce taxonomy classification, and recipient domain reputation.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="p-12 text-center text-sm text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
            Loading deliverability analytics...
          </div>
        }
      >
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}

