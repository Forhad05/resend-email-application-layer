import { db } from "@/lib/db";
import { auditLogs, user } from "@/lib/db/schema";
import { getServerSession } from "@/lib/auth-session";
import { eq, desc, and } from "drizzle-orm";

export type AuditActionType =
  | "thread.status_updated"
  | "thread.priority_updated"
  | "thread.assigned"
  | "thread.reply_sent"
  | "thread.note_added"
  | "thread.created"
  | "template.created"
  | "template.updated"
  | "template.deleted"
  | "sender.created"
  | "sender.updated"
  | "sender.deleted"
  | "suppression.added"
  | "suppression.removed"
  | "transactional.sent"
  | "auth.login"
  | "auth.signup"
  | (string & {});

export type AuditEntityType =
  | "thread"
  | "message"
  | "template"
  | "sender_identity"
  | "suppression"
  | "contact"
  | "user"
  | "system"
  | (string & {});

export interface LogAuditOptions {
  actor?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
  };
  action: AuditActionType;
  entityType: AuditEntityType;
  entityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Non-blocking, fail-safe audit logger.
 * Captures user/agent mutations and system events with rich diffs.
 */
export async function logAuditEvent(options: LogAuditOptions): Promise<void> {
  try {
    let actorId = options.actor?.id || null;
    let actorName = options.actor?.name || null;
    let actorEmail = options.actor?.email || null;

    // If actor is omitted, attempt to retrieve current server session
    if (!actorId) {
      try {
        const session = await getServerSession();
        if (session?.user) {
          actorId = session.user.id;
          actorName = session.user.name || null;
          actorEmail = session.user.email || null;
        }
      } catch {
        // Fallback silently if outside request context
      }
    }

    await db.insert(auditLogs).values({
      actorId,
      actorName: actorName || "System",
      actorEmail: actorEmail || null,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      details: options.details || {},
      ipAddress: options.ipAddress || null,
      userAgent: options.userAgent || null,
    });
  } catch (err: unknown) {
    // Fail-safe: Audit logging should never break user mutations
    console.error("[AuditLog] Failed to record audit event:", err);
  }
}

/**
 * Fetches audit log events specific to a thread (status changes, assignments, notes, replies)
 */
export async function getThreadAuditLogs(threadId: string) {
  try {
    const logs = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        actorId: auditLogs.actorId,
        actorName: auditLogs.actorName,
        actorEmail: auditLogs.actorEmail,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.entityType, "thread"),
          eq(auditLogs.entityId, threadId)
        )
      )
      .orderBy(desc(auditLogs.createdAt));

    return logs;
  } catch (err: unknown) {
    console.error("[AuditLog] Failed to fetch thread audit logs:", err);
    return [];
  }
}

export interface GetAuditLogsParams {
  entityType?: string;
  action?: string;
  actorId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetches paginated system audit logs with actor metadata
 */
export async function getAuditLogs(params: GetAuditLogsParams = {}) {
  const { limit = 50, offset = 0 } = params;

  try {
    const query = db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        actorId: auditLogs.actorId,
        actorName: auditLogs.actorName,
        actorEmail: auditLogs.actorEmail,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
        userAvatar: user.image,
      })
      .from(auditLogs)
      .leftJoin(user, eq(auditLogs.actorId, user.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return await query;
  } catch (err: unknown) {
    console.error("[AuditLog] Failed to fetch audit logs:", err);
    return [];
  }
}
