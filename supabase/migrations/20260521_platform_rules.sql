-- Cached community compliance rules (lazy-loaded via Jina + OpenAI)
create table if not exists public.platform_rules (
  community_key text primary key,
  platform text not null,
  compliance_flags jsonb not null default '[]'::jsonb,
  last_scraped_at timestamptz not null default now()
);

create index if not exists platform_rules_platform_idx on public.platform_rules (platform);

comment on table public.platform_rules is
  'Scraped subreddit / global platform moderation rules for reply compliance.';
