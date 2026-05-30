-- Per-playbook integer progression for proactive BIP generation sequences
alter table public.profiles
  add column if not exists framework_step_tracking jsonb not null default '{}'::jsonb;

comment on column public.profiles.framework_step_tracking is
  'Maps framework slug → next step integer to compile (e.g. {"reddit-intent-mining": 2}).';
