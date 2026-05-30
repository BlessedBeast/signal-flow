-- Persistent BIP draft cache (survives browser refresh)
create table if not exists public.generated_drafts_cache (
  user_id uuid not null references auth.users (id) on delete cascade,
  framework_slug text not null,
  draft_text text not null,
  media_directives jsonb not null default '[]'::jsonb,
  compiled_step integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, framework_slug)
);

create index if not exists generated_drafts_cache_user_id_idx
  on public.generated_drafts_cache (user_id);

create index if not exists generated_drafts_cache_updated_at_idx
  on public.generated_drafts_cache (updated_at desc);

comment on table public.generated_drafts_cache is
  'Latest proactive BIP draft per user and framework slug.';

alter table public.generated_drafts_cache enable row level security;

drop policy if exists "generated_drafts_cache_select_own" on public.generated_drafts_cache;
create policy "generated_drafts_cache_select_own"
  on public.generated_drafts_cache
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "generated_drafts_cache_insert_own" on public.generated_drafts_cache;
create policy "generated_drafts_cache_insert_own"
  on public.generated_drafts_cache
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "generated_drafts_cache_update_own" on public.generated_drafts_cache;
create policy "generated_drafts_cache_update_own"
  on public.generated_drafts_cache
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
