-- 1-Click inbound comment replier interaction log
create table if not exists public.inbound_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('x', 'linkedin')),
  original_thread text not null,
  generated_replies jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists inbound_interactions_user_id_idx
  on public.inbound_interactions (user_id, created_at desc);

alter table public.inbound_interactions enable row level security;

drop policy if exists "inbound_interactions_select_own" on public.inbound_interactions;
create policy "inbound_interactions_select_own"
  on public.inbound_interactions
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "inbound_interactions_insert_own" on public.inbound_interactions;
create policy "inbound_interactions_insert_own"
  on public.inbound_interactions
  for insert
  to authenticated
  with check (auth.uid() = user_id);
