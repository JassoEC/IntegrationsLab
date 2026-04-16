# ADR-001: Supabase over a custom backend

**Date:** 2026-04-16
**Status:** Accepted

## Context

This project's goal is to demonstrate integration patterns with real external APIs —
not to build backend infrastructure. In a freelance context, every hour spent
constructing boilerplate (auth, database, API routing, deployment) is an hour not
spent delivering business value.

The project also needs to be usable as a portfolio piece and as a reusable base for
future client projects, which means it must be fast to start, cheap to run, and easy
to hand off.

## Decision

Use **Supabase** as the backend platform instead of building a custom backend from
scratch (e.g., Express, Fastify, or NestJS on a VPS or container).

Supabase provides out of the box:

- **Postgres database** with a REST and GraphQL API auto-generated from the schema
- **Auth** with JWT, email/password, OAuth, and magic links — no implementation required
- **Edge Functions** (Deno) for custom logic close to the user
- **Row Level Security (RLS)** for data access control at the database level
- **Local development environment** via the Supabase CLI, matching production behavior
- **Free tier** sufficient for MVPs and portfolio projects with zero operational cost at start

## Consequences

**Accepted tradeoffs:**

- Vendor dependency on Supabase. Mitigated by the fact that the integration logic lives
  in Edge Functions, which are standard Deno/TypeScript and portable.
- Less control over the database server configuration. Acceptable for this scope.

**Benefits realized:**

- Integration work starts immediately, without weeks of backend scaffolding.
- The same platform scales from a zero-cost prototype to a production system without
  architectural changes.
- Documented, mature ecosystem with strong community support reduces debugging time.

## Alternatives considered

| Option | Reason rejected |
|---|---|
| Express + PostgreSQL on a VPS | Requires provisioning, deployment pipeline, and auth implementation. Adds weeks of non-integration work. |
| NestJS | Powerful but heavy for an API that primarily proxies external services. |
| Firebase | NoSQL model is a poor fit for relational payment and messaging data. |
