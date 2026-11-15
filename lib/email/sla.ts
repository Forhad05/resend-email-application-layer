import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { logAuditEvent } from "@/lib/audit";

export * from "./sla-utils";

export interface EscalationSummary {
  escalatedCount: number;
  escalatedThreadIds: string[];
}

/**
 * Scans active tickets, flags breached deadlines, auto-elevates priority atomically, and logs audit events.
 * Uses atomic CTE with FOR UPDATE SKIP LOCKED to prevent race conditions and pool starvation.
 */
export async function evaluateAndEscalateBreachedSlas(
  limitCount: number = 25
): Promise<EscalationSummary> {
  const now = new Date();

  // Atomic batch escalation using CTE and FOR UPDATE SKIP LOCKED
  const result = await db.execute<{
    id: string;
    subject: string;
    priority: string;
    old_priority: string;
    sla_due_at: Date | string | null;
    contact_email: string;
  }>(sql`
    WITH to_escalate AS (
      SELECT id, priority, sla_due_at, subject, contact_email
      FROM threads
      WHERE (status = 'open' OR status = 'pending')
        AND sla_due_at <= ${now}
        AND sla_breached = false
      ORDER BY sla_due_at ASC
      LIMIT ${limitCount}
      FOR UPDATE SKIP LOCKED
    ),
    updated AS (
      UPDATE threads t
      SET 
        sla_breached = true,
        priority = CASE 
          WHEN t.priority = 'low' THEN 'normal'
          WHEN t.priority = 'normal' THEN 'high'
          ELSE 'urgent'
        END,
        updated_at = ${now}
      FROM to_escalate te
      WHERE t.id = te.id
      RETURNING t.id, t.subject, t.priority, te.priority AS old_priority, te.sla_due_at, t.contact_email
    )
    SELECT * FROM updated;
  `);

  const escalatedRows = result.rows || [];
  const escalatedThreadIds = escalatedRows.map((r) => r.id);

  for (const r of escalatedRows) {
    const overdueMinutes = r.sla_due_at
      ? Math.round((now.getTime() - new Date(r.sla_due_at).getTime()) / (1000 * 60))
      : 0;

    await logAuditEvent({
      actor: {
        id: "system",
        name: "SLA Escalation Engine",
        email: "system@internal",
      },
      action: "sla.breached",
      entityType: "thread",
      entityId: r.id,
      details: {
        subject: r.subject,
        oldPriority: r.old_priority,
        newPriority: r.priority,
        overdueMinutes,
        contactEmail: r.contact_email,
      },
    }).catch((err) => console.warn("Failed to log SLA audit event:", err));
  }

  return {
    escalatedCount: escalatedThreadIds.length,
    escalatedThreadIds,
  };
}
