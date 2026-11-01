import { db } from "@/lib/db";
import { senderIdentities } from "@/lib/db/schema";
import { resend } from "@/lib/resend";
import { asc, eq } from "drizzle-orm";
import { connection } from "next/server";

export async function getSenderIdentities() {
  await connection();
  try {
    const existing = await db
      .select()
      .from(senderIdentities)
      .orderBy(asc(senderIdentities.name));

    if (existing.length > 0) {
      return existing;
    }

    // Auto-seed default sender identities from verified Resend domains
    const domains = await getResendDomains();
    const primaryDomain =
      domains.find((d) => d.sendingEnabled)?.name ||
      domains[0]?.name ||
      "mail.systemdevify.com";
    const secondaryDomain =
      domains.find((d) => d.name !== primaryDomain)?.name ||
      "outbound.systemdevify.com";

    const seeds = [
      {
        name: "Support",
        email: `support@${primaryDomain}`.toLowerCase(),
        domain: primaryDomain,
        isDefault: true,
      },
      {
        name: "Contracts",
        email: `contracts@${primaryDomain}`.toLowerCase(),
        domain: primaryDomain,
        isDefault: false,
      },
      {
        name: "Billing",
        email: `billing@${primaryDomain}`.toLowerCase(),
        domain: primaryDomain,
        isDefault: false,
      },
      {
        name: "Security",
        email: `security@${primaryDomain}`.toLowerCase(),
        domain: primaryDomain,
        isDefault: false,
      },
      {
        name: "Outbound",
        email: `hello@${secondaryDomain}`.toLowerCase(),
        domain: secondaryDomain,
        isDefault: false,
      },
      {
        name: "Audit",
        email: `audit@${secondaryDomain}`.toLowerCase(),
        domain: secondaryDomain,
        isDefault: false,
      },
    ];

    for (const seed of seeds) {
      await db
        .insert(senderIdentities)
        .values(seed)
        .onConflictDoNothing();
    }

    return await db
      .select()
      .from(senderIdentities)
      .orderBy(asc(senderIdentities.name));
  } catch (err) {
    console.error("Failed to load or seed sender identities:", err);
    return [];
  }
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

