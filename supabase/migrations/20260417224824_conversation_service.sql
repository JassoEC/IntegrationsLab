-- Conversation service: contacts, conversations, and message threading.
-- Also enables RLS on all existing tables (missed in initial migration).

-- ---------------------------------------------------------------------------
-- RLS on existing tables
-- ---------------------------------------------------------------------------
alter table public.messages       enable row level security;
alter table public.payments       enable row level security;
alter table public.webhook_events enable row level security;

-- ---------------------------------------------------------------------------
-- contacts
-- One record per unique phone number. Upserted on first inbound or outbound.
-- ---------------------------------------------------------------------------
create table public.contacts (
  id           uuid        primary key default gen_random_uuid(),
  phone_number text        not null unique,
  display_name text,
  metadata     jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.contacts enable row level security;

create trigger contacts_updated_at
  before update on public.contacts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- conversations
-- One open conversation per contact. Closed conversations are archived;
-- a new inbound on a closed thread opens a fresh one.
-- ---------------------------------------------------------------------------
create table public.conversations (
  id              uuid        primary key default gen_random_uuid(),
  contact_id      uuid        not null references public.contacts(id),
  channel         text        not null default 'whatsapp',
  status          text        not null default 'open'
                              check (status in ('open', 'closed', 'pending')),
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.conversations enable row level security;

create trigger conversations_updated_at
  before update on public.conversations
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Thread messages into conversations
-- ---------------------------------------------------------------------------
alter table public.messages
  add column conversation_id uuid references public.conversations(id),
  add column contact_id      uuid references public.contacts(id);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index on public.contacts (phone_number);
create index on public.conversations (contact_id, status);
create index on public.conversations (last_message_at desc nulls last);
create index on public.messages (conversation_id, created_at asc);
