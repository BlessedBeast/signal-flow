-- Align subscription_tier with Indie Builder naming (legacy indie_pro retained in check)
alter table public.profiles
  drop constraint if exists profiles_subscription_tier_check;

alter table public.profiles
  add constraint profiles_subscription_tier_check
  check (
    subscription_tier in (
      'hobbyist',
      'indie_pro',
      'indie_builder',
      'growth_studio'
    )
  );

update public.profiles
set subscription_tier = 'indie_builder'
where subscription_tier = 'indie_pro';

comment on column public.profiles.subscription_tier is
  'Plan tier: hobbyist (1 lead/task), indie_builder (15/3 + BIP), growth_studio (unlimited/5 + Labs).';
