import { createClient } from "@supabase/supabase-js";
import { verifyStripeSignature } from "../_shared/stripe.ts";
import { sendTwilioMessage } from "../_shared/twilio.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature") ?? "";
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

  // Must read as text before parsing to preserve the raw body for signature verification
  const rawBody = await req.text();

  if (!await verifyStripeSignature(rawBody, signature, secret)) {
    return new Response("Unauthorized", { status: 401 });
  }

  let event: { id: string; type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. Store raw event
  const { data: webhookEvent, error: eventError } = await supabase
    .from("webhook_events")
    .insert({
      provider: "stripe",
      event_type: event.type,
      payload: event,
    })
    .select("id")
    .single();

  if (eventError) {
    console.error("Failed to store webhook event:", eventError);
    return new Response("Internal server error", { status: 500 });
  }

  const session = event.data.object as { id: string };

  // 2. Handle event types
  if (event.type === "checkout.session.completed") {
    const { data: payment, error: fetchError } = await supabase
      .from("payments")
      .select("id, metadata")
      .eq("external_id", session.id)
      .single();

    if (fetchError || !payment) {
      console.error("Payment not found for session:", session.id, fetchError);
    } else {
      await supabase
        .from("payments")
        .update({ status: "succeeded" })
        .eq("id", payment.id);

      // Send WhatsApp notification to the customer
      const meta = (payment.metadata ?? {}) as Record<string, string>;
      const customerPhone = meta.customer_phone;

      if (customerPhone) {
        try {
          const to = customerPhone.startsWith("whatsapp:")
            ? customerPhone
            : `whatsapp:${customerPhone}`;

          await sendTwilioMessage(
            Deno.env.get("TWILIO_ACCOUNT_SID")!,
            Deno.env.get("TWILIO_AUTH_TOKEN")!,
            Deno.env.get("TWILIO_WHATSAPP_NUMBER")!,
            to,
            "Your payment has been confirmed! Thank you for your purchase.",
          );
        } catch (err) {
          // Non-fatal: log but do not fail the webhook response
          console.error("WhatsApp notification failed:", err);
        }
      }
    }
  } else if (event.type === "checkout.session.expired") {
    await supabase
      .from("payments")
      .update({ status: "failed" })
      .eq("external_id", session.id);
  }

  // 3. Mark event processed
  await supabase
    .from("webhook_events")
    .update({ status: "processed", processed_at: new Date().toISOString() })
    .eq("id", webhookEvent.id);

  return new Response(null, { status: 200 });
});
