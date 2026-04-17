import { createClient } from "@supabase/supabase-js";
import { sendTwilioMessage } from "../_shared/twilio.ts";
import { sendMetaMessage } from "../_shared/meta.ts";
import {
  attachMessageToConversation,
  upsertContact,
  upsertConversation,
} from "../_shared/conversation.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let input: { to?: string; body?: string; provider?: string };
  try {
    input = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { to, body, provider = "twilio" } = input;

  if (!to || !body) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: to, body" }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let externalId: string;
  let fromNumber: string;

  try {
    if (provider === "twilio") {
      fromNumber = Deno.env.get("TWILIO_WHATSAPP_NUMBER")!;
      externalId = await sendTwilioMessage(
        Deno.env.get("TWILIO_ACCOUNT_SID")!,
        Deno.env.get("TWILIO_AUTH_TOKEN")!,
        fromNumber,
        to,
        body,
      );
    } else if (provider === "meta") {
      fromNumber = Deno.env.get("META_PHONE_NUMBER_ID")!;
      externalId = await sendMetaMessage(
        Deno.env.get("META_ACCESS_TOKEN")!,
        fromNumber,
        to,
        body,
      );
    } else {
      return new Response(
        JSON.stringify({ error: `Unknown provider: ${provider}` }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (err) {
    console.error("Provider send failed:", err);
    return new Response("Failed to send message", { status: 502 });
  }

  const contactId = await upsertContact(supabase, to);
  const conversationId = await upsertConversation(supabase, contactId);

  const { data: message, error: messageError } = await supabase
    .from("messages")
    .insert({
      provider,
      direction: "outbound",
      from_number: fromNumber,
      to_number: to,
      body,
      external_id: externalId,
      status: "sent",
    })
    .select("id")
    .single();

  if (messageError) {
    console.error("Failed to store outbound message:", messageError);
  } else {
    await attachMessageToConversation(
      supabase,
      message.id,
      conversationId,
      contactId,
    );
  }

  return Response.json({
    id: message?.id ?? null,
    external_id: externalId,
    conversation_id: conversationId,
    status: "sent",
  });
});
