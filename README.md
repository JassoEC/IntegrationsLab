# Integration Sandbox -- Arquitectura y Plan de Implementación

Proyecto orientado a practicar **integraciones reales con APIs
externas** usando un backend **serverless con Supabase**.

Objetivo del proyecto:

-   Practicar integraciones con APIs reales
-   Diseñar arquitectura basada en **webhooks y eventos**
-   Documentar APIs con **OpenAPI / Swagger**
-   Publicar colección de **Postman**
-   Crear un **Integration Sandbox reutilizable** para futuros proyectos

------------------------------------------------------------------------

# Arquitectura General

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

    API pública documentada
    (OpenAPI / Swagger)

    Testing
    (Postman Collection)

El sistema se construye **por capas de complejidad**.

Primero se implementa **WhatsApp**, luego **Stripe**, y finalmente
**MercadoPago**.

------------------------------------------------------------------------

# Fase 0 --- Setup

Crear proyecto:

    integration-sandbox

Inicializar Supabase:

``` bash
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

------------------------------------------------------------------------

# Fase 1 --- Dominio Base

Definir un dominio neutral para integraciones.

## Tablas principales

### messages

``` sql
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

``` sql
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

``` sql
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

Esta tabla permite:

-   debugging
-   replay de eventos
-   auditoría

------------------------------------------------------------------------

# Fase 2 --- Integración WhatsApp

Primer proveedor porque valida la arquitectura de eventos.

Se implementan dos proveedores para cubrir el espectro completo de escenarios:

    Provider         Endpoint                       Caso de uso
    ---------------- ------------------------------ ----------------------------------
    Meta Cloud API   webhooks-whatsapp-meta         Clientes con Meta Business approval
    Twilio           webhooks-whatsapp-twilio       Clientes sin approval / managed

Flujo (igual para ambos proveedores):

    WhatsApp provider
       │
       │ POST webhook
       ▼
    edge function
       │
       ├─ 1. validate signature
       ├─ 2. store raw event  →  webhook_events (status: pending)
       ├─ 3. store message    →  messages
       ├─ 4. mark processed   →  webhook_events (status: processed)
       └─ 5. return 200

Diferencias por proveedor:

    Meta Cloud API                    Twilio
    --------------------------------- ---------------------------------
    JSON body                         Form-encoded body
    X-Hub-Signature-256 validation    X-Twilio-Signature validation
    GET challenge on setup            No challenge required
    provider = 'whatsapp_meta'        provider = 'whatsapp_twilio'

------------------------------------------------------------------------

# Fase 3 --- API Interna

Endpoints del sistema:

    /messages/send
    /messages/list
    /payments/create
    /payments/list

Ejemplo request:

    POST /messages/send

``` json
{
 "provider": "whatsapp",
 "to": "+521xxxxxxxx",
 "message": "Hola"
}
```

Esto desacopla el dominio de los proveedores externos.

------------------------------------------------------------------------

# Fase 4 --- Documentación OpenAPI

Archivo:

    docs/openapi.yaml

Ejemplo:

``` yaml
openapi: 3.0.0
info:
  title: Integration Sandbox
  version: 1.0

paths:
  /messages/send:
    post:
      summary: Send message

  /webhooks/whatsapp:
    post:
      summary: WhatsApp webhook
```

La documentación puede publicarse con:

-   Swagger UI
-   Redoc

------------------------------------------------------------------------

# Fase 5 --- Postman Collection

Estructura sugerida:

    Integration Sandbox

    Messaging
       send message
       list messages

    Webhooks
       simulate whatsapp webhook

    Payments
       create payment

Esto permite probar el sistema **sin interfaz UI**.

------------------------------------------------------------------------

# Fase 6 --- Integración Stripe

Endpoints:

    /payments/create?provider=stripe
    /webhooks/stripe

Flujo:

    client
       │
       │ create payment
       ▼
    edge function
       │
       ▼
    Stripe checkout

    Stripe webhook
       │
       ▼
    /webhooks/stripe
       │
       ▼
    payments.status = paid

------------------------------------------------------------------------

# Fase 7 --- Integración MercadoPago

Webhook:

    /webhooks/mercadopago

Flujo:

    create preference
       │
    user pays
       │
    MercadoPago webhook
       │
    payments.status = approved

------------------------------------------------------------------------

# Fase 8 --- Automatización de Eventos

Ejemplo:

    payment succeeded
           │
           ▼
    send whatsapp confirmation

Pipeline:

    Stripe webhook
       │
       ▼
    update payment
       │
       ▼
    trigger send message

------------------------------------------------------------------------

# Estructura Final del Repositorio

    integration-sandbox
    │
    ├ supabase
    │  ├ migrations
    │  └ functions
    │        ├ webhooks-whatsapp
    │        ├ webhooks-stripe
    │        ├ webhooks-mercadopago
    │        ├ payments-create
    │        └ messages-send
    │
    ├ docs
    │   openapi.yaml
    │
    ├ postman
    │   collection.json
    │
    └ README.md

------------------------------------------------------------------------

# Orden Recomendado de Implementación

1.  Supabase project
2.  tablas base
3.  webhook_events logging
4.  WhatsApp webhook
5.  Swagger docs
6.  Postman collection
7.  Stripe payments
8.  MercadoPago payments

------------------------------------------------------------------------

# Resultado Final

Un **Integration Sandbox API** con:

-   WhatsApp messaging
-   Stripe payments
-   MercadoPago payments
-   Webhook logging
-   OpenAPI documentation
-   Postman collection

Este proyecto puede usarse para:

-   portafolio técnico
-   pruebas de integración
-   demos con clientes
-   base reutilizable para proyectos freelance
