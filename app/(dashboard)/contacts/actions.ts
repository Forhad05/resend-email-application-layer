"use server";

import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateContactAction(
  contactId: string,
  data: {
    name?: string;
    company?: string;
    phone?: string;
  }
) {
  try {
    await db
      .update(contacts)
      .set({
        name: data.name?.trim() || null,
        company: data.company?.trim() || null,
        phone: data.phone?.trim() || null,
        updatedAt: new Date(),
      })
      .where(eq(contacts.id, contactId));

    revalidatePath("/contacts");
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to update contact:", err);
    return { success: false, error: "Failed to update contact details." };
  }
}

export async function createContactAction(data: {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
}) {
  try {
    const cleanEmail = data.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { success: false, error: "A valid email address is required." };
    }

    await db
      .insert(contacts)
      .values({
        email: cleanEmail,
        name: data.name?.trim() || null,
        company: data.company?.trim() || null,
        phone: data.phone?.trim() || null,
      })
      .onConflictDoNothing();

    revalidatePath("/contacts");
    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to create contact:", err);
    return { success: false, error: "Failed to create contact." };
  }
}

