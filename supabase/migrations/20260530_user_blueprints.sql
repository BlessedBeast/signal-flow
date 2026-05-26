-- Master Strategy Blueprint — persistent north star per workspace
create table if not exists public.user_blueprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  chosen_frameworks text[] not null default '{}',
  macro_rationale text not null default '',
  target_audience_summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_blueprints_user_id_unique unique (user_id)
);

create index if not exists user_blueprints_user_id_idx
  on public.user_blueprints (user_id);

comment on table public.user_blueprints is
  'Onboarding-generated master marketing roadmap: chosen core frameworks + macro rationale.';

alter table public.user_blueprints enable row level security;

drop policy if exists "user_blueprints_select_own" on public.user_blueprints;
create policy "user_blueprints_select_own"
  on public.user_blueprints
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_blueprints_insert_own" on public.user_blueprints;
create policy "user_blueprints_insert_own"
  on public.user_blueprints
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_blueprints_update_own" on public.user_blueprints;
create policy "user_blueprints_update_own"
  on public.user_blueprints
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
