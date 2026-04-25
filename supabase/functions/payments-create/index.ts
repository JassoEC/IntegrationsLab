import { createClient } from "@supabase/supabase-js";

interface CreatePaymentBody {
  amount: number;         // Decimal amount (e.g., 20.00 for $20)
  currency: string;       // ISO 4217 code (e.g., "usd", "mxn")
  customer_phone: string; // Phone number for WhatsApp notification (E.164 format)
  description?: string;   // Product or order description shown on checkout page
  success_url?: string;   // Redirect URL after successful payment
  cancel_url?: string;    // Redirect URL if customer cancels
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: CreatePaymentBody;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { amount, currency, customer_phone, description, success_url, cancel_url } = body;

  if (!amount || !currency || !customer_phone) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: amount, currency, customer_phone" }),
      { status: 422, headers: { "Content-Type": "application/json" } },
    );
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  const successUrl = success_url || Deno.env.get("STRIPE_SUCCESS_URL") || "https://example.com/success";
  const cancelUrl = cancel_url || Deno.env.get("STRIPE_CANCEL_URL") || "https://example.com/cancel";

  // Stripe requires amount in the smallest currency unit (e.g., cents for USD)
  const amountInCents = Math.round(amount * 100);

  const params = new URLSearchParams({
    "line_items[0][price_data][currency]": currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(amountInCents),
    "line_items[0][price_data][product_data][name]": description ?? "Payment",
    "line_items[0][quantity]": "1",
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  let stripeSession: { id: string; url: string };
  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${stripeKey}:`)}`,
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Stripe API error ${res.status}: ${err}`);
    }

    stripeSession = await res.json();
  } catch (err) {
    console.error("Stripe API call failed:", err);
    return new Response(
      JSON.stringify({ error: "Payment provider error" }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: payment, error: dbError } = await supabase
    .from("payments")
    .insert({
      provider: "stripe",
      amount,
      currency: currency.toLowerCase(),
      status: "pending",
      external_id: stripeSession.id,
      payment_url: stripeSession.url,
      metadata: { customer_phone, description: description ?? null },
    })
    .select("id, external_id, payment_url, status")
    .single();

  if (dbError) {
    console.error("Failed to store payment:", dbError);
    return new Response(
      JSON.stringify({ error: "Failed to store payment record" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(JSON.stringify(payment), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
});
