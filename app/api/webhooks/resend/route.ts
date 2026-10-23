import { NextRequest, NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import {
  handleInboundEmail,
  handleDeliveryEvent,
  ResendInboundPayload,
} from "@/lib/email/inbound";

export async function POST(req: NextRequest) {
  try {
    const rawPayload = await req.text();
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    let event: Record<string, unknown>;

    if (webhookSecret && svixId && svixTimestamp && svixSignature) {
      try {
        event = (resend.webhooks.verify({
          payload: rawPayload,
          headers: {
            id: svixId,
            timestamp: svixTimestamp,
            signature: svixSignature,
          },
          webhookSecret: webhookSecret,
        }) as unknown) as Record<string, unknown>;
      } catch (verifyError: unknown) {
        console.error("Resend webhook signature verification failed:", (verifyError as Error).message);
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 401 }
        );
      }
    } else {
      if (!webhookSecret) {
        console.warn(
          "⚠️ RESEND_WEBHOOK_SECRET is not configured in .env.local. Skipping signature verification in development."
        );
      }
      try {
        event = JSON.parse(rawPayload);
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON payload" },
          { status: 400 }
        );
      }
    }

    // Support both Resend webhook wrappers and direct email worker payloads
    let eventType = typeof event.type === "string" ? event.type : null;
    let eventData = event.data;

    if (!eventType && (event.from || event.to)) {
      eventType = "email.received";
      eventData = event;
    }

    if (!eventType) {
      return NextResponse.json(
        { error: "Missing event type or email payload" },
        { status: 400 }
      );
    }

    // Process event based on type
    switch (eventType) {
      case "email.received":
        await handleInboundEmail(eventData as ResendInboundPayload);
        break;

      case "email.sent":
      case "email.delivered":
      case "email.bounced":
      case "email.complained":
      case "email.opened":
      case "email.clicked":
        await handleDeliveryEvent(
          eventType,
          (eventData || event) as { email_id?: string; to?: string | string[] }
        );
        break;

      default:
        console.log(`Unhandled Resend webhook event type: ${eventType}`);
    }

    return NextResponse.json({ success: true, event: event.type }, { status: 200 });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error processing Resend webhook:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

