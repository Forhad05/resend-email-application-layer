"use server";

import { db } from "@/lib/db";
import { suppressions } from "@/lib/db/schema";
import { eq, desc, sql, ilike, and } from "drizzle-orm";
import { resend } from "@/lib/resend";
import { logAuditEvent } from "@/lib/audit";
import { getServerSession } from "@/lib/auth-session";
import { sanitizeErrorMessage } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export interface SuppressionItem {
  id: string;
  email: string;
  reason: string;
  source: string | null;
  createdAt: Date;
}

export interface SuppressionSummary {
  total: number;
  hardBounces: number;
  complaints: number;
  unsubscribes: number;
  manual: number;
}

/**
 * 1. Fetch filtered suppression list
 */
export async function getSuppressionList(options?: {
  search?: string;
  reason?: string;
  limit?: number;
  offset?: number;
}): Promise<SuppressionItem[]> {
  const { search = "", reason = "all", limit = 100, offset = 0 } = options || {};

  const conditions = [];

  if (search.trim()) {
    conditions.push(ilike(suppressions.email, `%${search.trim().toLowerCase()}%`));
  }

  if (reason !== "all") {
    conditions.push(eq(suppressions.reason, reason));
  }

  const query = db
    .select({
      id: suppressions.id,
      email: suppressions.email,
      reason: suppressions.reason,
      source: suppressions.source,
      createdAt: suppressions.createdAt,
    })
    .from(suppressions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(suppressions.createdAt))
    .limit(limit)
    .offset(offset);

  const rows = await query;
  return rows;
}

/**
 * 2. Fetch summary counts for the suppression management view
 */
export async function getSuppressionSummary(): Promise<SuppressionSummary> {
  const rows = await db
    .select({
      reason: suppressions.reason,
      count: sql<number>`count(*)::int`,
    })
    .from(suppressions)
    .groupBy(suppressions.reason);

  let total = 0;
  let hardBounces = 0;
  let complaints = 0;
  let unsubscribes = 0;
  let manual = 0;

  for (const r of rows) {
    total += r.count;
    if (r.reason === "hard_bounce" || r.reason === "bounce") hardBounces += r.count;
    else if (r.reason === "complaint") complaints += r.count;
    else if (r.reason === "unsubscribe") unsubscribes += r.count;
    else manual += r.count;
  }

  return { total, hardBounces, complaints, unsubscribes, manual };
}

/**
 * 3. Server action: Remove email from suppression list (Unsuppress)
 */
export async function removeSuppressionAction(
  email: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, error: "Unauthorized: Active session required" };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Invalid email address" };
  }

  try {
    // 1. Delete from PostgreSQL database
    await db.delete(suppressions).where(eq(suppressions.email, cleanEmail));

    // 2. Attempt removal from Resend SDK if configured
    try {
      if (
        process.env.RESEND_API_KEY &&
        !process.env.RESEND_API_KEY.startsWith("re_placeholder")
      ) {
        const resendRes = await resend.suppressions.remove(cleanEmail);
        if (resendRes?.error) {
          console.warn("Resend API suppression remove notice:", resendRes.error);
        }
      }
    } catch (resendErr) {
      console.warn("Resend API suppression remove warning (non-fatal):", resendErr);
    }

    // 3. Log audit activity
    await logAuditEvent({
      actor: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      action: "suppression.removed",
      entityType: "suppression",
      entityId: cleanEmail,
      details: {
        removedEmail: cleanEmail,
      },
    });

    try {
      revalidatePath("/settings");
      revalidatePath("/analytics");
      revalidatePath("/inbox");
    } catch {
      // Non-fatal outside request store
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to remove suppression:", err);
    return { success: false, error: sanitizeErrorMessage(err) };
  }
}

/**
 * 4. Server action: Manually add email to suppression list (Block)
 */
export async function addSuppressionAction(
  email: string,
  reason: string = "manual"
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, error: "Unauthorized: Active session required" };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes("@")) {
    return { success: false, error: "Invalid email address" };
  }

  try {
    // 1. Upsert to PostgreSQL
    await db
      .insert(suppressions)
      .values({
        email: cleanEmail,
        reason,
        source: `manual_by_${session.user.email || session.user.id}`,
      })
      .onConflictDoUpdate({
        target: suppressions.email,
        set: {
          reason,
          source: `manual_by_${session.user.email || session.user.id}`,
          createdAt: new Date(),
        },
      });

    // 2. Attempt addition to Resend SDK if configured
    try {
      if (
        process.env.RESEND_API_KEY &&
        !process.env.RESEND_API_KEY.startsWith("re_placeholder")
      ) {
        const resendRes = await resend.suppressions.add({
          email: cleanEmail,
        });
        if (resendRes?.error) {
          console.warn("Resend API suppression add notice:", resendRes.error);
        }
      }
    } catch (resendErr) {
      console.warn("Resend API suppression add warning (non-fatal):", resendErr);
    }

    // 3. Log audit activity
    await logAuditEvent({
      actor: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      action: "suppression.added",
      entityType: "suppression",
      entityId: cleanEmail,
      details: {
        addedEmail: cleanEmail,
        reason,
      },
    });

    try {
      revalidatePath("/settings");
      revalidatePath("/analytics");
      revalidatePath("/inbox");
    } catch {
      // Non-fatal
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("Failed to add suppression:", err);
    return { success: false, error: sanitizeErrorMessage(err) };
  }
}
