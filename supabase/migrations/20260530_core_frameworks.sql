-- Growth playbooks catalog (referenced by blueprint + reflection engines)
create table if not exists public.core_frameworks (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  title text not null,
  description text not null default '',
  primary_channels text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.core_frameworks enable row level security;

drop policy if exists "core_frameworks_select_authenticated" on public.core_frameworks;
create policy "core_frameworks_select_authenticated"
  on public.core_frameworks
  for select
  to authenticated
  using (true);

insert into public.core_frameworks (slug, name, title, description, primary_channels)
values
  (
    'reddit-intent-mining',
    'Reddit Intent Mining',
    'Reddit Community Sprint',
    'High-intent thread interception on Reddit with compliance-first reply patterns.',
    array['reddit']
  ),
  (
    'linkedin-seo-authority',
    'LinkedIn & SEO Authority',
    'LinkedIn & SEO Blueprint',
    'Founder-led LinkedIn distribution paired with search-optimized content loops.',
    array['x', 'indiehackers']
  ),
  (
    'build-in-public-x',
    'Build in Public on X',
    'BIP Timeline Engine',
    'Chronological public building narrative on X with milestone-driven posts.',
    array['x']
  ),
  (
    'hn-launch-radar',
    'Hacker News Launch Radar',
    'HN Launch Radar',
    'Ask HN and Show HN timing with technical founder positioning.',
    array['hackernews']
  ),
  (
    'indie-hackers-distribution',
    'Indie Hackers Distribution',
    'Indie Hackers Outreach',
    'Peer founder conversations and soft validation threads on Indie Hackers.',
    array['indiehackers']
  ),
  (
    'product-hunt-launch',
    'Product Hunt Launch',
    'Product Hunt Launch Playbook',
    'Discussion mining and launch-week comment strategy on Product Hunt.',
    array['producthunt']
  )
on conflict (slug) do nothing;
