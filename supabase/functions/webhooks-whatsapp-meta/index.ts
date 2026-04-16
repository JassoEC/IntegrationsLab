import { createClient } from "@supabase/supabase-js";
import { validateMetaSignature } from "../_shared/meta.ts";

Deno.serve(async (req: Request) => {
  // Meta sends a GET to verify the webhook endpoint on initial setup
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === Deno.env.get("META_VERIFY_TOKEN")) {
      return new Response(challenge, { status: 200 });
    }

    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();

  // Validate Meta signature
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const appSecret = Deno.env.get("META_APP_SECRET") ?? "";

  if (!await validateMetaSignature(appSecret, signature, rawBody)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Extract the message entry from Meta's nested payload structure
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  const messageData = change?.value?.messages?.[0];
  const metadata = change?.value?.metadata;

  if (!messageData) {
    // Meta sends other notification types (status updates, etc.) — acknowledge them
    return new Response(null, { status: 200 });
  }

  const eventType = messageData.type === "text"
    ? "message.received"
    : `message.received.${messageData.type}`;

  // 1. Store raw event before any processing (see ADR-003)
  const { data: event, error: eventError } = await supabase
    .from("webhook_events")
    .insert({
      provider: "whatsapp_meta",
      event_type: eventType,
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
    provider: "whatsapp_meta",
    direction: "inbound",
    from_number: messageData.from,
    to_number: metadata?.phone_number_id,
    body: messageData.text?.body ?? "",
    media_url: messageData.image?.id ?? messageData.document?.id ?? null,
    external_id: messageData.id,
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

  // Meta requires a 200 response within 20 seconds or retries the webhook
  return new Response(null, { status: 200 });
});
