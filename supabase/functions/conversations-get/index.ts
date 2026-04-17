import { createClient } from "@supabase/supabase-js";

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const conversationId = parts[parts.length - 1];

  if (!conversationId) {
    return new Response("Missing conversation ID", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const [convResult, messagesResult] = await Promise.all([
    supabase
      .from("conversations")
      .select(
        `id, channel, status, last_message_at, created_at,
         contacts ( id, phone_number, display_name )`,
      )
      .eq("id", conversationId)
      .single(),
    supabase
      .from("messages")
      .select(
        "id, direction, body, media_url, status, created_at, external_id, provider",
      )
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(100),
  ]);

  if (convResult.error) {
    if (convResult.error.code === "PGRST116") {
      return new Response("Not found", { status: 404 });
    }
    console.error("Failed to fetch conversation:", convResult.error);
    return new Response("Internal server error", { status: 500 });
  }

  return Response.json({
    ...convResult.data,
    messages: messagesResult.data ?? [],
  });
});
