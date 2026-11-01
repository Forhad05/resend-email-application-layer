import { NextResponse } from "next/server";
import { sendTransactionalEmail } from "@/lib/email/transactional";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, templateSlug, variables, fromEmail, idempotencyKey } = body;

    if (!to || !templateSlug) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: 'to' and 'templateSlug' are required.",
        },
        { status: 400 }
      );
    }

    const result = await sendTransactionalEmail({
      to,
      templateSlug,
      variables,
      fromEmail,
      idempotencyKey,
    });

    if (!result.success) {
      const isRateLimited =
        result.error?.toLowerCase().includes("rate limit") ||
        result.error?.toLowerCase().includes("too many");

      return NextResponse.json(
        { error: result.error },
        {
          status: isRateLimited ? 429 : 400,
          headers: isRateLimited ? { "Retry-After": "60" } : undefined,
        }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

