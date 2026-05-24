-- Product DNA vault + mining lock columns on profiles
alter table public.profiles
  add column if not exists product_dna jsonb,
  add column if not exists is_mining boolean not null default false,
  add column if not exists mining_started_at timestamptz,
  add column if not exists last_mined_at timestamptz;

comment on column public.profiles.product_dna is
  'Structured ProductDNA JSON from onboarding analysis pipeline.';
