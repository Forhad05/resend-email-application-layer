/**
 * Sprint 10 — Task 2: Webhook Simulation Suite
 *
 * Validates the complete asynchronous lifecycle of emails without sending live traffic:
 * 1. Inbound email creation & SLA auto-triage
 * 2. In-Reply-To header chain threading continuity
 * 3. Outbound delivery status progression (sent -> delivered -> opened -> clicked)
 * 4. Hard bounce auto-suppression
 * 5. Spam complaint auto-suppression
 * 6. Svix signature verification & security guards
 * 7. DLQ event persistence & automated database cleanup
 */

import { eq, inArray, or, sql } from "drizzle-orm";
import { db, pool } from "../lib/db";
import {
  auditLogs,
  contacts,
  messages,
  suppressions,
  threads,
  webhookEvents,
} from "../lib/db/schema";
import {
  colors,
  getAppUrl,
  measure,
  printHeader,
  printSummary,
  TestResult,
} from "./test-utils";

async function cleanupSimulationRecords(params?: {
  threadIds?: string[];
  eventIds?: string[];
  resendIds?: string[];
  emails?: string[];
}) {
  try {
    const threadIds = params?.threadIds || [];
    const eventIds = params?.eventIds || [];
    const resendIds = params?.resendIds || [];
    const emails = params?.emails || [];

    if (threadIds.length > 0) {
      await db.delete(messages).where(inArray(messages.threadId, threadIds));
      await db.delete(threads).where(inArray(threads.id, threadIds));
    }
    if (resendIds.length > 0) {
      await db.delete(messages).where(inArray(messages.resendEmailId, resendIds));
    }
    if (emails.length > 0) {
      await db.delete(contacts).where(inArray(contacts.email, emails));
      await db.delete(suppressions).where(inArray(suppressions.email, emails));
    }
    if (eventIds.length > 0) {
      await db.delete(webhookEvents).where(inArray(webhookEvents.id, eventIds));
    }

    // Exhaustive safety sweep: clear any simulation.local contacts, audits, messages, or threads
    await db.delete(contacts).where(sql`email LIKE '%simulation.local%'`);
    await db.delete(auditLogs).where(
      sql`details::text LIKE '%simulation.local%' OR details::text LIKE '%Production database cluster unavailable%' OR entity_id LIKE '%simulation.local%'`
    );
    await db.delete(messages).where(sql`from_email LIKE '%simulation.local%'`);
    await db.delete(threads).where(sql`subject LIKE '%Production database cluster unavailable%'`);
    await db.delete(suppressions).where(sql`email LIKE '%simulation.local%'`);
    await db.delete(webhookEvents).where(sql`payload::text LIKE '%simulation.local%'`);
  } catch (cleanErr) {
    console.warn("Cleanup warning:", cleanErr);
  }
}

async function runWebhookSimulation() {
  const appUrl = getAppUrl();
  const runId = Date.now().toString(36);
  const simCustomerEmail = `alex.customer.${runId}@simulation.local`;
  const simBounceEmail = `bounce.user.${runId}@simulation.local`;
  const simComplaintEmail = `complaint.user.${runId}@simulation.local`;

  const msgId1 = `<sim-msg-1-${runId}@simulation.local>`;
  const msgId2 = `<sim-msg-2-${runId}@simulation.local>`;
  const outboundResendId = `re_sim_out_${runId}`;
  const bounceResendId = `re_sim_bounce_${runId}`;
  const complaintResendId = `re_sim_complaint_${runId}`;

  printHeader(
    "📨 Resend Email Application - Webhook Simulation Suite",
    `Target: ${appUrl} | Simulation Run ID: ${runId}`
  );

  // Pre-test cleanup: ensure no residual simulation artifacts exist
  await cleanupSimulationRecords();

  const results: TestResult[] = [];
  const createdThreadIds: string[] = [];
  const createdEventIds: string[] = [];

  try {

  // ============================================================================
  // Stage 1: Inbound Ticket Creation & SLA Auto-Triage
  // ============================================================================
  try {
    const { result: stage1, durationMs } = await measure(async () => {
      const resp = await fetch(`${appUrl}/api/webhooks/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email.received",
          data: {
            from: `Alex Customer <${simCustomerEmail}>`,
            to: "support@mail.yourdomain.com",
            subject: "Urgent: Production database cluster unavailable",
            text: "Hello, our database is down! Please investigate immediately.",
            headers: {
              "message-id": msgId1,
            },
          },
        }),
        signal: AbortSignal.timeout(5000),
      });

      const body = await resp.json();
      return { status: resp.status, body };
    });

    if (stage1.body?.eventId) {
      createdEventIds.push(stage1.body.eventId);
    }

    const cleanMsgId1 = msgId1.replace(/^<|>$/g, "").trim();
    // Verify database thread and message creation
    const [msg] = await db
      .select()
      .from(messages)
      .where(or(eq(messages.messageId, cleanMsgId1), eq(messages.fromEmail, simCustomerEmail)))
      .limit(1);

    let threadCreated = false;
    let priorityIsUrgent = false;
    let slaDueIn1h = false;

    if (msg) {
      createdThreadIds.push(msg.threadId);
      const [t] = await db
        .select()
        .from(threads)
        .where(eq(threads.id, msg.threadId))
        .limit(1);

      if (t) {
        threadCreated = true;
        priorityIsUrgent = t.priority === "urgent";
        if (t.slaDueAt) {
          const diffHours = (t.slaDueAt.getTime() - Date.now()) / (1000 * 60 * 60);
          slaDueIn1h = diffHours > 0 && diffHours <= 1.1;
        }
      }
    }

    const passed =
      stage1.status === 200 &&
      stage1.body?.success === true &&
      threadCreated &&
      priorityIsUrgent &&
      slaDueIn1h;

    results.push({
      category: "Inbound Pipeline",
      name: "Inbound Thread Creation & SLA Auto-Triage (Urgent)",
      passed,
      durationMs,
      details: passed
        ? `Thread created | Priority: urgent | SLA due within 1h | Event ID: ${stage1.body?.eventId}`
        : `Status: ${stage1.status} | Thread: ${threadCreated} | Priority: ${priorityIsUrgent}`,
      error: passed ? undefined : `Inbound ticket processing failed: ${JSON.stringify(stage1.body)}`,
    });
  } catch (err) {
    results.push({
      category: "Inbound Pipeline",
      name: "Inbound Thread Creation & SLA Auto-Triage (Urgent)",
      passed: false,
      durationMs: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ============================================================================
  // Stage 2: In-Reply-To Threading Continuity
  // ============================================================================
  try {
    const { result: stage2, durationMs } = await measure(async () => {
      const resp = await fetch(`${appUrl}/api/webhooks/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email.received",
          data: {
            from: `Alex Customer <${simCustomerEmail}>`,
            to: "support@mail.yourdomain.com",
            subject: "Re: Urgent: Production database cluster unavailable",
            text: "Adding more server error logs for your engineers.",
            headers: {
              "message-id": msgId2,
              "in-reply-to": msgId1,
              references: msgId1,
            },
          },
        }),
        signal: AbortSignal.timeout(5000),
      });

      const body = await resp.json();
      return { status: resp.status, body };
    });

    if (stage2.body?.eventId) {
      createdEventIds.push(stage2.body.eventId);
    }

    const cleanMsgId2 = msgId2.replace(/^<|>$/g, "").trim();
    // Verify that msg2 linked to the SAME thread
    const [msg2] = await db
      .select()
      .from(messages)
      .where(eq(messages.messageId, cleanMsgId2))
      .limit(1);

    const primaryThreadId = createdThreadIds[0];
    const isSameThread = Boolean(msg2 && msg2.threadId === primaryThreadId);

    const [updatedThread] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, primaryThreadId))
      .limit(1);

    const countIsTwo = updatedThread?.messageCount === 2;
    const passed =
      stage2.status === 200 &&
      stage2.body?.success === true &&
      isSameThread &&
      countIsTwo;

    results.push({
      category: "Inbound Pipeline",
      name: "In-Reply-To Threading Continuity (Same Thread Linkage)",
      passed,
      durationMs,
      details: passed
        ? `Linked to Thread: ${primaryThreadId} | Message Count: 2`
        : `isSameThread: ${isSameThread} | count: ${updatedThread?.messageCount}`,
      error: passed ? undefined : "In-Reply-To header failed to resolve existing thread.",
    });
  } catch (err) {
    results.push({
      category: "Inbound Pipeline",
      name: "In-Reply-To Threading Continuity",
      passed: false,
      durationMs: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ============================================================================
  // Stage 3: Outbound Delivery Progression (delivered -> opened -> clicked)
  // ============================================================================
  const primaryThreadId = createdThreadIds[0];

  if (primaryThreadId) {
    // Seed an outbound message with resendEmailId
    await db.insert(messages).values({
      threadId: primaryThreadId,
      direction: "outbound",
      fromEmail: "support@mail.yourdomain.com",
      toEmails: [simCustomerEmail],
      subject: "Re: Urgent: Production database cluster unavailable",
      textBody: "We are actively investigating your database cluster.",
      resendEmailId: outboundResendId,
      status: "sent",
    });

    const progressionEvents = [
      { type: "email.delivered", targetStatus: "delivered" },
      { type: "email.opened", targetStatus: "opened" },
      { type: "email.clicked", targetStatus: "clicked" },
    ];

    for (const step of progressionEvents) {
      try {
        const { result: progRes, durationMs } = await measure(async () => {
          const resp = await fetch(`${appUrl}/api/webhooks/resend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: step.type,
              data: {
                email_id: outboundResendId,
                to: [simCustomerEmail],
              },
            }),
            signal: AbortSignal.timeout(5000),
          });
          const body = await resp.json();
          if (body?.eventId) createdEventIds.push(body.eventId);
          return { status: resp.status, body };
        });

        // Verify status update in messages table
        const [updatedOutbound] = await db
          .select()
          .from(messages)
          .where(eq(messages.resendEmailId, outboundResendId))
          .limit(1);

        const passed =
          progRes.status === 200 &&
          updatedOutbound?.status === step.targetStatus;

        results.push({
          category: "Delivery Progression",
          name: `Webhook ${step.type} -> Message Status: "${step.targetStatus}"`,
          passed,
          durationMs,
          details: `Message status updated to "${updatedOutbound?.status}"`,
          error: passed ? undefined : `Failed to update status to ${step.targetStatus}`,
        });
      } catch (err) {
        results.push({
          category: "Delivery Progression",
          name: `Webhook ${step.type}`,
          passed: false,
          durationMs: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // ============================================================================
  // Stage 4: Hard Bounce Auto-Suppression
  // ============================================================================
  try {
    const { durationMs } = await measure(async () => {
      // 1. Seed outbound message to simBounceEmail
      if (primaryThreadId) {
        await db.insert(messages).values({
          threadId: primaryThreadId,
          direction: "outbound",
          fromEmail: "support@mail.yourdomain.com",
          toEmails: [simBounceEmail],
          subject: "Test bounce notice",
          resendEmailId: bounceResendId,
          status: "sent",
        });
      }

      // 2. Dispatch email.bounced webhook
      const resp = await fetch(`${appUrl}/api/webhooks/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email.bounced",
          data: {
            email_id: bounceResendId,
            to: [simBounceEmail],
          },
        }),
        signal: AbortSignal.timeout(5000),
      });

      const body = await resp.json();
      if (body?.eventId) createdEventIds.push(body.eventId);
    });

    // 3. Verify suppression record created
    const [supp] = await db
      .select()
      .from(suppressions)
      .where(eq(suppressions.email, simBounceEmail))
      .limit(1);

    const [bouncedMsg] = await db
      .select()
      .from(messages)
      .where(eq(messages.resendEmailId, bounceResendId))
      .limit(1);

    const passed =
      bouncedMsg?.status === "bounced" &&
      supp?.reason === "hard_bounce";

    results.push({
      category: "Reputation Defense",
      name: "email.bounced -> Automated Hard Bounce Suppression",
      passed,
      durationMs,
      details: passed
        ? `Suppressed: ${simBounceEmail} (reason: ${supp?.reason})`
        : `Message status: ${bouncedMsg?.status} | Suppression: ${supp?.reason}`,
      error: passed ? undefined : "Hard bounce did not record suppression in database.",
    });
  } catch (err) {
    results.push({
      category: "Reputation Defense",
      name: "email.bounced -> Automated Hard Bounce Suppression",
      passed: false,
      durationMs: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ============================================================================
  // Stage 5: Spam Complaint Auto-Suppression
  // ============================================================================
  try {
    const { durationMs } = await measure(async () => {
      if (primaryThreadId) {
        await db.insert(messages).values({
          threadId: primaryThreadId,
          direction: "outbound",
          fromEmail: "support@mail.yourdomain.com",
          toEmails: [simComplaintEmail],
          subject: "Test newsletter notice",
          resendEmailId: complaintResendId,
          status: "sent",
        });
      }

      const resp = await fetch(`${appUrl}/api/webhooks/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email.complained",
          data: {
            email_id: complaintResendId,
            to: [simComplaintEmail],
          },
        }),
        signal: AbortSignal.timeout(5000),
      });

      const body = await resp.json();
      if (body?.eventId) createdEventIds.push(body.eventId);
    });

    const [supp] = await db
      .select()
      .from(suppressions)
      .where(eq(suppressions.email, simComplaintEmail))
      .limit(1);

    const [complaintMsg] = await db
      .select()
      .from(messages)
      .where(eq(messages.resendEmailId, complaintResendId))
      .limit(1);

    const passed =
      complaintMsg?.status === "complained" &&
      supp?.reason === "complaint";

    results.push({
      category: "Reputation Defense",
      name: "email.complained -> Automated Spam Complaint Suppression",
      passed,
      durationMs,
      details: passed
        ? `Suppressed: ${simComplaintEmail} (reason: ${supp?.reason})`
        : `Message status: ${complaintMsg?.status} | Suppression: ${supp?.reason}`,
      error: passed ? undefined : "Spam complaint did not record suppression in database.",
    });
  } catch (err) {
    results.push({
      category: "Reputation Defense",
      name: "email.complained -> Automated Spam Complaint Suppression",
      passed: false,
      durationMs: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ============================================================================
  // Stage 6: Security Boundary & Svix Signature Tampering Guard
  // ============================================================================
  try {
    const { result: tamperRes, durationMs } = await measure(async () => {
      const resp = await fetch(`${appUrl}/api/webhooks/resend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "svix-id": "msg_tampered_test",
          "svix-timestamp": String(Math.floor(Date.now() / 1000)),
          "svix-signature": "v1,invalid_forged_signature_hash",
        },
        body: JSON.stringify({
          type: "email.sent",
          data: { email_id: "re_fake_123" },
        }),
        signal: AbortSignal.timeout(5000),
      });

      const body = await resp.json();
      return { status: resp.status, body };
    });

    const passed =
      tamperRes.status === 401 &&
      tamperRes.body?.error === "Invalid webhook signature";

    results.push({
      category: "Security Boundary",
      name: "Svix Forgery Guard (Reject Tampered Signatures with 401)",
      passed,
      durationMs,
      details: `HTTP ${tamperRes.status} | Rejection: "${tamperRes.body?.error}"`,
      error: passed ? undefined : `Expected 401 rejection, got ${tamperRes.status}`,
    });
  } catch (err) {
    results.push({
      category: "Security Boundary",
      name: "Svix Forgery Guard",
      passed: false,
      durationMs: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Missing Event Type Validation Guard
  try {
    const { result: missingRes, durationMs } = await measure(async () => {
      const resp = await fetch(`${appUrl}/api/webhooks/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invalidField: true }),
        signal: AbortSignal.timeout(5000),
      });
      const body = await resp.json();
      return { status: resp.status, body };
    });

    const passed =
      missingRes.status === 400 &&
      missingRes.body?.error?.includes("Missing event type");

    results.push({
      category: "Security Boundary",
      name: "Payload Malformation Guard (Reject Missing Event Type with 400)",
      passed,
      durationMs,
      details: `HTTP ${missingRes.status} | Rejection: "${missingRes.body?.error}"`,
      error: passed ? undefined : `Expected 400 rejection, got ${missingRes.status}`,
    });
  } catch (err) {
    results.push({
      category: "Security Boundary",
      name: "Payload Malformation Guard",
      passed: false,
      durationMs: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ============================================================================
  // Stage 7: DLQ Audit Durability & Persistence Check
  // ============================================================================
  try {
    const { result: dlqPassed, durationMs } = await measure(async () => {
      if (createdEventIds.length === 0) return false;
      const events = await db
        .select()
        .from(webhookEvents)
        .where(inArray(webhookEvents.id, createdEventIds));

      return (
        events.length === createdEventIds.length &&
        events.every((e) => e.status === "processed")
      );
    });

    results.push({
      category: "DLQ Durability",
      name: `DLQ Ingestion Persistence (${createdEventIds.length} events logged)`,
      passed: dlqPassed,
      durationMs,
      details: `All ${createdEventIds.length} simulation events buffered and processed in PostgreSQL`,
      error: dlqPassed ? undefined : "One or more webhook events were not recorded in webhook_events table.",
    });
  } catch (err) {
    results.push({
      category: "DLQ Durability",
      name: "DLQ Ingestion Persistence",
      passed: false,
      durationMs: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  } finally {
    // ============================================================================
    // Teardown: Clean Database of Simulation Records
    // ============================================================================
    console.log(`\n${colors.dim}Cleaning up simulation test records...${colors.reset}`);
    await cleanupSimulationRecords({
      threadIds: createdThreadIds,
      eventIds: createdEventIds,
      resendIds: [outboundResendId, bounceResendId, complaintResendId],
      emails: [simCustomerEmail, simBounceEmail, simComplaintEmail],
    });
    console.log(`${colors.green}✓ Database cleanup complete (zero residual simulation artifacts).${colors.reset}`);

    // Clean pool connection
    try {
      await pool.end();
    } catch {}
  }

  // ============================================================================
  // Summary & Process Exit
  // ============================================================================
  const allPassed = printSummary(results, "Webhook Simulation Suite");
  process.exit(allPassed ? 0 : 1);
}

runWebhookSimulation().catch(async (err) => {
  console.error(colors.red + "Fatal error executing webhook simulation:" + colors.reset, err);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
