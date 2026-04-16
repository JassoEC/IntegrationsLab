/**
 * Validates that an incoming request genuinely came from Meta.
 *
 * Meta signs every webhook with HMAC-SHA256 over the raw request body,
 * using the app secret as the key. The signature is sent in the
 * `X-Hub-Signature-256` header as `sha256=<hex>`.
 *
 * Reference: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export async function validateMetaSignature(
  appSecret: string,
  signature: string,
  rawBody: string,
): Promise<boolean> {
  const expected = signature.startsWith("sha256=")
    ? signature.slice(7)
    : signature;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(rawBody),
  );

  const computed = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computed === expected;
}
