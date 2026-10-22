import { Suspense } from "react";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Users, Mail } from "lucide-react";

async function ContactList() {
  const contactList = await db
    .select()
    .from(contacts)
    .orderBy(desc(contacts.createdAt))
    .limit(50);

  if (contactList.length === 0) {
    return (
      <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
          <Users className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          No contacts recorded
        </h3>
        <p className="text-sm text-zinc-500 max-w-sm mx-auto mt-1">
          Contacts are automatically added when you send an email or receive an inbound message.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
      {contactList.map((c) => (
        <div
          key={c.id}
          className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {c.name ? c.name[0].toUpperCase() : c.email[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {c.name || "Customer"}
              </p>
              <p className="text-xs text-zinc-500 flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span>{c.email}</span>
              </p>
            </div>
          </div>
          <span className="text-xs text-zinc-400">
            Added {c.createdAt.toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ContactsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Contacts
        </h1>
        <p className="text-sm text-zinc-500">
          Customers and recipients recorded from your email conversations.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="p-12 text-center text-sm text-zinc-500 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900">
            Loading contacts...
          </div>
        }
      >
        <ContactList />
      </Suspense>
    </div>
  );
}
