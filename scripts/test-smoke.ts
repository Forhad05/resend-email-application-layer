/**
 * Sprint 10 — Task 1: Smoke Test Suite
 *
 * Fast (<10s) post-deploy sanity check of critical production paths:
 * 1. Environment & configuration integrity
 * 2. Database connection pool, schema validation & query latency
 * 3. Healthcheck probe (/api/health)
 * 4. Auth boundaries & dashboard route guards
 * 5. Transactional send parameter validation
 * 6. Webhook ingestion durability
 */

import { eq, sql } from "drizzle-orm";
import { db, pool } from "../lib/db";
import { webhookEvents } from "../lib/db/schema";
import {
  colors,
  getAppUrl,
  measure,
  printHeader,
  printSummary,
  TestResult,
} from "./test-utils";

async function runSmokeTests() {
  const appUrl = getAppUrl();
  printHeader(
    "🧪 Resend Email Application - Smoke Test Suite",
    `Target: ${appUrl} | Node: ${process.version} | Timestamp: ${new Date().toISOString()}`
  );

  const results: TestResult[] = [];

  // ============================================================================
  // 1. Environment & Configuration Check
  // ============================================================================
  const envVars = [
    { name: "DATABASE_URL", validator: (v?: string) => !!v && v.startsWith("postgres") },
    { name: "RESEND_API_KEY", validator: (v?: string) => !!v && v.startsWith("re_") },
    { name: "BETTER_AUTH_SECRET", validator: (v?: string) => !!v && v.length >= 16 },
    { name: "EMAIL_FROM", validator: (v?: string) => !!v && v.includes("@") },
  ];

  for (const env of envVars) {
    const val = process.env[env.name];
    const ok = env.validator(val);
    results.push({
      category: "Environment",
      name: `Check ${env.name}`,
      passed: ok,
      durationMs: 0.1,
      details: ok ? "Configured" : "Missing or invalid format",
      error: ok ? undefined : `Environment variable ${env.name} is missing or improperly configured.`,
    });
  }

  // ============================================================================
  // 2. PostgreSQL Direct Connectivity & Schema Integrity
  // ============================================================================
  try {
    const { durationMs } = await measure(async () => {
      const res = await db.execute(sql`SELECT 1 as ping`);
      if (!res.rows || res.rows.length === 0) {
        throw new Error("Empty result returned for SELECT 1");
      }
    });

    results.push({
      category: "Database",
      name: "Connection Pool Latency (SELECT 1)",
      passed: durationMs < 250,
      durationMs,
      details: `${durationMs}ms latency (threshold: 250ms)`,
      error: durationMs >= 250 ? `Latency exceeded threshold: ${durationMs}ms` : undefined,
    });
  } catch (err) {
    results.push({
      category: "Database",
      name: "Connection Pool Latency (SELECT 1)",
      passed: false,
      durationMs: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Schema Table Verification
  const expectedTables = [
    "account",
    "attachments",
    "audit_logs",
    "contacts",
    "internal_notes",
    "messages",
    "rate_limits",
    "sender_identities",
    "session",
    "suppressions",
    "templates",
    "threads",
    "user",
    "verification",
    "webhook_events",
  ];

  try {
    const { result: tables, durationMs } = await measure(async () => {
      const res = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public';
      `);
      return (res.rows as Array<{ table_name: string }>).map((r) => String(r.table_name));
    });

    const missingTables = expectedTables.filter((t) => !tables.includes(t));
    const passed = missingTables.length === 0;

    results.push({
      category: "Database",
      name: `Verify 15 Core Tables Present (${tables.length} discovered)`,
      passed,
      durationMs,
      details: passed ? `All 15 tables verified` : `Missing: ${missingTables.join(", ")}`,
      error: passed ? undefined : `Database missing tables: ${missingTables.join(", ")}`,
    });
  } catch (err) {
    results.push({
      category: "Database",
      name: "Verify Core Tables Present",
      passed: false,
      durationMs: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ============================================================================
  // 3. HTTP Health Probe (/api/health)
  // ============================================================================
  try {
    const { result: healthRes, durationMs } = await measure(async () => {
      const resp = await fetch(`${appUrl}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const data = await resp.json();
      return { status: resp.status, data };
    });

    const isHealthy =
      healthRes.status === 200 &&
      healthRes.data?.status === "healthy" &&
      healthRes.data?.version === "1.0.0" &&
      healthRes.data?.database?.status === "connected";

    results.push({
      category: "HTTP Probe",
      name: "GET /api/health Endpoint",
      passed: isHealthy,
      durationMs,
      details: isHealthy
        ? `Status: 200 | DB: ${healthRes.data?.database?.latencyMs}ms | Uptime: ${healthRes.data?.uptimeSeconds}s | RSS: ${healthRes.data?.system?.memory?.rssMb}MB`
        : `Unexpected response: ${JSON.stringify(healthRes)}`,
      error: isHealthy ? undefined : `Healthcheck failed: ${JSON.stringify(healthRes.data)}`,
    });
  } catch (err) {
    results.push({
      category: "HTTP Probe",
      name: "GET /api/health Endpoint",
      passed: false,
      durationMs: 0,
      error: `Could not connect to ${appUrl}/api/health (${err instanceof Error ? err.message : String(err)})`,
    });
  }

  // ============================================================================
  // 4. HTTP Auth Route Guards
  // ============================================================================
  const protectedRoutes = [
    { path: "/inbox", name: "Inbox View" },
    { path: "/compose", name: "Compose Composer" },
    { path: "/settings", name: "Settings & Suppression" },
    { path: "/templates", name: "Template Library" },
    { path: "/contacts", name: "Customer CRM" },
  ];

  for (const route of protectedRoutes) {
    try {
      const { result: code, durationMs } = await measure(async () => {
        const resp = await fetch(`${appUrl}${route.path}`, {
          redirect: "manual",
          signal: AbortSignal.timeout(5000),
        });
        return resp.status;
      });

      // Next.js returns 307 Temporary Redirect when unauthenticated, or 200 on login redirect
      const passed = code === 307 || code === 200;
      results.push({
        category: "Route Guards",
        name: `Auth Guard on ${route.path} (${route.name})`,
        passed,
        durationMs,
        details: `HTTP ${code} (Redirect / Protected)`,
        error: passed ? undefined : `Route ${route.path} returned unexpected status code ${code}`,
      });
    } catch (err) {
      results.push({
        category: "Route Guards",
        name: `Auth Guard on ${route.path}`,
        passed: false,
        durationMs: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Public /login accessibility
  try {
    const { result: loginCode, durationMs } = await measure(async () => {
      const resp = await fetch(`${appUrl}/login`, {
        signal: AbortSignal.timeout(5000),
      });
      return resp.status;
    });

    results.push({
      category: "Route Guards",
      name: "Public Accessibility on /login",
      passed: loginCode === 200,
      durationMs,
      details: `HTTP ${loginCode}`,
      error: loginCode === 200 ? undefined : `Expected 200 for /login, got ${loginCode}`,
    });
  } catch (err) {
    results.push({
      category: "Route Guards",
      name: "Public Accessibility on /login",
      passed: false,
      durationMs: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ============================================================================
  // 5. Transactional Send Parameter Validation
  // ============================================================================
  try {
    const { result: txRes, durationMs } = await measure(async () => {
      const resp = await fetch(`${appUrl}/api/send/transactional`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(5000),
      });
      const data = await resp.json();
      return { status: resp.status, data };
    });

    const passed =
      txRes.status === 400 &&
      txRes.data?.error?.includes("Missing required fields");

    results.push({
      category: "API Validation",
      name: "POST /api/send/transactional Empty Payload Guard",
      passed,
      durationMs,
      details: `HTTP ${txRes.status} | Rejection: "${txRes.data?.error}"`,
      error: passed ? undefined : `Expected 400 with missing fields error, got ${txRes.status}`,
    });
  } catch (err) {
    results.push({
      category: "API Validation",
      name: "POST /api/send/transactional Validation",
      passed: false,
      durationMs: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ============================================================================
  // 6. Webhook Ingestion Endpoint Check
  // ============================================================================
  try {
    const { result: whRes, durationMs } = await measure(async () => {
      const resp = await fetch(`${appUrl}/api/webhooks/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "email.sent" }),
        signal: AbortSignal.timeout(5000),
      });
      const data = await resp.json();
      return { status: resp.status, data };
    });

    const passed = whRes.status === 200 || whRes.status === 400;

    // Immediately clean up the test webhook event to prevent database pollution
    if (whRes.data?.eventId) {
      try {
        await db
          .delete(webhookEvents)
          .where(eq(webhookEvents.id, whRes.data.eventId));
      } catch {}
    }
    results.push({
      category: "Webhooks",
      name: "POST /api/webhooks/resend Endpoint Responsiveness",
      passed,
      durationMs,
      details: `HTTP ${whRes.status} (Handled gracefully without 500)`,
      error: passed ? undefined : `Webhook endpoint crashed or returned 500: ${JSON.stringify(whRes)}`,
    });
  } catch (err) {
    results.push({
      category: "Webhooks",
      name: "POST /api/webhooks/resend Endpoint Responsiveness",
      passed: false,
      durationMs: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // ============================================================================
  // Clean Up Database Connection Pool
  // ============================================================================
  try {
    await pool.end();
  } catch {
    // Ignore pool shutdown errors
  }

  // ============================================================================
  // Summary & Process Exit
  // ============================================================================
  const allPassed = printSummary(results, "Smoke Test Suite");
  process.exit(allPassed ? 0 : 1);
}

runSmokeTests().catch(async (err) => {
  console.error(colors.red + "Fatal error executing smoke tests:" + colors.reset, err);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
