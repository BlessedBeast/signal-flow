-- Cached platform moderation constraints (LLM-generated, 30-day TTL via application logic)
create table if not exists public.platform_rules_cache (
  platform text not null,
  normalized_location text not null default '',
  constraints_json jsonb not null default '[]'::jsonb,
  last_updated_at timestamptz not null default now(),
  primary key (platform, normalized_location)
);

create index if not exists platform_rules_cache_platform_idx
  on public.platform_rules_cache (platform);

create index if not exists platform_rules_cache_last_updated_idx
  on public.platform_rules_cache (last_updated_at);

comment on table public.platform_rules_cache is
  'Cached LLM-extracted platform constraints keyed by platform + normalized location.';
