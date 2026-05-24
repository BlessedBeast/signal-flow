-- Persona context for intent scoring + ensure leads table for miner ingestion
alter table public.profiles
  add column if not exists persona_context text;

comment on column public.profiles.persona_context is
  'Founder voice / ICP notes used during hunt intent scoring.';

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  competitor_id uuid,
  platform text,
  source_url text unique,
  content text,
  intent_score integer,
  status text not null default 'new',
  ai_draft_content text,
  created_at timestamptz not null default now()
);

create index if not exists leads_user_id_idx on public.leads (user_id);
create index if not exists leads_source_url_idx on public.leads (source_url);

alter table public.leads enable row level security;
