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
id
provider
from_number
to_number
message
status
created_at
```

### payments

``` sql
payments
--------
id
provider
amount
currency
status
external_id
created_at
```

### webhook_events

``` sql
webhook_events
--------------
id
provider
event_type
payload
created_at
```

Esta tabla permite:

-   debugging
-   replay de eventos
-   auditoría

------------------------------------------------------------------------

# Fase 2 --- Integración WhatsApp

Primer proveedor porque valida la arquitectura de eventos.

Endpoint:

    /webhooks/whatsapp

Flujo:

    WhatsApp
       │
       │ webhook
       ▼
    edge function
       │
       ├ guardar evento
       ├ guardar mensaje
       └ responder

Ejemplo simplificado:

``` ts
export async function handler(req: Request) {

  const payload = await req.json()

  // guardar webhook
  await db.insert("webhook_events", {
     provider: "whatsapp",
     payload
  })

  // guardar mensaje
  await db.insert("messages", {
     provider: "whatsapp",
     message: payload.text
  })

  return new Response("ok")
}
```

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
