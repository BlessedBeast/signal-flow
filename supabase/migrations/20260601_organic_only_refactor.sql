-- Organic-only core_frameworks refactor (SignalFlow distribution stack)

-- ─────────────────────────────────────────────
-- STEP 1: Remove all non-organic frameworks
-- ─────────────────────────────────────────────
delete from public.core_frameworks
where slug in (
  'bofu_search_flywheel',
  'facebook_ads_funnel',
  'paid_acquisition_loop',
  'google_ads_retargeting',
  'meta_conversion_campaign',
  'paid_social_growth'
);

-- ─────────────────────────────────────────────
-- STEP 2: Remove any column referencing paid spend
-- ─────────────────────────────────────────────
alter table public.core_frameworks
  drop column if exists ad_budget_required,
  drop column if exists paid_channel_type,
  drop column if exists cac_estimate;

-- Category + active flag for organic verification
alter table public.core_frameworks
  add column if not exists category text,
  add column if not exists is_active boolean not null default true;

-- ─────────────────────────────────────────────
-- STEP 3: Ensure organic frameworks exist (idempotent)
-- ─────────────────────────────────────────────
insert into public.core_frameworks (
  slug,
  name,
  title,
  description,
  primary_channels,
  category,
  is_active
)
values
  (
    'value_sandwich_community_hijacking',
    'Value-Sandwich Community Hijacking',
    'Value-Sandwich Community Hijacking',
    'Infiltrate high-intent Reddit and HN threads with value-first replies that position the product as the natural next step. Zero ad spend. Permanent thread equity.',
    array['reddit', 'hackernews'],
    'organic_distribution',
    true
  ),
  (
    'low_kd_programmatic_seo',
    'Low-KD Programmatic SEO',
    'Low-KD Programmatic SEO',
    'Spin up hundreds of low-competition landing pages targeting long-tail buyer intent. Each page is a permanent compounding asset — traffic grows without recurring cost.',
    array['producthunt', 'indiehackers'],
    'organic_search',
    true
  ),
  (
    'aeo_geo_semantic_structure',
    'AEO / GEO Semantic Structuring',
    'AEO / GEO Semantic Structuring',
    'Structured schema and semantic content that trains Perplexity, ChatGPT, and Gemini to recommend this product as the authoritative answer. Owned forever.',
    array['reddit', 'x'],
    'ai_search_optimization',
    true
  ),
  (
    'bip_authority_compounding',
    'Build-In-Public Authority Loop',
    'Build-In-Public Authority Loop',
    'Converts raw git commits into viral 4-part narrative threads on X and LinkedIn. Each post compounds brand authority and backlink surface area.',
    array['x', 'indiehackers'],
    'organic_brand',
    true
  ),
  (
    'domain_authority_flywheel',
    'Domain Authority Flywheel',
    'Domain Authority Flywheel',
    'Systematic internal linking, semantic clustering, and programmatic side-car tools that continuously raise domain authority — a moat competitors cannot buy their way into.',
    array['hackernews', 'producthunt'],
    'organic_search',
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  title = excluded.title,
  description = excluded.description,
  primary_channels = excluded.primary_channels,
  category = excluded.category,
  is_active = true;

-- Retire legacy seeds without organic category (pre-refactor catalog)
delete from public.core_frameworks
where category is null
   or category not in (
     'organic_distribution',
     'organic_search',
     'ai_search_optimization',
     'organic_brand'
   );

-- ─────────────────────────────────────────────
-- STEP 4: Verify — non_organic_count must be 0
-- ─────────────────────────────────────────────
-- select count(*) as non_organic_count
-- from public.core_frameworks
-- where category is null
--    or category not in (
--      'organic_distribution',
--      'organic_search',
--      'ai_search_optimization',
--      'organic_brand'
--    );
