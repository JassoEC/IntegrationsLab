export async function sendTwilioMessage(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string,
): Promise<string> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
    },
    body: new URLSearchParams({ From: from, To: to, Body: body }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  return json.sid as string;
}

/**
 * Validates that an incoming request genuinely came from Twilio.
 *
 * Twilio signs every request with HMAC-SHA1 over:
 *   - the full webhook URL
 *   - all POST parameters sorted alphabetically and concatenated as key+value
 *
 * The resulting signature is base64-encoded and sent in the
 * `X-Twilio-Signature` header.
 *
 * Reference: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export async function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): Promise<boolean> {
  // Build the string to sign: URL + sorted key+value pairs
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], "");

  const data = url + sortedParams;

  // Import the auth token as an HMAC-SHA1 key
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );

  const expected = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  return expected === signature;
}
