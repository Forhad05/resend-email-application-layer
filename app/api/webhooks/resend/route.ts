import { NextRequest, NextResponse } from "next/server";
import { resend } from "@/lib/resend";
import { handleInboundEmail, handleDeliveryEvent } from "@/lib/email/inbound";

export async function POST(req: NextRequest) {
  try {
    const rawPayload = await req.text();
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    let event: any;

    if (webhookSecret && svixId && svixTimestamp && svixSignature) {
      try {
        event = resend.webhooks.verify({
          payload: rawPayload,
          headers: {
            id: svixId,
            timestamp: svixTimestamp,
            signature: svixSignature,
          },
          webhookSecret: webhookSecret,
        });
      } catch (verifyError: any) {
        console.error("Resend webhook signature verification failed:", verifyError.message);
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
    let eventType = event.type;
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
        await handleInboundEmail(eventData);
        break;

      case "email.sent":
      case "email.delivered":
      case "email.bounced":
      case "email.complained":
      case "email.opened":
      case "email.clicked":
        await handleDeliveryEvent(eventType, eventData);
        break;

      default:
        console.log(`Unhandled Resend webhook event type: ${eventType}`);
    }

    return NextResponse.json({ success: true, event: event.type }, { status: 200 });
  } catch (error: any) {
    console.error("Error processing Resend webhook:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

