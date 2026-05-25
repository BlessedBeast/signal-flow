-- GEO Seed Engine footprint storage
create table if not exists public.geo_seeds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  keyword_anchor text not null,
  distribution_target text not null,
  seed_narrative text not null,
  created_at timestamptz not null default now()
);

create index if not exists geo_seeds_user_id_idx
  on public.geo_seeds (user_id, created_at desc);

alter table public.geo_seeds enable row level security;

drop policy if exists "geo_seeds_select_own" on public.geo_seeds;
create policy "geo_seeds_select_own"
  on public.geo_seeds
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "geo_seeds_insert_own" on public.geo_seeds;
create policy "geo_seeds_insert_own"
  on public.geo_seeds
  for insert
  to authenticated
  with check (auth.uid() = user_id);
