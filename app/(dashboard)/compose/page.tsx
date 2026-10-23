import { Suspense } from "react";
import { getSenderIdentities } from "@/lib/email/senders";
import { getTemplates } from "@/lib/email/templates";
import { ComposeForm } from "./ComposeForm";
import { Loader2 } from "lucide-react";
import { connection } from "next/server";

async function ComposeContent() {
  await connection();
  const [senders, templates] = await Promise.all([
    getSenderIdentities(),
    getTemplates(),
  ]);
  return <ComposeForm senders={senders} templates={templates} />;
}

export default function ComposePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto py-12 flex flex-col items-center justify-center text-zinc-500 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          <p className="text-sm">Loading sender identities...</p>
        </div>
      }
    >
      <ComposeContent />
    </Suspense>
  );
}
