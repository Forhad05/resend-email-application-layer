import { db } from "@/lib/db";
import { threads } from "@/lib/db/schema";
import { eq, or, and, lte } from "drizzle-orm";
import { logAuditEvent } from "@/lib/audit";

export * from "./sla-utils";

export interface EscalationSummary {
  escalatedCount: number;
  escalatedThreadIds: string[];
}

/**
 * Scans active tickets, flags breached deadlines, auto-elevates priority, and logs audit events
 */
export async function evaluateAndEscalateBreachedSlas(): Promise<EscalationSummary> {
  const now = new Date();

  // Find open or pending threads whose SLA deadline has passed and are not yet marked breached
  const breachedThreads = await db
    .select({
      id: threads.id,
      subject: threads.subject,
      priority: threads.priority,
      slaDueAt: threads.slaDueAt,
      contactEmail: threads.contactEmail,
    })
    .from(threads)
    .where(
      and(
        or(eq(threads.status, "open"), eq(threads.status, "pending")),
        lte(threads.slaDueAt, now),
        eq(threads.slaBreached, false)
      )
    );

  const escalatedThreadIds: string[] = [];

  for (const t of breachedThreads) {
    let newPriority: "low" | "normal" | "high" | "urgent" = "urgent";
    if (t.priority === "low") newPriority = "normal";
    else if (t.priority === "normal") newPriority = "high";
    else if (t.priority === "high" || t.priority === "urgent") newPriority = "urgent";

    const overdueMinutes = t.slaDueAt
      ? Math.round((now.getTime() - new Date(t.slaDueAt).getTime()) / (1000 * 60))
      : 0;

    await db
      .update(threads)
      .set({
        slaBreached: true,
        priority: newPriority,
        updatedAt: now,
      })
      .where(eq(threads.id, t.id));

    escalatedThreadIds.push(t.id);

    // Audit log escalation event
    await logAuditEvent({
      actor: {
        id: "system",
        name: "SLA Escalation Engine",
        email: "system@internal",
      },
      action: "sla.breached",
      entityType: "thread",
      entityId: t.id,
      details: {
        subject: t.subject,
        oldPriority: t.priority,
        newPriority,
        overdueMinutes,
        contactEmail: t.contactEmail,
      },
    });
  }

  return {
    escalatedCount: escalatedThreadIds.length,
    escalatedThreadIds,
  };
}
