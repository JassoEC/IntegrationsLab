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

**Primary approach: WhatsApp Business API via intermediary (Twilio).**

Direct access to the WhatsApp Business API requires Meta approval and infrastructure
setup. Intermediaries like Twilio abstract this complexity while providing a stable,
documented REST API with webhook support.

| Option | Status |
|---|---|
| Twilio (WhatsApp) | Primary implementation |
| Meta Cloud API (direct) | Planned — for clients who already have Meta Business approval |

The integration layer is provider-agnostic by design: swapping the WhatsApp provider
requires only changing the outbound HTTP call in the edge function, not the event model.

## Consequences

**Benefits realized:**

- Stripe + MercadoPago covers the vast majority of payment scenarios for LATAM-focused
  freelance and startup clients.
- Twilio reduces WhatsApp integration time from weeks (Meta approval + infra) to hours.
- The provider-agnostic architecture means adding PayPal or a direct Meta integration
  is additive — no structural changes required.

**Accepted tradeoffs:**

- Twilio adds a per-message cost and an intermediary dependency. Acceptable at this
  stage; migrating to direct Meta API is documented as a future path.
- MercadoPago's API has regional inconsistencies. These are handled per-integration
  and documented in the relevant edge function.
