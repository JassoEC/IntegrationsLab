# ADR-004: Payment and messaging provider selection

**Date:** 2026-04-16
**Status:** Accepted

## Context

The system needs to handle payment processing and customer notifications via WhatsApp.
Multiple providers exist for each. The selection must balance ecosystem maturity,
documentation quality, LATAM market coverage, and integration complexity.

The goal is not to pick the "best" provider in the abstract — it is to pick the ones
that solve the most common pain points for businesses operating in Latin America, while
keeping the door open for additional providers as requirements grow.

## Decision

### Payments

**Primary providers: Stripe and MercadoPago.**

| Provider | Reason for inclusion |
|---|---|
| **Stripe** | Industry standard. Best-in-class documentation, SDKs, and webhook infrastructure. Required for any business targeting international customers or operating in a global stack. |
| **MercadoPago** | Dominant payment processor in LATAM (Mexico, Argentina, Brazil, Colombia). Essential for businesses whose customers pay in local currency via OXXO, PIX, PSE, or local cards. |
| **PayPal** | Planned addition. Wide international recognition. Relevant for freelancers and digital services with customers outside LATAM. |

Both Stripe and MercadoPago share a webhook-driven event model, which maps cleanly
onto the architecture defined in ADR-003. MercadoPago's specifics (IPN vs webhooks,
regional quirks) are documented per-integration.

### Messaging / WhatsApp

**Both providers implemented: Meta Cloud API (direct) and Twilio.**

The goal is to cover the full spectrum of client scenarios:

| Provider | Status | Use case |
|---|---|---|
| **Meta Cloud API** | Implemented | Clients with Meta Business Manager approval. No per-message cost beyond infra. Full control over the WhatsApp Business Account. |
| **Twilio** | Implemented | Clients without Meta approval or who prefer a managed service. Faster setup, per-message cost. |

Each provider has its own edge function with different webhook formats and validation:

| | Meta Cloud API | Twilio |
|---|---|---|
| Endpoint | `webhooks-whatsapp-meta` | `webhooks-whatsapp-twilio` |
| Webhook format | JSON | Form-encoded |
| Verification | `X-Hub-Signature-256` + GET challenge | `X-Twilio-Signature` |
| provider value | `whatsapp_meta` | `whatsapp_twilio` |

Both functions write to the same `webhook_events` and `messages` tables.
The `provider` field distinguishes the source. No schema changes are needed to add either provider.

## Consequences

**Benefits realized:**

- Stripe + MercadoPago covers the vast majority of payment scenarios for LATAM-focused
  freelance and startup clients.
- Implementing both Meta and Twilio demonstrates the provider-agnostic architecture in
  practice, not just in theory — two different webhook formats, same data model.
- The system can serve clients at different stages of Meta Business approval without
  architectural changes.

**Accepted tradeoffs:**

- Two edge functions to maintain instead of one. Acceptable: the shared data model means
  business logic changes apply once regardless of provider.
- MercadoPago's API has regional inconsistencies. These are handled per-integration
  and documented in the relevant edge function.
- Meta Cloud API requires a verified Meta Business account for production use. Local
  development uses webhook simulation via Postman.
