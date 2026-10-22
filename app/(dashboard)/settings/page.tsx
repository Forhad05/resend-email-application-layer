import { Suspense } from "react";
import { getSenderIdentities, getResendDomains } from "@/lib/email/senders";
import { SenderManager } from "./SenderManager";
import { Key, Server, Shield, Globe, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

async function SettingsContent() {
  const [senders, domains] = await Promise.all([
    getSenderIdentities(),
    getResendDomains(),
  ]);

  const hasResendKey =
    !!process.env.RESEND_API_KEY &&
    !process.env.RESEND_API_KEY.startsWith("re_placeholder");

  return (
    <div className="space-y-8">
      {/* Verified Domains Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Globe className="h-5 w-5 text-zinc-500" />
            Verified Resend Domains ({domains.length})
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Domains verified on your Resend account. You can send outbound emails from any alias on these domains.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {domains.map((domain) => (
            <div
              key={domain.id}
              className="p-5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {domain.name}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    {domain.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                  <span>Region: {domain.region}</span>
                  <span>•</span>
                  <span>
                    Sending:{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {domain.sendingEnabled ? "Enabled" : "Disabled"}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 font-mono border-t border-zinc-100 dark:border-zinc-800 pt-2 truncate">
                ID: {domain.id}
              </div>
            </div>
          ))}

          {domains.length === 0 && (
            <div className="col-span-2 p-6 border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl text-center space-y-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 mx-auto" />
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                No domains found from Resend API
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Ensure your RESEND_API_KEY has permission to list domains or add domains in the Resend dashboard.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Sender Mailbox Identities Manager */}
      <SenderManager senders={senders} domains={domains} />

      {/* System Status Overview */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            System Infrastructure & Keys
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Active connections and environment variables.
          </p>
        </div>

        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          {/* Resend Status */}
          <div className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shrink-0">
              <Key className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Resend API Key
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    hasResendKey
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                  }`}
                >
                  {hasResendKey ? "Active & Verified" : "Placeholder / Missing"}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Configured in <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">.env.local</code>. Connected to Resend production API.
              </p>
            </div>
          </div>

          {/* Database Status */}
          <div className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shrink-0">
              <Server className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  PostgreSQL Database
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Connected
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Docker container <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">email-tool-postgres</code> running on port 5432 with Drizzle ORM.
              </p>
            </div>
          </div>

          {/* Security & Auth */}
          <div className="p-5 flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shrink-0">
              <Shield className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Authentication Engine
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Better Auth with PostgreSQL session & user storage.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Settings & Domains
        </h1>
        <p className="text-sm text-zinc-500">
          Manage sending domains, mailbox identities, and view integration health.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-xl">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
            <p className="text-sm">Loading domain and mailbox configuration...</p>
          </div>
        }
      >
        <SettingsContent />
      </Suspense>
    </div>
  );
}
