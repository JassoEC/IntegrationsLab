# ADR-002: Headless API as the first layer

**Date:** 2026-04-16
**Status:** Accepted

## Context

The system will eventually be consumed by multiple client types: a web dashboard
(Next.js) and a mobile app (React Native/Expo). Building any of these clients before
the API is stable creates a coupling problem — UI decisions leak into API design.

There is also a prioritization question: the core value of this project is demonstrating
**how integrations are implemented correctly**, not how they are consumed. Investing time
in a client layer before the integration layer is solid returns no immediate value.

## Decision

Build the API as a **headless, client-agnostic layer first**.

All business logic lives in Supabase Edge Functions. No client is assumed. The API
contract (documented in OpenAPI) is the only interface, and it must be sufficient on its
own — testable via Postman, consumable by any future client without modification.

Client layers are planned but treated as separate, subsequent iterations:

| Layer | Status |
|---|---|
| Headless API | Current |
| Web dashboard (Next.js) | Planned |
| Mobile app (React Native / Expo) | Planned |

## Consequences

**Accepted tradeoffs:**

- No visual demo for non-technical stakeholders until a client layer exists.
  Mitigated by Redoc (published API docs) and Postman collections as demo artifacts.

**Benefits realized:**

- API design is driven by integration requirements, not by what is convenient to
  render in a specific UI framework.
- Any future client (web, mobile, third-party) consumes the same contract without
  changes to the backend.
- The Postman collection serves as both a functional demo and a testing tool.

## Alternatives considered

| Option | Reason rejected |
|---|---|
| Build Next.js client in parallel | Premature. UI decisions made before the API is stable create rework. |
| Build mobile app first | Same problem, with a higher cost of iteration for backend changes. |
