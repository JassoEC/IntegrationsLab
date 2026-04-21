# IntegrationsLab

English · [Español](README.es.md)

---

A sandbox for building and testing real-world API integrations on a
**serverless Supabase backend**.

What this project contains:

- **WhatsApp messaging** via Twilio and Meta Cloud API
- **Webhook pipeline** with signature validation, event logging, and auto-reply automation
- **Operator inbox dashboard** (Next.js) with real-time conversation threading
- **OpenAPI documentation** (ReDoc)
- **Postman collection** for end-to-end testing without spending provider quota

---

# Architecture

    Internet
       │
       │ Webhooks / API calls
       ▼
    Supabase Edge Functions
       │
       ├── WhatsApp Integration
       ├── Payment Integrations
       │       ├ Stripe
       │       └ MercadoPago
       │
       ▼
    Postgres (Supabase)

    Public API documented with OpenAPI / Swagger
    Testing via Postman Collection

The system is built in layers of increasing complexity:
WhatsApp first (validates event architecture), then Stripe, then MercadoPago.

---

# Phase 0 — Setup

Initialize Supabase:

```bash
supabase init
supabase start
```

Initial structure:

    supabase/
       functions/
       migrations/

    docs/
       openapi.yaml

    postman/
       collection.json

---

# Phase 1 — Base Domain

### messages

```sql
messages
--------
id           uuid, primary key
provider     text              -- 'whatsapp'
direction    text              -- 'inbound' | 'outbound'
from_number  text
to_number    text
body         text
media_url    text              -- attachments (images, audio, documents)
external_id  text              -- provider message ID (e.g. Twilio MessageSid)
status       text              -- queued | sent | delivered | received | failed
error        text              -- failure reason if status = 'failed'
created_at   timestamptz
updated_at   timestamptz
```

### payments

```sql
payments
--------
id           uuid, primary key
provider     text              -- 'stripe' | 'mercadopago' | 'paypal'
amount       numeric(12,2)
currency     text              -- ISO 4217 (USD, MXN, ARS, BRL...)
status       text              -- pending | processing | succeeded | failed | refunded
external_id  text              -- provider payment ID
payment_url  text              -- checkout URL sent to the customer
metadata     jsonb             -- provider-specific fields
error        text              -- failure reason if status = 'failed'
created_at   timestamptz
updated_at   timestamptz
```

### webhook_events

```sql
webhook_events
--------------
id            uuid, primary key
provider      text              -- 'whatsapp' | 'stripe' | 'mercadopago'
event_type    text              -- e.g. 'payment.succeeded', 'message.received'
payload       jsonb             -- full raw payload, unmodified
status        text              -- pending | processed | failed
error         text              -- processing error if status = 'failed'
processed_at  timestamptz
created_at    timestamptz
```

This table supports debugging, event replay, and audit trails.

---

# Phase 2 — WhatsApp Integration

WhatsApp is implemented first because it validates the full event architecture.
Two providers are supported to cover the complete spectrum of scenarios:

    Provider         Endpoint                       Use case
    ---------------- ------------------------------ ----------------------------------
    Meta Cloud API   webhooks-whatsapp-meta         Clients with Meta Business approval
    Twilio           webhooks-whatsapp-twilio       Clients without approval / managed

## Module architecture

    whatsapp-gateway
       │
       ├─ outbound messaging   →  messages-send
       ├─ inbound webhook      →  webhooks-whatsapp-twilio / webhooks-whatsapp-meta
       └─ webhook validation   →  _shared/twilio.ts / _shared/meta.ts

    conversation-service
       │
       ├─ contacts             →  contacts table (upsert by phone_number)
       ├─ conversations        →  conversations table (one open per contact)
       └─ messages             →  messages table (with conversation_id + contact_id)

    automation-engine
       │
       └─ trigger responses    →  _shared/automation.ts (keyword-based auto-reply)

    api layer
       │
       ├─ send message         →  POST /messages-send
       ├─ conversations        →  GET  /conversations-list
       └─ messages             →  GET  /conversations-get/:id  (with embedded messages)

## Inbound flow

    WhatsApp provider
       │
       │ POST webhook
       ▼
    edge function
       │
       ├─ 1. validate signature        (HMAC-SHA1 Twilio / HMAC-SHA256 Meta)
       ├─ 2. store raw event       →   webhook_events (status: pending)
       ├─ 3. store message         →   messages (direction: inbound)
       ├─ 4. upsert contact        →   contacts (by phone_number)
       ├─ 5. upsert conversation   →   conversations (open, one per contact)
       ├─ 6. attach message        →   messages.conversation_id + last_message_at
       ├─ 7. auto-reply (optional) →   keyword match → send + store outbound message
       └─ 8. mark processed        →   webhook_events (status: processed)

## Outbound flow (POST /messages-send)

    {to, body, provider}
       │
       ▼
    call provider API  (Twilio Messages API / Meta Graph API v19.0)
       │
       ├─ upsert contact + conversation
       ├─ store outbound message  →  messages (direction: outbound)
       └─ return {id, external_id, conversation_id, status}

## Provider differences

    Meta Cloud API                    Twilio
    --------------------------------- ---------------------------------
    JSON body                         Form-encoded body
    X-Hub-Signature-256 validation    X-Twilio-Signature validation
    GET challenge on setup            No challenge required
    provider = 'whatsapp_meta'        provider = 'whatsapp_twilio'

## Schema additions (migration 20260417224824)

    contacts
    --------
    id           uuid pk
    phone_number text unique          -- upsert key
    display_name text
    metadata     jsonb
    created_at / updated_at

    conversations
    -------------
    id              uuid pk
    contact_id      uuid fk → contacts
    channel         text default 'whatsapp'
    status          text  -- open | closed | pending
    last_message_at timestamptz
    created_at / updated_at

    messages (additions)
    --------------------
    conversation_id uuid fk → conversations
    contact_id      uuid fk → contacts

RLS enabled on all tables. Edge functions use the service_role key —
no client-facing auth required at this layer.

---

# Phase 3 — Internal API

    /messages/send
    /messages/list
    /payments/create
    /payments/list

Example request:

    POST /messages/send

```json
{
  "provider": "whatsapp",
  "to": "+521xxxxxxxx",
  "message": "Hello"
}
```

---

# Phase 4 — OpenAPI Documentation

File: `docs/openapi.yaml`

```yaml
openapi: 3.0.0
info:
  title: IntegrationsLab
  version: 1.0

paths:
  /messages/send:
    post:
      summary: Send message

  /webhooks/whatsapp:
    post:
      summary: WhatsApp webhook
```

Published via ReDoc (static HTML at `docs/index.html`, hosted on GitHub Pages).

---

# Phase 5 — Postman Collection

    IntegrationsLab

    Messaging
       Send message

    WhatsApp Webhooks
       Twilio — Simulate inbound (local, no Twilio quota)
       Meta — Simulate inbound

    Payments
       Create payment

Import from: `postman/collection.json`

---

# Phase 6 — Stripe Integration

    /payments/create?provider=stripe
    /webhooks/stripe

Flow:

    client
       │ create payment
       ▼
    edge function → Stripe checkout

    Stripe webhook
       │
       ▼
    /webhooks/stripe → payments.status = paid

---

# Phase 7 — MercadoPago Integration

    /webhooks/mercadopago

Flow:

    create preference → user pays → MercadoPago webhook → payments.status = approved

---

# Phase 8 — Event Automation

Example:

    payment succeeded
           │
           ▼
    send WhatsApp confirmation

Pipeline:

    Stripe webhook → update payment → trigger send message

---

# Repository Structure

    IntegrationsLab/
    │
    ├ supabase/
    │  ├ migrations/
    │  │    ├ 20260416142654_create_base_tables.sql
    │  │    └ 20260417224824_conversation_service.sql
    │  │
    │  └ functions/
    │       ├ _shared/
    │       │    ├ twilio.ts         ← validateTwilioSignature + sendTwilioMessage
    │       │    ├ meta.ts           ← validateMetaSignature + sendMetaMessage
    │       │    ├ conversation.ts   ← upsertContact, upsertConversation, attach
    │       │    └ automation.ts     ← getAutoReply (keyword triggers)
    │       │
    │       ├ webhooks-whatsapp-twilio
    │       ├ webhooks-whatsapp-meta
    │       ├ webhooks-stripe
    │       ├ webhooks-mercadopago
    │       ├ messages-send
    │       ├ conversations-list
    │       ├ conversations-get
    │       └ payments-create
    │
    ├ dashboard/               ← Next.js operator inbox
    │
    ├ docs/
    │   ├ openapi.yaml
    │   └ index.html           ← ReDoc (GitHub Pages)
    │
    ├ postman/
    │   └ collection.json
    │
    └ README.md

---

# Final Result

An **Integration Sandbox API** with:

- WhatsApp messaging (Twilio + Meta Cloud API)
- Stripe payments
- MercadoPago payments
- Webhook logging and replay
- OpenAPI documentation (ReDoc)
- Postman collection
