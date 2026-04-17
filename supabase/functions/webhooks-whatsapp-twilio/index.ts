import { createClient } from "@supabase/supabase-js";
import {
  sendTwilioMessage,
  validateTwilioSignature,
} from "../_shared/twilio.ts";
import { getAutoReply } from "../_shared/automation.ts";
import {
  attachMessageToConversation,
  upsertContact,
  upsertConversation,
} from "../_shared/conversation.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return new Response("Unsupported Media Type", { status: 415 });
  }

  const formData = await req.formData();
  const payload = Object.fromEntries(formData.entries()) as Record<
    string,
    string
  >;

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

  // 1. Store raw event
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

  // 2. Store inbound message
  const { data: message, error: messageError } = await supabase
    .from("messages")
    .insert({
      provider: "whatsapp_twilio",
      direction: "inbound",
      from_number: payload.From,
      to_number: payload.To,
      body: payload.Body,
      media_url: payload.MediaUrl0 ?? null,
      external_id: payload.MessageSid,
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
  const contactId = await upsertContact(supabase, payload.From);
  const conversationId = await upsertConversation(supabase, contactId);
  await attachMessageToConversation(
    supabase,
    message.id,
    conversationId,
    contactId,
  );

  // 4. Auto-reply if keyword matched
  const replyBody = getAutoReply(payload.Body ?? "");
  if (replyBody) {
    try {
      const fromNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER")!;
      const externalId = await sendTwilioMessage(
        Deno.env.get("TWILIO_ACCOUNT_SID")!,
        authToken,
        fromNumber,
        payload.From,
        replyBody,
      );

      const { data: outbound } = await supabase
        .from("messages")
        .insert({
          provider: "whatsapp_twilio",
          direction: "outbound",
          from_number: fromNumber,
          to_number: payload.From,
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

  return new Response(null, { status: 200 });
});
