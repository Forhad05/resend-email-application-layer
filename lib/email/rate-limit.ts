import { pool } from "@/lib/db";
import { headers } from "next/headers";

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
  reason?: string;
}

export interface RateLimitCheckOptions {
  key: string;
  limit: number;
  windowSeconds: number;
  reasonMessage?: string;
}

/**
 * Safely extracts the client IP address from Next.js request headers.
 */
export async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
    const realIp = h.get("x-real-ip");
    if (realIp) return realIp.trim();
    const cfIp = h.get("cf-connecting-ip");
    if (cfIp) return cfIp.trim();
  } catch {
    // If called outside request context (e.g., background job)
  }
  return "127.0.0.1";
}

/**
 * Atomically checks and increments a rate limit counter using PostgreSQL.
 * Guarantees race-condition-free sliding/fixed window counting across all processes.
 */
export async function checkRateLimit({
  key,
  limit,
  windowSeconds,
  reasonMessage,
}: RateLimitCheckOptions): Promise<RateLimitResult> {
  const query = `
    INSERT INTO rate_limits (key, count, reset_at, updated_at)
    VALUES ($1, 1, NOW() + ($2 || ' seconds')::INTERVAL, NOW())
    ON CONFLICT (key) DO UPDATE
    SET count = CASE
        WHEN rate_limits.reset_at < NOW() THEN 1
        ELSE rate_limits.count + 1
      END,
      reset_at = CASE
        WHEN rate_limits.reset_at < NOW() THEN NOW() + ($2 || ' seconds')::INTERVAL
        ELSE rate_limits.reset_at
      END,
      updated_at = NOW()
    RETURNING count, reset_at;
  `;

  try {
    const result = await pool.query(query, [key, windowSeconds]);
    const row = result.rows[0];
    const count = parseInt(row.count, 10);
    const resetAt = new Date(row.reset_at);
    const now = Date.now();
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((resetAt.getTime() - now) / 1000)
    );

    if (count > limit) {
      return {
        allowed: false,
        count,
        limit,
        remaining: 0,
        resetAt,
        retryAfterSeconds,
        reason:
          reasonMessage ||
          `Rate limit exceeded. Please wait ${retryAfterSeconds}s before retrying.`,
      };
    }

    return {
      allowed: true,
      count,
      limit,
      remaining: Math.max(0, limit - count),
      resetAt,
      retryAfterSeconds: 0,
    };
  } catch (error) {
    console.error(`Rate limit check error for key ${key}:`, error);
    // Fail-open defensively so database blips don't halt legitimate outbound email
    return {
      allowed: true,
      count: 1,
      limit,
      remaining: limit - 1,
      resetAt: new Date(Date.now() + windowSeconds * 1000),
      retryAfterSeconds: 0,
    };
  }
}

/**
 * High-level guard for general outbound email operations (/compose, thread replies).
 * Applies multi-dimensional throttling:
 * 1. User limit (max 25 emails / minute per authenticated agent)
 * 2. IP limit (max 30 emails / minute per client IP)
 * 3. Per-recipient flood protection (max 5 emails / 5 minutes to the same address)
 */
export async function checkOutboundRateLimit({
  userId,
  recipients,
}: {
  userId?: string | null;
  recipients: string[];
}): Promise<{ allowed: boolean; reason?: string; retryAfterSeconds?: number }> {
  // 1. Check authenticated user limit
  if (userId) {
    const userLimit = await checkRateLimit({
      key: `outbound:user:${userId}`,
      limit: parseInt(process.env.RATE_LIMIT_USER_MAX || "25", 10),
      windowSeconds: 60,
      reasonMessage: "Account dispatch limit exceeded: maximum 25 emails per minute.",
    });

    if (!userLimit.allowed) {
      return {
        allowed: false,
        reason: userLimit.reason,
        retryAfterSeconds: userLimit.retryAfterSeconds,
      };
    }
  }

  // 2. Check client IP limit
  const clientIp = await getClientIp();
  if (clientIp && clientIp !== "127.0.0.1") {
    const ipLimit = await checkRateLimit({
      key: `outbound:ip:${clientIp}`,
      limit: parseInt(process.env.RATE_LIMIT_IP_MAX || "30", 10),
      windowSeconds: 60,
      reasonMessage: "Network rate limit exceeded: too many emails dispatched from this IP.",
    });

    if (!ipLimit.allowed) {
      return {
        allowed: false,
        reason: ipLimit.reason,
        retryAfterSeconds: ipLimit.retryAfterSeconds,
      };
    }
  }

  // 3. Check per-recipient flood protection
  const cleanRecipients = recipients
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  for (const recipient of cleanRecipients) {
    const recipLimit = await checkRateLimit({
      key: `outbound:recip:${recipient}`,
      limit: parseInt(process.env.RATE_LIMIT_RECIPIENT_MAX || "5", 10),
      windowSeconds: 300, // 5 minutes
      reasonMessage: `Flood protection triggered: too many emails sent to ${recipient} within 5 minutes.`,
    });

    if (!recipLimit.allowed) {
      return {
        allowed: false,
        reason: recipLimit.reason,
        retryAfterSeconds: recipLimit.retryAfterSeconds,
      };
    }
  }

  return { allowed: true };
}

/**
 * High-level guard for transactional email dispatches.
 * Protects specific templates (e.g. password resets, verification codes) from spamming.
 */
export async function checkTransactionalRateLimit({
  recipient,
  templateSlug,
}: {
  recipient: string;
  templateSlug?: string;
}): Promise<{ allowed: boolean; reason?: string; retryAfterSeconds?: number }> {
  const cleanRecipient = recipient.trim().toLowerCase();

  // 1. Per-recipient & template limit (e.g. max 3 verification emails per 2 minutes)
  const key = templateSlug
    ? `tx:${templateSlug}:${cleanRecipient}`
    : `tx:general:${cleanRecipient}`;

  const txLimit = await checkRateLimit({
    key,
    limit: parseInt(process.env.RATE_LIMIT_TX_MAX || "3", 10),
    windowSeconds: 120, // 2 minutes
    reasonMessage: `Too many transactional emails sent to ${cleanRecipient}. Please wait before requesting another.`,
  });

  if (!txLimit.allowed) {
    return {
      allowed: false,
      reason: txLimit.reason,
      retryAfterSeconds: txLimit.retryAfterSeconds,
    };
  }

  // 2. Client IP limit for transactional triggers
  const clientIp = await getClientIp();
  if (clientIp && clientIp !== "127.0.0.1") {
    const ipLimit = await checkRateLimit({
      key: `tx:ip:${clientIp}`,
      limit: 60,
      windowSeconds: 60,
      reasonMessage: "Transactional dispatch rate limit exceeded for this IP.",
    });

    if (!ipLimit.allowed) {
      return {
        allowed: false,
        reason: ipLimit.reason,
        retryAfterSeconds: ipLimit.retryAfterSeconds,
      };
    }
  }

  return { allowed: true };
}

/**
 * Maintenance routine to purge expired rate limit keys older than 24 hours.
 */
export async function purgeExpiredRateLimits(): Promise<number> {
  try {
    const res = await pool.query(
      `DELETE FROM rate_limits WHERE reset_at < NOW() - INTERVAL '24 hours'`
    );
    return res.rowCount || 0;
  } catch (err) {
    console.error("Failed to purge expired rate limits:", err);
    return 0;
  }
}

