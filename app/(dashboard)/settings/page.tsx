import { Settings, Shield, Server, Key } from "lucide-react";

export default function SettingsPage() {
  const hasResendKey =
    !!process.env.RESEND_API_KEY &&
    !process.env.RESEND_API_KEY.startsWith("re_placeholder");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Settings & Environment
        </h1>
        <p className="text-sm text-zinc-500">
          Configuration overview for your Resend integration and PostgreSQL database.
        </p>
      </div>

      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        {/* Resend Status */}
        <div className="p-6 flex items-start gap-4">
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
                {hasResendKey ? "Configured" : "Placeholder / Missing"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Set in your <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">.env.local</code> file under <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">RESEND_API_KEY</code>.
            </p>
          </div>
        </div>

        {/* Database Status */}
        <div className="p-6 flex items-start gap-4">
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
              Docker container <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">email-tool-postgres</code> running on port 5432.
            </p>
          </div>
        </div>

        {/* Security & Auth */}
        <div className="p-6 flex items-start gap-4">
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
  );
}

