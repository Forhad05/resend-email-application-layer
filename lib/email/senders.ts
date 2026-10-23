import { db } from "@/lib/db";
import { senderIdentities } from "@/lib/db/schema";
import { resend } from "@/lib/resend";
import { asc, eq } from "drizzle-orm";
import { connection } from "next/server";

export async function getSenderIdentities() {
  await connection();
  return await db
    .select()
    .from(senderIdentities)
    .orderBy(asc(senderIdentities.name));
}

export async function getResendDomains() {
  try {
    const res = await resend.domains.list();
    if (res.data?.data) {
      return res.data.data.map((d) => ({
        id: d.id,
        name: d.name,
        status: d.status,
        region: d.region,
        sendingEnabled: d.capabilities?.sending === "enabled",
      }));
    }
    return [];
  } catch (err) {
    console.error("Failed to fetch domains from Resend:", err);
    return [];
  }
}

export async function createSenderIdentity({
  name,
  email,
  domain,
  isDefault = false,
}: {
  name: string;
  email: string;
  domain: string;
  isDefault?: boolean;
}) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanDomain = domain.trim().toLowerCase();

  if (isDefault) {
    // Unset existing defaults
    await db.update(senderIdentities).set({ isDefault: false });
  }

  const [created] = await db
    .insert(senderIdentities)
    .values({
      name: cleanName,
      email: cleanEmail,
      domain: cleanDomain,
      isDefault: isDefault,
    })
    .onConflictDoUpdate({
      target: senderIdentities.email,
      set: {
        name: cleanName,
        domain: cleanDomain,
        isDefault: isDefault,
        updatedAt: new Date(),
      },
    })
    .returning();

  return created;
}

export async function deleteSenderIdentity(id: string) {
  await db.delete(senderIdentities).where(eq(senderIdentities.id, id));
}

export async function setDefaultSenderIdentity(id: string) {
  await db.update(senderIdentities).set({ isDefault: false });
  await db
    .update(senderIdentities)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(eq(senderIdentities.id, id));
}

