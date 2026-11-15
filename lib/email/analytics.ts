import { db } from "@/lib/db";
import { messages, suppressions } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export interface DeliverabilityStats {
  totalOutbound: number;
  deliveredCount: number;
  deliveredRate: number;
  openedCount: number;
  openRate: number;
  clickedCount: number;
  clickRate: number;
  bouncedCount: number;
  bounceRate: number;
  complainedCount: number;
  complaintRate: number;
  suppressedCount: number;
}

export interface BounceTaxonomy {
  hardBounce: number;
  softBounce: number;
  complaint: number;
  unsubscribe: number;
  manual: number;
  total: number;
}

export interface DomainDeliverability {
  domain: string;
  sent: number;
  delivered: number;
  opened: number;
  bounced: number;
  deliveryRate: number;
  bounceRate: number;
  health: "optimal" | "warning" | "critical";
}

export interface DeliverabilityMetricsResult {
  stats: DeliverabilityStats;
  bounceTaxonomy: BounceTaxonomy;
  domains: DomainDeliverability[];
}

/**
 * Computes deliverability rates, bounce taxonomy, and recipient domain breakdown
 */
export async function getDeliverabilityMetrics(): Promise<DeliverabilityMetricsResult> {
  // 1. Query outbound message status counts
  const statusRows = await db
    .select({
      status: messages.status,
      count: sql<number>`count(*)::int`,
    })
    .from(messages)
    .where(eq(messages.direction, "outbound"))
    .groupBy(messages.status);

  let totalOutbound = 0;
  let deliveredCount = 0;
  let openedCount = 0;
  let clickedCount = 0;
  let bouncedCount = 0;
  let complainedCount = 0;

  for (const r of statusRows) {
    totalOutbound += r.count;
    if (r.status === "delivered" || r.status === "opened" || r.status === "clicked") {
      deliveredCount += r.count;
    }
    if (r.status === "opened" || r.status === "clicked") {
      openedCount += r.count;
    }
    if (r.status === "clicked") {
      clickedCount += r.count;
    }
    if (r.status === "bounced") {
      bouncedCount += r.count;
    }
    if (r.status === "complained") {
      complainedCount += r.count;
    }
  }

  const calcRate = (part: number, whole: number): number => {
    if (whole === 0) return 0;
    return Math.round((part / whole) * 1000) / 10;
  };

  // 2. Query suppressions count & reason breakdown
  const suppressionRows = await db
    .select({
      reason: suppressions.reason,
      count: sql<number>`count(*)::int`,
    })
    .from(suppressions)
    .groupBy(suppressions.reason);

  let hardBounce = 0;
  let softBounce = 0;
  let complaint = 0;
  let unsubscribe = 0;
  let manual = 0;
  let suppressedCount = 0;

  for (const r of suppressionRows) {
    suppressedCount += r.count;
    if (r.reason === "hard_bounce" || r.reason === "bounce") hardBounce += r.count;
    else if (r.reason === "soft_bounce") softBounce += r.count;
    else if (r.reason === "complaint") complaint += r.count;
    else if (r.reason === "unsubscribe") unsubscribe += r.count;
    else manual += r.count;
  }

  // 3. Domain health breakdown (extract domain from to_emails)
  let domainResults: DomainDeliverability[] = [];
  try {
    const domainQuery = await db.execute<{
      domain: string;
      sent: number;
      delivered: number;
      opened: number;
      bounced: number;
    }>(sql`
      SELECT 
        LOWER(split_part(unnest(to_emails), '@', 2)) AS domain,
        COUNT(*)::int AS sent,
        COUNT(CASE WHEN status IN ('delivered', 'opened', 'clicked') THEN 1 END)::int AS delivered,
        COUNT(CASE WHEN status IN ('opened', 'clicked') THEN 1 END)::int AS opened,
        COUNT(CASE WHEN status = 'bounced' THEN 1 END)::int AS bounced
      FROM messages
      WHERE direction = 'outbound'
      GROUP BY domain
      HAVING LOWER(split_part(unnest(to_emails), '@', 2)) <> ''
      ORDER BY sent DESC
      LIMIT 10
    `);

    domainResults = (domainQuery.rows || []).map((row) => {
      const dRate = calcRate(row.delivered, row.sent);
      const bRate = calcRate(row.bounced, row.sent);
      let health: "optimal" | "warning" | "critical" = "optimal";
      if (bRate > 3.0) health = "critical";
      else if (bRate > 1.0) health = "warning";

      return {
        domain: row.domain,
        sent: row.sent,
        delivered: row.delivered,
        opened: row.opened,
        bounced: row.bounced,
        deliveryRate: dRate,
        bounceRate: bRate,
        health,
      };
    });
  } catch (err) {
    console.warn("Could not calculate domain breakdown:", err);
  }

  return {
    stats: {
      totalOutbound,
      deliveredCount,
      deliveredRate: calcRate(deliveredCount, totalOutbound),
      openedCount,
      openRate: calcRate(openedCount, totalOutbound),
      clickedCount,
      clickRate: calcRate(clickedCount, totalOutbound),
      bouncedCount,
      bounceRate: calcRate(bouncedCount, totalOutbound),
      complainedCount,
      complaintRate: calcRate(complainedCount, totalOutbound),
      suppressedCount,
    },
    bounceTaxonomy: {
      hardBounce,
      softBounce,
      complaint,
      unsubscribe,
      manual,
      total: suppressedCount,
    },
    domains: domainResults,
  };
}
