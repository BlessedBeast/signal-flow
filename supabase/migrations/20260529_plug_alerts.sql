-- Plug radar alerts (canonical schema — align with production)
create table if not exists public.plug_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lead_id uuid references public.discovery_leads (id) on delete set null,
  url text not null,
  source_url text not null,
  content text not null default '',
  platform text not null,
  author text not null default '',
  subreddit text,
  post_snippet text not null,
  comments integer not null default 0,
  velocity_score numeric not null default 0,
  velocity_tier text not null check (velocity_tier in ('HOT', 'WARM', 'COLD')),
  tier text not null check (tier in ('HOT', 'WARM', 'COLD')),
  created_at timestamptz not null default now()
);

create index if not exists plug_alerts_user_velocity_idx
  on public.plug_alerts (user_id, velocity_score desc);

create index if not exists plug_alerts_user_created_idx
  on public.plug_alerts (user_id, created_at desc);

alter table public.plug_alerts enable row level security;

drop policy if exists "plug_alerts_select_own" on public.plug_alerts;
create policy "plug_alerts_select_own"
  on public.plug_alerts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "plug_alerts_insert_own" on public.plug_alerts;
create policy "plug_alerts_insert_own"
  on public.plug_alerts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "plug_alerts_delete_own" on public.plug_alerts;
create policy "plug_alerts_delete_own"
  on public.plug_alerts
  for delete
  to authenticated
  using (auth.uid() = user_id);
