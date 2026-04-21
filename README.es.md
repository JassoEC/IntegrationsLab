# IntegrationsLab

[English](README.md) · Español

---

Sandbox para construir y probar integraciones reales con APIs externas
sobre un backend **serverless en Supabase**.

Contenido del proyecto:

- **Mensajería WhatsApp** vía Twilio y Meta Cloud API
- **Pipeline de webhooks** con validación de firma, registro de eventos y auto-respuesta
- **Panel de operador** (Next.js) con hilos de conversación en tiempo real
- **Documentación OpenAPI** — [jassoec.github.io/IntegrationsLab](https://jassoec.github.io/IntegrationsLab/)
- **Colección Postman** para pruebas end-to-end sin consumir cuota del proveedor

---

# Arquitectura

    Internet
       │
       │ Webhooks / llamadas a la API
       ▼
    Supabase Edge Functions
       │
       ├── Integración WhatsApp
       ├── Integraciones de Pagos
       │       ├ Stripe
       │       └ MercadoPago
       │
       ▼
    Postgres (Supabase)

    API pública documentada con OpenAPI / Swagger
    Pruebas mediante colección Postman

El sistema se construye por capas de complejidad creciente:
primero WhatsApp (valida la arquitectura de eventos), luego Stripe, luego MercadoPago.

---

# Fase 0 — Configuración inicial

Inicializar Supabase:

```bash
supabase init
supabase start
```

Estructura inicial:

    supabase/
       functions/
       migrations/

    docs/
       openapi.yaml

    postman/
       collection.json

---

# Fase 1 — Dominio Base

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
media_url    text              -- adjuntos (imágenes, audio, documentos)
external_id  text              -- ID del mensaje en el proveedor (ej. Twilio MessageSid)
status       text              -- queued | sent | delivered | received | failed
error        text              -- razón del fallo si status = 'failed'
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
external_id  text              -- ID del pago en el proveedor
payment_url  text              -- URL de checkout enviada al cliente
metadata     jsonb             -- campos específicos del proveedor
error        text              -- razón del fallo si status = 'failed'
created_at   timestamptz
updated_at   timestamptz
```

### webhook_events

```sql
webhook_events
--------------
id            uuid, primary key
provider      text              -- 'whatsapp' | 'stripe' | 'mercadopago'
event_type    text              -- ej. 'payment.succeeded', 'message.received'
payload       jsonb             -- payload completo sin modificar
status        text              -- pending | processed | failed
error         text              -- error de procesamiento si status = 'failed'
processed_at  timestamptz
created_at    timestamptz
```

Esta tabla permite depuración, replay de eventos y auditoría.

---

# Fase 2 — Integración WhatsApp

WhatsApp se implementa primero porque valida la arquitectura completa de eventos.
Se soportan dos proveedores para cubrir el espectro completo de escenarios:

    Proveedor        Endpoint                       Caso de uso
    ---------------- ------------------------------ ----------------------------------
    Meta Cloud API   webhooks-whatsapp-meta         Clientes con aprobación Meta Business
    Twilio           webhooks-whatsapp-twilio       Clientes sin aprobación / gestionados

## Arquitectura del módulo

    whatsapp-gateway
       │
       ├─ mensajería saliente  →  messages-send
       ├─ webhook entrante     →  webhooks-whatsapp-twilio / webhooks-whatsapp-meta
       └─ validación webhook   →  _shared/twilio.ts / _shared/meta.ts

    conversation-service
       │
       ├─ contactos            →  tabla contacts (upsert por phone_number)
       ├─ conversaciones       →  tabla conversations (una abierta por contacto)
       └─ mensajes             →  tabla messages (con conversation_id + contact_id)

    automation-engine
       │
       └─ respuestas           →  _shared/automation.ts (auto-respuesta por palabras clave)

    capa de API
       │
       ├─ enviar mensaje       →  POST /messages-send
       ├─ conversaciones       →  GET  /conversations-list
       └─ mensajes             →  GET  /conversations-get/:id  (con mensajes embebidos)

## Flujo inbound

    Proveedor WhatsApp
       │
       │ POST webhook
       ▼
    edge function
       │
       ├─ 1. validar firma           (HMAC-SHA1 Twilio / HMAC-SHA256 Meta)
       ├─ 2. almacenar evento raw →  webhook_events (status: pending)
       ├─ 3. almacenar mensaje    →  messages (direction: inbound)
       ├─ 4. upsert contacto      →  contacts (por phone_number)
       ├─ 5. upsert conversación  →  conversations (abierta, una por contacto)
       ├─ 6. asociar mensaje      →  messages.conversation_id + last_message_at
       ├─ 7. auto-respuesta (op.) →  coincidencia de palabra clave → enviar + almacenar
       └─ 8. marcar procesado     →  webhook_events (status: processed)

## Flujo outbound (POST /messages-send)

    {to, body, provider}
       │
       ▼
    llamar API del proveedor  (Twilio Messages API / Meta Graph API v19.0)
       │
       ├─ upsert contacto + conversación
       ├─ almacenar mensaje saliente  →  messages (direction: outbound)
       └─ retornar {id, external_id, conversation_id, status}

## Diferencias por proveedor

    Meta Cloud API                    Twilio
    --------------------------------- ---------------------------------
    Body JSON                         Body form-encoded
    Validación X-Hub-Signature-256    Validación X-Twilio-Signature
    GET challenge en configuración    No requiere challenge
    provider = 'whatsapp_meta'        provider = 'whatsapp_twilio'

## Adiciones al schema (migración 20260417224824)

    contacts
    --------
    id           uuid pk
    phone_number text unique          -- clave de upsert
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

    messages (adiciones)
    --------------------
    conversation_id uuid fk → conversations
    contact_id      uuid fk → contacts

RLS habilitado en todas las tablas. Las edge functions usan la clave
service_role — no se requiere autenticación del lado del cliente en esta capa.

---

# Fase 3 — API Interna

    /messages/send
    /messages/list
    /payments/create
    /payments/list

Ejemplo de request:

    POST /messages/send

```json
{
  "provider": "whatsapp",
  "to": "+521xxxxxxxx",
  "message": "Hola"
}
```

---

# Fase 4 — Documentación OpenAPI

Archivo: `docs/openapi.yaml`

```yaml
openapi: 3.0.0
info:
  title: IntegrationsLab
  version: 1.0

paths:
  /messages/send:
    post:
      summary: Enviar mensaje

  /webhooks/whatsapp:
    post:
      summary: Webhook WhatsApp
```

Publicado vía ReDoc: **[jassoec.github.io/IntegrationsLab](https://jassoec.github.io/IntegrationsLab/)**

---

# Fase 5 — Colección Postman

    IntegrationsLab

    Mensajería
       Enviar mensaje

    Webhooks WhatsApp
       Twilio — Simular inbound (local, sin consumir cuota)
       Meta — Simular inbound

    Pagos
       Crear pago

Importar desde: `postman/collection.json`

---

# Fase 6 — Integración Stripe

    /payments/create?provider=stripe
    /webhooks/stripe

Flujo:

    cliente
       │ crear pago
       ▼
    edge function → Stripe checkout

    Webhook Stripe
       │
       ▼
    /webhooks/stripe → payments.status = paid

---

# Fase 7 — Integración MercadoPago

    /webhooks/mercadopago

Flujo:

    crear preferencia → usuario paga → webhook MercadoPago → payments.status = approved

---

# Fase 8 — Automatización de Eventos

Ejemplo:

    pago exitoso
           │
           ▼
    enviar confirmación por WhatsApp

Pipeline:

    Webhook Stripe → actualizar pago → disparar envío de mensaje

---

# Estructura del Repositorio

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
    │       │    └ automation.ts     ← getAutoReply (disparadores por palabra clave)
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
    ├ dashboard/               ← Panel de operador (Next.js)
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

# Resultado Final

Un **Integration Sandbox API** con:

- Mensajería WhatsApp (Twilio + Meta Cloud API)
- Pagos con Stripe
- Pagos con MercadoPago
- Registro y replay de webhooks
- Documentación OpenAPI (ReDoc)
- Colección Postman
