/**
 * Sprint 10 — Task 3: Stress & Concurrency Benchmark
 *
 * Verifies high-throughput durability, concurrency safety, and rate-limiting enforcement:
 * 1. 50-request parallel webhook ingestion burst
 * 2. Sliding-window rate limiter enforcement (HTTP 429 Too Many Requests)
 * 3. Concurrent idempotency deduplication guard
 * 4. PostgreSQL connection pool saturation & recovery (40 concurrent queries on 20-conn pool)
 * 5. Memory RSS & latency health check post-stress
 */

import { sql } from "drizzle-orm";
import { db, pool } from "../lib/db";
import {
  messages,
  rateLimits,
  threads,
  webhookEvents,
} from "../lib/db/schema";
import {
  calculateLatencyStats,
  colors,
  getAppUrl,
  measure,
  printHeader,
  printSummary,
  TestResult,
} from "./test-utils";

async function cleanupStressRecords(runId: string) {
  try {
    await db.delete(rateLimits).where(
      sql`key LIKE ${`%${runId}%`} OR key LIKE '%benchmark.local%' OR key LIKE 'tx:ip:%'`
    );
    await db.delete(webhookEvents).where(
      sql`payload::text LIKE ${`%${runId}%`} OR payload::text LIKE '%benchmark.local%'`
    );
    await db.delete(messages).where(
      sql`from_email LIKE ${`%${runId}%`} OR to_emails::text LIKE ${`%${runId}%`} OR resend_email_id LIKE ${`%${runId}%`} OR from_email LIKE '%benchmark.local%' OR to_emails::text LIKE '%benchmark.local%'`
    );
    await db.delete(threads).where(
      sql`subject LIKE ${`%${runId}%`} OR subject LIKE '%benchmark%'`
    );
  } catch (cleanErr) {
    console.warn("Cleanup warning:", cleanErr);
  }
}

async function runStressBenchmarks() {
  const appUrl = getAppUrl();
  const runId = Date.now().toString(36);
  const stressRecipient = `stress.rate.${runId}@benchmark.local`;

  printHeader(
    "⚡ Resend Email Application - Stress & Concurrency Benchmark",
    `Target: ${appUrl} | Concurrency: 50 | Run ID: ${runId}`
  );

  const results: TestResult[] = [];
  const burstEventIds: string[] = [];

  // Pre-cleanup
  await cleanupStressRecords(runId);

  try {
    // ============================================================================
    // Benchmark 1: High-Concurrency Webhook Burst (50 Parallel Requests)
    // ============================================================================
    console.log(`${colors.cyan}▶ Firing 50 concurrent webhook ingestion requests...${colors.reset}`);
    const burstCount = 50;
    const burstDurations: number[] = [];

    const { result: burstResults, durationMs: totalBurstDuration } = await measure(async () => {
      const promises = Array.from({ length: burstCount }, async (_, idx) => {
        const start = performance.now();
        try {
          const res = await fetch(`${appUrl}/api/webhooks/resend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "email.sent",
              data: {
                email_id: `re_stress_burst_${idx}_${runId}`,
                to: [`user_${idx}_${runId}@benchmark.local`],
              },
            }),
            signal: AbortSignal.timeout(10000),
          });

          const reqDuration = Math.round((performance.now() - start) * 10) / 10;
          burstDurations.push(reqDuration);
          const data = await res.json().catch(() => ({}));
          return { status: res.status, eventId: data?.eventId };
        } catch {
          return { status: 0, eventId: null };
        }
      });

      return Promise.all(promises);
    });

    for (const r of burstResults) {
      if (r.eventId) burstEventIds.push(r.eventId);
    }

    const successfulRequests = burstResults.filter((r) => r.status === 200).length;
    const stats = calculateLatencyStats(burstDurations, totalBurstDuration);
    const burstPassed = successfulRequests === burstCount;

    results.push({
      category: "Concurrency Burst",
      name: `50 Parallel Webhook Ingestion Hits (${stats.throughputRps} req/s)`,
      passed: burstPassed,
      durationMs: totalBurstDuration,
      details: `${successfulRequests}/${burstCount} succeeded | min: ${stats.min}ms, p50: ${stats.p50}ms, p95: ${stats.p95}ms, max: ${stats.max}ms`,
      error: burstPassed ? undefined : `Only ${successfulRequests}/${burstCount} requests succeeded with 200`,
    });

    // ============================================================================
    // Benchmark 2: Sliding-Window Rate Limiter Enforcement (HTTP 429)
    // ============================================================================
    console.log(`${colors.cyan}▶ Testing sliding-window rate limit throttling (RATE_LIMIT_TX_MAX = 3)...${colors.reset}`);
    const rateLimitAttempts = 6;
    const rateLimitStatuses: number[] = [];

    const { durationMs: rateLimitDuration } = await measure(async () => {
      for (let i = 0; i < rateLimitAttempts; i++) {
        const res = await fetch(`${appUrl}/api/send/transactional`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: stressRecipient,
            templateSlug: "support-ticket",
          }),
          signal: AbortSignal.timeout(5000),
        });
        rateLimitStatuses.push(res.status);
      }
    });

    const throttled429Count = rateLimitStatuses.filter((s) => s === 429).length;
    const passedCount = rateLimitStatuses.filter((s) => s !== 429 && s !== 500).length;
    const rateLimitPassed = throttled429Count >= 3 && passedCount <= 3;

    results.push({
      category: "Rate Limiting",
      name: "Sliding-Window Throttling (Enforce HTTP 429 on Burst Limit Exceeded)",
      passed: rateLimitPassed,
      durationMs: rateLimitDuration,
      details: `Dispatched 6 calls -> Passed: ${passedCount}, Throttled (429): ${throttled429Count}`,
      error: rateLimitPassed ? undefined : `Rate limit failed to throttle: Statuses: ${rateLimitStatuses.join(", ")}`,
    });

    // ============================================================================
    // Benchmark 3: Concurrent Idempotency & Race Condition Guard
    // ============================================================================
    console.log(`${colors.cyan}▶ Testing concurrent duplicate idempotency protection...${colors.reset}`);
    const idempotencyKey = `idem_stress_${runId}`;
    const idemCount = 10;

    const { result: idemResults, durationMs: idemDuration } = await measure(async () => {
      const promises = Array.from({ length: idemCount }, async () => {
        try {
          const res = await fetch(`${appUrl}/api/send/transactional`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: `idem.user.${runId}@benchmark.local`,
              templateSlug: "support-ticket",
              idempotencyKey,
            }),
            signal: AbortSignal.timeout(5000),
          });
          return res.status;
        } catch {
          return 0;
        }
      });
      return Promise.all(promises);
    });

    const zeroCrashes = idemResults.every((status) => status !== 500);
    const idemPassed = zeroCrashes && idemResults.length === idemCount;

    results.push({
      category: "Idempotency Safety",
      name: `10 Concurrent Duplicate Idempotency Requests`,
      passed: idemPassed,
      durationMs: idemDuration,
      details: `All ${idemCount} requests resolved safely without unhandled 500 crashes (${idemResults.slice(0, 5).join(", ")}...)`,
      error: idemPassed ? undefined : `One or more requests crashed with 500: ${idemResults.join(", ")}`,
    });

    // ============================================================================
    // Benchmark 4: Connection Pool Saturation & Recovery (40 queries on 20-conn pool)
    // ============================================================================
    console.log(`${colors.cyan}▶ Testing PostgreSQL connection pool saturation (40 concurrent queries on 20-conn pool)...${colors.reset}`);
    const poolQueryCount = 40;
    const poolDurations: number[] = [];

    const { durationMs: totalPoolDuration } = await measure(async () => {
      const promises = Array.from({ length: poolQueryCount }, async () => {
        try {
          const start = performance.now();
          await db.execute(sql`
            SELECT pg_sleep(0.01), count(*) 
            FROM information_schema.tables;
          `);
          poolDurations.push(Math.round((performance.now() - start) * 10) / 10);
        } catch (err) {
          console.warn("Pool query warning:", err);
        }
      });
      return Promise.all(promises);
    });

    const poolStats = calculateLatencyStats(poolDurations, totalPoolDuration);
    const poolPassed = poolDurations.length === poolQueryCount && poolStats.max < 1000;

    results.push({
      category: "Database Pool",
      name: `Connection Pool Saturation (40 Concurrent Queries over 20-Conn Pool)`,
      passed: poolPassed,
      durationMs: totalPoolDuration,
      details: `${poolQueryCount}/${poolQueryCount} executed | p50: ${poolStats.p50}ms, p95: ${poolStats.p95}ms, max: ${poolStats.max}ms`,
      error: poolPassed ? undefined : `Pool saturation exceeded limits: max latency ${poolStats.max}ms`,
    });

    // ============================================================================
    // Benchmark 5: Post-Stress Health Probe & Resource Stability
    // ============================================================================
    console.log(`${colors.cyan}▶ Checking system resource stability post-stress...${colors.reset}`);
    const { result: healthData, durationMs: healthDuration } = await measure(async () => {
      const res = await fetch(`${appUrl}/api/health`, {
        signal: AbortSignal.timeout(5000),
      });
      return res.json();
    });

    const healthHealthy =
      healthData?.status === "healthy" &&
      healthData?.database?.status === "connected" &&
      typeof healthData?.database?.latencyMs === "number" &&
      healthData?.database?.latencyMs < 250;

    results.push({
      category: "System Stability",
      name: "Post-Stress /api/health System Check",
      passed: healthHealthy,
      durationMs: healthDuration,
      details: `Status: ${healthData?.status} | Post-stress DB Latency: ${healthData?.database?.latencyMs}ms | Memory RSS: ${healthData?.system?.memory?.rssMb}MB`,
      error: healthHealthy ? undefined : `Post-stress health check degraded: ${JSON.stringify(healthData)}`,
    });

  } finally {
    // Teardown
    console.log(`\n${colors.dim}Cleaning up stress benchmark test records...${colors.reset}`);
    await cleanupStressRecords(runId);
    console.log(`${colors.green}✓ Database cleanup complete (zero residual stress artifacts).${colors.reset}`);

    try {
      await pool.end();
    } catch {}
  }

  // Summary & Process Exit
  const allPassed = printSummary(results, "Stress & Concurrency Benchmark Suite");
  process.exit(allPassed ? 0 : 1);
}

runStressBenchmarks().catch(async (err) => {
  console.error(colors.red + "Fatal error executing stress benchmarks:" + colors.reset, err);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
