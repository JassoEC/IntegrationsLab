import { createClient } from "@supabase/supabase-js";
import { validateTwilioSignature } from "../_shared/twilio.ts";

Deno.serve(async (req: Request) => {
  // Twilio only sends POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Twilio always sends application/x-www-form-urlencoded
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return new Response("Unsupported Media Type", { status: 415 });
  }

  // Parse form-encoded body (Twilio does not send JSON)
  const formData = await req.formData();
  const payload = Object.fromEntries(formData.entries());

  // Validate Twilio signature
  const signature = req.headers.get("x-twilio-signature") ?? "";
  const url = Deno.env.get("TWILIO_WEBHOOK_URL") ?? "";
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN") ?? "";

  if (!validateTwilioSignature(authToken, signature, url, payload)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. Store raw event before any processing (see ADR-003)
  const { data: event, error: eventError } = await supabase
    .from("webhook_events")
    .insert({
      provider: "whatsapp_twilio",
      event_type: "message.received",
      payload,
    })
    .select("id")
    .single();

  if (eventError) {
    console.error("Failed to store webhook event:", eventError);
    return new Response("Internal server error", { status: 500 });
  }

  // 2. Store the message
  const { error: messageError } = await supabase.from("messages").insert({
    provider: "whatsapp_twilio",
    direction: "inbound",
    from_number: payload.From as string,
    to_number: payload.To as string,
    body: payload.Body as string,
    media_url: (payload.MediaUrl0 as string) ?? null,
    external_id: payload.MessageSid as string,
    status: "received",
  });

  if (messageError) {
    console.error("Failed to store message:", messageError);
    await supabase
      .from("webhook_events")
      .update({ status: "failed", error: messageError.message })
      .eq("id", event.id);
    return new Response("Internal server error", { status: 500 });
  }

  // 3. Mark event as processed
  await supabase
    .from("webhook_events")
    .update({ status: "processed", processed_at: new Date().toISOString() })
    .eq("id", event.id);

  // Twilio expects an empty 200 — no body needed for receive-only
  return new Response(null, { status: 200 });
});
