-- Counter-pitch battlecards keyed by competitor brand name
alter table public.profiles
  add column if not exists competitor_battlecards jsonb not null default '{}'::jsonb;

comment on column public.profiles.competitor_battlecards is
  'Map of competitor brand name -> counter-pitch battlecard notes.';

-- Enable Realtime on profiles (run in Supabase SQL editor if replication not auto-enabled)
-- alter publication supabase_realtime add table public.profiles;
