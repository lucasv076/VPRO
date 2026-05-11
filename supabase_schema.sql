-- ViewerPulse schema
-- Uitvoeren in Supabase SQL Editor

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null,
  origineel_bericht text not null,
  volledige_context text not null,
  is_spam boolean not null default false,
  type text not null check (type in ('vraag', 'klacht', 'tip', 'ervaring', 'overig')),
  onderwerp text not null,
  samenvatting text not null,
  sentiment text not null check (sentiment in ('positief', 'neutraal', 'negatief')),
  prioriteit integer not null check (prioriteit between 1 and 5),
  trefwoorden text[] not null default '{}',
  compleetheid_score integer not null check (compleetheid_score between 1 and 10),
  status text not null default 'nieuw' check (status in ('nieuw', 'in_behandeling', 'afgehandeld', 'gearchiveerd')),
  labels text[] not null default '{}',
  ingediend_op timestamptz not null default now()
);

-- Index voor tenant filtering
create index if not exists submissions_tenant_id_idx on submissions (tenant_id);
create index if not exists submissions_status_idx on submissions (status);
create index if not exists submissions_type_idx on submissions (type);

-- Row Level Security aan
alter table submissions enable row level security;

-- Service role heeft altijd toegang (voor API routes)
create policy "service_role_all" on submissions
  for all using (true);
