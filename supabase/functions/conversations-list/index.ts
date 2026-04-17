import { createClient } from "@supabase/supabase-js";

Deno.serve(async (req: Request) => {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "open";
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") ?? "20"),
    100,
  );
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error, count } = await supabase
    .from("conversations")
    .select(
      `id, channel, status, last_message_at, created_at,
       contacts ( id, phone_number, display_name )`,
      { count: "exact" },
    )
    .eq("status", status)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Failed to list conversations:", error);
    return new Response("Internal server error", { status: 500 });
  }

  return Response.json({ data, count, limit, offset });
});
