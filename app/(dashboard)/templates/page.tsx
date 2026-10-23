import { Suspense } from "react";
import { getTemplates } from "@/lib/email/templates";
import { TemplatesView } from "@/components/templates/TemplatesView";

async function TemplateLoader() {
  const templateList = await getTemplates();
  return <TemplatesView initialTemplates={templateList} />;
}

export default function TemplatesPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Suspense
        fallback={
          <div className="p-12 text-center text-sm text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
            Loading email templates...
          </div>
        }
      >
        <TemplateLoader />
      </Suspense>
    </div>
  );
}
