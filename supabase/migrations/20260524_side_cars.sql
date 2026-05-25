-- Side-Car Factory generated micro-tool storage
create table if not exists public.side_cars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tool_name text not null,
  concept_pitch text not null,
  export_html_code text not null,
  created_at timestamptz not null default now()
);

create index if not exists side_cars_user_id_idx
  on public.side_cars (user_id, created_at desc);

alter table public.side_cars enable row level security;

drop policy if exists "side_cars_select_own" on public.side_cars;
create policy "side_cars_select_own"
  on public.side_cars
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "side_cars_insert_own" on public.side_cars;
create policy "side_cars_insert_own"
  on public.side_cars
  for insert
  to authenticated
  with check (auth.uid() = user_id);
