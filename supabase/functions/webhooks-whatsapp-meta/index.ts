import { createClient } from "@supabase/supabase-js";
import { sendMetaMessage, validateMetaSignature } from "../_shared/meta.ts";
import { getAutoReply } from "../_shared/automation.ts";
import {
  attachMessageToConversation,
  upsertContact,
  upsertConversation,
} from "../_shared/conversation.ts";

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

  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  const messageData = change?.value?.messages?.[0];
  const metadata = change?.value?.metadata;

  if (!messageData) {
    // Meta sends status updates and other notifications — acknowledge them
    return new Response(null, { status: 200 });
  }

  const eventType = messageData.type === "text"
    ? "message.received"
    : `message.received.${messageData.type}`;

  // 1. Store raw event
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

  // 2. Store inbound message
  const { data: message, error: messageError } = await supabase
    .from("messages")
    .insert({
      provider: "whatsapp_meta",
      direction: "inbound",
      from_number: messageData.from,
      to_number: metadata?.phone_number_id,
      body: messageData.text?.body ?? "",
      media_url: messageData.image?.id ?? messageData.document?.id ?? null,
      external_id: messageData.id,
      status: "received",
    })
    .select("id")
    .single();

  if (messageError) {
    console.error("Failed to store message:", messageError);
    await supabase
      .from("webhook_events")
      .update({ status: "failed", error: messageError.message })
      .eq("id", event.id);
    return new Response("Internal server error", { status: 500 });
  }

  // 3. Thread into conversation
  const contactId = await upsertContact(supabase, messageData.from);
  const conversationId = await upsertConversation(supabase, contactId);
  await attachMessageToConversation(
    supabase,
    message.id,
    conversationId,
    contactId,
  );

  // 4. Auto-reply if keyword matched
  const replyBody = getAutoReply(messageData.text?.body ?? "");
  if (replyBody) {
    try {
      const phoneNumberId = Deno.env.get("META_PHONE_NUMBER_ID")!;
      const externalId = await sendMetaMessage(
        Deno.env.get("META_ACCESS_TOKEN")!,
        phoneNumberId,
        messageData.from,
        replyBody,
      );

      const { data: outbound } = await supabase
        .from("messages")
        .insert({
          provider: "whatsapp_meta",
          direction: "outbound",
          from_number: phoneNumberId,
          to_number: messageData.from,
          body: replyBody,
          external_id: externalId,
          status: "sent",
        })
        .select("id")
        .single();

      if (outbound) {
        await attachMessageToConversation(
          supabase,
          outbound.id,
          conversationId,
          contactId,
        );
      }
    } catch (err) {
      console.error("Auto-reply failed:", err);
    }
  }

  // 5. Mark event processed
  await supabase
    .from("webhook_events")
    .update({ status: "processed", processed_at: new Date().toISOString() })
    .eq("id", event.id);

  // Meta requires a 200 response within 20 seconds or retries the webhook
  return new Response(null, { status: 200 });
});
