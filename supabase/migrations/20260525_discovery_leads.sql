-- Lead Bank vault: queued scrape haul + drip-fed active stream
create table if not exists public.discovery_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  source_url text not null,
  platform text,
  content text,
  intent_score integer,
  status text not null default 'queued'
    check (status in ('queued', 'active', 'drafted', 'replied', 'archived')),
  released_at timestamptz,
  ai_draft_content text,
  conversation_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint discovery_leads_user_source_url_unique unique (user_id, source_url)
);

create index if not exists discovery_leads_user_status_idx
  on public.discovery_leads (user_id, status);

create index if not exists discovery_leads_user_intent_idx
  on public.discovery_leads (user_id, intent_score desc);

create index if not exists discovery_leads_source_url_idx
  on public.discovery_leads (source_url);

alter table public.discovery_leads enable row level security;

drop policy if exists "discovery_leads_select_own" on public.discovery_leads;
create policy "discovery_leads_select_own"
  on public.discovery_leads
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "discovery_leads_insert_own" on public.discovery_leads;
create policy "discovery_leads_insert_own"
  on public.discovery_leads
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "discovery_leads_update_own" on public.discovery_leads;
create policy "discovery_leads_update_own"
  on public.discovery_leads
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
