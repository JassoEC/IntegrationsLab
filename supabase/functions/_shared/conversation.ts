import { SupabaseClient } from "@supabase/supabase-js";

export async function upsertContact(
  supabase: SupabaseClient,
  phoneNumber: string,
  displayName?: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("contacts")
    .upsert(
      { phone_number: phoneNumber, display_name: displayName ?? null },
      { onConflict: "phone_number" },
    )
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function upsertConversation(
  supabase: SupabaseClient,
  contactId: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("contact_id", contactId)
    .eq("status", "open")
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ contact_id: contactId, channel: "whatsapp" })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function attachMessageToConversation(
  supabase: SupabaseClient,
  messageId: string,
  conversationId: string,
  contactId: string,
): Promise<void> {
  await Promise.all([
    supabase
      .from("messages")
      .update({ conversation_id: conversationId, contact_id: contactId })
      .eq("id", messageId),
    supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId),
  ]);
}
