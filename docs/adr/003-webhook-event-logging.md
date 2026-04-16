# ADR-003: Persist all webhook events before processing

**Date:** 2026-04-16
**Status:** Accepted

## Context

Distributed systems receive events from external providers (Stripe, MercadoPago,
WhatsApp) that are outside our control. These providers send a webhook once — if the
handler fails, crashes, or has a bug, the event is lost.

A common mistake is to process the event inline: receive the webhook, execute business
logic, return a response. This couples reception to processing and makes failures
unrecoverable.

The architecture of this system must reflect a core principle of distributed systems:
**you do not need to do everything in one place**. Event reception and event processing
are separate responsibilities and should be treated as such.

## Decision

Every incoming webhook is **persisted to the `webhook_events` table immediately**,
before any business logic runs. Processing happens after storage is confirmed.

```
External provider (Stripe / MercadoPago / WhatsApp)
    │
    │  POST /webhooks/:provider
    ▼
Edge Function
    │
    ├─ 1. Store raw payload in webhook_events   ← always first
    │
    └─ 2. Process business logic                ← only after storage
```

The `webhook_events` table stores:

- `provider` — which external system sent the event
- `event_type` — what happened (e.g., `payment.succeeded`)
- `payload` — the full raw JSON, unmodified
- `created_at` — when it was received

## Consequences

**Benefits realized:**

- **Auditability:** every event received is on record, regardless of what happened next.
- **Replay:** if processing logic has a bug, events can be reprocessed from storage
  without waiting for the provider to resend them.
- **Debugging:** the raw payload is always available to inspect what the provider
  actually sent, not what we assumed they sent.
- **Decoupling:** the reception layer (edge function) is stable; business logic can
  change without risking event loss.

**Accepted tradeoffs:**

- Small write overhead on every webhook. Acceptable given the low frequency of
  payment and messaging events relative to database capacity.

## Alternatives considered

| Option | Reason rejected |
|---|---|
| Process inline, no persistence | Event loss on any failure. No audit trail. Not acceptable for payment events. |
| Queue (e.g., SQS, Inngest) | Valid for high volume, but adds infrastructure complexity that is out of scope for this stage. Can be layered in later. |
