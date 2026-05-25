-- Billing tier for Daily Drop quota + monthly ledger caps
alter table public.profiles
  add column if not exists subscription_tier text not null default 'hobbyist'
    check (subscription_tier in ('hobbyist', 'indie_pro', 'growth_studio'));

comment on column public.profiles.subscription_tier is
  'Stripe-linked plan: hobbyist (1 drop/day), indie_pro (15), growth_studio (30).';
