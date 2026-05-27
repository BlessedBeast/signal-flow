-- Dual-asset GEO seeds: human narrative + machine JSON-LD markup
alter table public.geo_seeds
  add column if not exists json_ld_schema text;

comment on column public.geo_seeds.json_ld_schema is
  'Raw script type=application/ld+json block for landing-page embedding.';

-- Backfill not required; new generations populate the column.
