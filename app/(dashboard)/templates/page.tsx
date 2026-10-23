import { Suspense } from "react";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { FileText, Plus } from "lucide-react";

async function TemplateList() {
  const templateList = await db.select().from(templates);

  if (templateList.length === 0) {
    return (
      <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
          <FileText className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          No templates configured
        </h3>
        <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
          You can create templates for order receipts, password resets, and
          frequent support replies.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templateList.map((tpl) => (
        <div
          key={tpl.id}
          className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-zinc-900 shadow-sm"
        >
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
            {tpl.name}
          </h3>
          <p className="text-xs text-zinc-500 mt-1">{tpl.description}</p>
        </div>
      ))}
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Email Templates
          </h1>
          <p className="text-sm text-zinc-500">
            Manage reusable templates for transactional and support messages.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" />
          <span>New Template</span>
        </button>
      </div>

      <Suspense
        fallback={
          <div className="p-12 text-center text-sm text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
            Loading templates...
          </div>
        }
      >
        <TemplateList />
      </Suspense>
    </div>
  );
}

