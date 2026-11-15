"use server";

import { db } from "@/lib/db";
import { webhookEvents, WebhookEvent } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import {
  handleInboundEmail,
  handleDeliveryEvent,
  ResendInboundPayload,
} from "@/lib/email/inbound";
import { logAuditEvent } from "@/lib/audit";
import { getServerSession } from "@/lib/auth-session";
import { revalidatePath } from "next/cache";
import { sanitizeErrorMessage } from "@/lib/utils";

export interface RecordWebhookParams {
  svixId?: string | null;
  eventType: string;
  payload: Record<string, unknown>;
}

/**
 * 1. Persists an incoming verified webhook payload to PostgreSQL before execution
 */
export async function recordWebhookEvent({
  svixId,
  eventType,
  payload,
}: RecordWebhookParams): Promise<WebhookEvent> {
  const [created] = await db
    .insert(webhookEvents)
    .values({
      svixId: svixId || null,
      eventType,
      payload,
      status: "pending",
      retryCount: 0,
      maxRetries: 3,
    })
    .returning();

  return created;
}

/**
 * 2. Executes the payload through the appropriate business processor,
 * updating status to 'processed', 'failed', or 'dead_letter' on error.
 */
export async function dispatchWebhookEvent(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const [event] = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.id, eventId))
    .limit(1);

  if (!event) {
    return { success: false, error: "Webhook event not found" };
  }

  const rawPayload = event.payload as Record<string, unknown>;
  const eventType = event.eventType;
  const eventData = (rawPayload.data || rawPayload) as Record<string, unknown>;

  try {
    switch (eventType) {
      case "email.received":
        await handleInboundEmail(eventData as unknown as ResendInboundPayload);
        break;

      case "email.sent":
      case "email.delivered":
      case "email.bounced":
      case "email.complained":
      case "email.opened":
      case "email.clicked":
        await handleDeliveryEvent(
          eventType,
          eventData as { email_id?: string; to?: string | string[] }
        );
        break;

      default:
        console.warn(`Unrecognized webhook event type: ${eventType}`);
    }

    // Mark successfully processed
    await db
      .update(webhookEvents)
      .set({
        status: "processed",
        processedAt: new Date(),
        updatedAt: new Date(),
        lastError: null,
      })
      .where(eq(webhookEvents.id, eventId));

    return { success: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const nextRetryCount = event.retryCount + 1;
    const isDeadLetter = nextRetryCount >= event.maxRetries;
    const nextStatus = isDeadLetter ? "dead_letter" : "failed";

    await db
      .update(webhookEvents)
      .set({
        status: nextStatus,
        retryCount: nextRetryCount,
        lastError: errorMsg,
        updatedAt: new Date(),
      })
      .where(eq(webhookEvents.id, eventId));

    await logAuditEvent({
      action: isDeadLetter ? "webhook.dead_letter" : "webhook.failed",
      entityType: "webhook_event",
      entityId: eventId,
      details: {
        eventType,
        svixId: event.svixId,
        retryCount: nextRetryCount,
        maxRetries: event.maxRetries,
        error: errorMsg,
      },
    });

    console.error(
      `Webhook dispatch error [${eventId}] (${nextStatus}, attempt ${nextRetryCount}/${event.maxRetries}):`,
      errorMsg
    );

    return { success: false, error: errorMsg };
  }
}

/**
 * 3. Server action for operators to manually retry a failed/dead-letter event from the dashboard
 */
export async function replayWebhookEventAction(
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession();
  if (!session?.user) {
    return { success: false, error: "Unauthorized: Active session required" };
  }

  // Reset event to pending and trigger dispatch
  await db
    .update(webhookEvents)
    .set({
      status: "pending",
      updatedAt: new Date(),
    })
    .where(eq(webhookEvents.id, eventId));

  const result = await dispatchWebhookEvent(eventId);

  await logAuditEvent({
    actor: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
    action: "webhook.replayed",
    entityType: "webhook_event",
    entityId: eventId,
    details: {
      success: result.success,
      error: result.error ? sanitizeErrorMessage(result.error) : undefined,
    },
  });

  try {
    revalidatePath("/audit");
  } catch {
    // Non-fatal outside request store
  }

  return {
    success: result.success,
    error: result.success
      ? undefined
      : result.error
      ? sanitizeErrorMessage(result.error)
      : "Failed to dispatch webhook event",
  };
}

/**
 * 4. Fetch list of webhook events (e.g. DLQ and failed events)
 */
export async function getWebhookEvents(options: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<WebhookEvent[]> {
  const { status, limit = 50, offset = 0 } = options;

  let query = db.select().from(webhookEvents).$dynamic();

  if (status && status !== "all") {
    query = query.where(eq(webhookEvents.status, status));
  }

  const results = await query
    .orderBy(desc(webhookEvents.createdAt))
    .limit(limit)
    .offset(offset);

  return results;
}

/**
 * 5. Fetch aggregation statistics for Webhook / DLQ Dashboard
 */
export async function getWebhookEventStats(): Promise<{
  total: number;
  processed: number;
  failed: number;
  deadLetter: number;
}> {
  const rows = await db
    .select({
      status: webhookEvents.status,
      count: sql<number>`count(*)::int`,
    })
    .from(webhookEvents)
    .groupBy(webhookEvents.status);

  let total = 0;
  let processed = 0;
  let failed = 0;
  let deadLetter = 0;

  for (const r of rows) {
    total += r.count;
    if (r.status === "processed") processed = r.count;
    else if (r.status === "failed") failed = r.count;
    else if (r.status === "dead_letter") deadLetter = r.count;
  }

  return { total, processed, failed, deadLetter };
}
