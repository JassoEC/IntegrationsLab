-- Base tables for the Automated Notification & Payment System
-- Providers: WhatsApp (Twilio), Stripe, MercadoPago, PayPal
-- See ADR-003 for the webhook_events design rationale.

-- ---------------------------------------------------------------------------
-- webhook_events
-- Stores every raw incoming webhook before any processing occurs.
-- Enables audit, debugging, and event replay.
-- ---------------------------------------------------------------------------
create table webhook_events (
  id            uuid        primary key default gen_random_uuid(),
  provider      text        not null,
  event_type    text        not null,
  payload       jsonb       not null,
  status        text        not null default 'pending'
                            check (status in ('pending', 'processed', 'failed')),
  error         text,
  processed_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- messages
-- Canonical record of every message sent or received across providers.
-- ---------------------------------------------------------------------------
create table messages (
  id           uuid        primary key default gen_random_uuid(),
  provider     text        not null,
  direction    text        not null check (direction in ('inbound', 'outbound')),
  from_number  text        not null,
  to_number    text        not null,
  body         text        not null,
  media_url    text,
  external_id  text,
  status       text        not null default 'received',
  error        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- payments
-- Canonical record of every payment event across providers.
-- ---------------------------------------------------------------------------
create table payments (
  id           uuid           primary key default gen_random_uuid(),
  provider     text           not null,
  amount       numeric(12, 2) not null,
  currency     text           not null,
  status       text           not null default 'pending'
                              check (status in ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
  external_id  text,
  payment_url  text,
  metadata     jsonb,
  error        text,
  created_at   timestamptz    not null default now(),
  updated_at   timestamptz    not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- Keeps updated_at current on every row update for messages and payments.
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger messages_updated_at
  before update on messages
  for each row execute function set_updated_at();

create trigger payments_updated_at
  before update on payments
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index on webhook_events (provider, created_at desc);
create index on webhook_events (status) where status = 'pending';
create index on messages (provider, created_at desc);
create index on messages (external_id);
create index on payments (provider, status, created_at desc);
create index on payments (external_id);
