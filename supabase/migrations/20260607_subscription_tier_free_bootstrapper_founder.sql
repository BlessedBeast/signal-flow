-- Align subscription_tier with unified 3-tier model: free, bootstrapper, founder

alter table public.profiles
  drop constraint if exists profiles_subscription_tier_check;

update public.profiles
set subscription_tier = case
  when subscription_tier in ('hobbyist') then 'free'
  when subscription_tier in ('indie_builder', 'indie_pro') then 'bootstrapper'
  when subscription_tier in ('growth_studio', 'agency') then 'founder'
  when subscription_tier in ('free', 'bootstrapper', 'founder') then subscription_tier
  else 'free'
end;

alter table public.profiles
  alter column subscription_tier set default 'free';

alter table public.profiles
  add constraint profiles_subscription_tier_check
  check (subscription_tier in ('free', 'bootstrapper', 'founder'));

comment on column public.profiles.subscription_tier is
  'Plan tier: free (1 lead/query/sequence), bootstrapper (10 leads, reply pipeline), founder (50 leads, auto-fetch, analytics).';
