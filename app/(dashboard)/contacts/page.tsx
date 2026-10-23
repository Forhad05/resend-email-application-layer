import { Suspense } from "react";
import { db } from "@/lib/db";
import { contacts, threads } from "@/lib/db/schema";
import { desc, count } from "drizzle-orm";
import { ContactsView, ContactData } from "@/components/contacts/ContactsView";

async function ContactList() {
  const [contactList, threadCounts] = await Promise.all([
    db
      .select({
        id: contacts.id,
        email: contacts.email,
        name: contacts.name,
        company: contacts.company,
        phone: contacts.phone,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .orderBy(desc(contacts.createdAt))
      .limit(100),
    db
      .select({
        contactEmail: threads.contactEmail,
        count: count(threads.id),
      })
      .from(threads)
      .groupBy(threads.contactEmail),
  ]);

  const countMap = new Map<string, number>();
  for (const tc of threadCounts) {
    countMap.set(tc.contactEmail.toLowerCase(), Number(tc.count));
  }

  const enhancedContacts: ContactData[] = contactList.map((c) => ({
    ...c,
    threadCount: countMap.get(c.email.toLowerCase()) || 0,
  }));

  return <ContactsView contacts={enhancedContacts} />;
}

export default function ContactsPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Contacts & CRM
        </h1>
        <p className="text-sm text-zinc-500">
          Customer profiles, message histories, and organization details recorded across conversations.
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
