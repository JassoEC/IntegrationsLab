/**
 * Verifies a Stripe webhook signature.
 *
 * Stripe sends a `Stripe-Signature` header with format:
 *   t=<timestamp>,v1=<sig>,...
 *
 * The signed payload is `<timestamp>.<rawBody>`.
 * The signature is HMAC-SHA256 of that string using the webhook signing secret.
 *
 * A 5-minute replay-attack window is enforced.
 *
 * Reference: https://stripe.com/docs/webhooks/signatures
 */
export async function verifyStripeSignature(
  rawBody: string,
  header: string,
  secret: string,
): Promise<boolean> {
  const parts: Record<string, string> = {};
  for (const chunk of header.split(",")) {
    const idx = chunk.indexOf("=");
    if (idx !== -1) parts[chunk.slice(0, idx)] = chunk.slice(idx + 1);
  }

  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  // Reject events older than 5 minutes to prevent replay attacks
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) return false;

  const payload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );

  const computed = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computed === signature;
}
