alter table public.profiles
  add column if not exists current_streak integer not null default 0,
  add column if not exists longest_streak integer not null default 0,
  add column if not exists last_action_at timestamptz;

comment on column public.profiles.current_streak is
  'Current daily retention streak based on completed actions.';

comment on column public.profiles.longest_streak is
  'Best historical retention streak achieved by this founder.';

comment on column public.profiles.last_action_at is
  'Timestamp of last streak-eligible action completion.';
