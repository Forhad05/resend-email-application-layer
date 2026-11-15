import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function GET() {
  const startTime = performance.now();
  
  try {
    // Probe database connectivity and measure query latency
    const dbStart = performance.now();
    await db.execute(sql`SELECT 1`);
    const dbLatencyMs = Math.round(performance.now() - dbStart);

    const mem = process.memoryUsage();
    const totalLatencyMs = Math.round(performance.now() - startTime);

    return NextResponse.json(
      {
        status: "healthy",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        totalLatencyMs,
        database: {
          status: "connected",
          latencyMs: dbLatencyMs,
        },
        system: {
          memory: {
            rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
            heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
            heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
          },
          nodeVersion: process.version,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    const totalLatencyMs = Math.round(performance.now() - startTime);
    return NextResponse.json(
      {
        status: "unhealthy",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        totalLatencyMs,
        database: {
          status: "disconnected",
          error: error instanceof Error ? error.message : "Database connection failed",
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}
