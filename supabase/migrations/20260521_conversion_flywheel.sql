-- Winning/lost interaction sequences for reply few-shot flywheel
create table if not exists public.conversion_flywheel (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lead_id uuid,
  platform text not null,
  subreddit text,
  source_url text,
  original_post text not null,
  conversation_history jsonb not null default '[]'::jsonb,
  outcome text not null check (outcome in ('won', 'lost')),
  created_at timestamptz not null default now()
);

create index if not exists conversion_flywheel_platform_idx
  on public.conversion_flywheel (platform, outcome, created_at desc);

create index if not exists conversion_flywheel_user_id_idx
  on public.conversion_flywheel (user_id);

alter table public.conversion_flywheel enable row level security;
