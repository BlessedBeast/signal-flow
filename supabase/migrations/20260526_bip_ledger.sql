-- Build-in-public narrative memory ledger
create table if not exists public.bip_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  post_type text not null
    check (post_type in ('milestone', 'friction', 'insight', 'ship')),
  post_content text not null,
  current_focus text,
  created_at timestamptz not null default now()
);

create index if not exists bip_ledger_user_created_idx
  on public.bip_ledger (user_id, created_at desc);

alter table public.bip_ledger enable row level security;

drop policy if exists "bip_ledger_select_own" on public.bip_ledger;
create policy "bip_ledger_select_own"
  on public.bip_ledger
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "bip_ledger_insert_own" on public.bip_ledger;
create policy "bip_ledger_insert_own"
  on public.bip_ledger
  for insert
  to authenticated
  with check (auth.uid() = user_id);
