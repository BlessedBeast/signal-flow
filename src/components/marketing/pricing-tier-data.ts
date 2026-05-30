export type PricingTierId = "free" | "bootstrapper" | "founder";

/** Marketing + future enforcement contract — Founder daily lead cap. */
export const FOUNDER_DAILY_LEAD_LIMIT = 50;

export type PricingTier = {
  id: PricingTierId;
  headerTag: string;
  title: string;
  price: string;
  priceAlt?: string;
  tagline: string;
  features: readonly string[];
  cta: string;
  ctaHref: string;
  featured?: boolean;
};

export const PRICING_TIERS: readonly PricingTier[] = [
  {
    id: "free",
    headerTag: "1 LEAD / DAY",
    title: "Free Sandbox",
    price: "$0/mo",
    tagline: "Start with proof-of-fit limits to validate distribution channels.",
    features: [
      "1 product vault configuration",
      "1 qualified lead released per day (manual fetch)",
      "1 active lead tracking query",
      "All 6 core framework templates",
      "❌ 1-Click Reply Pipeline locked (requires manual copy-paste)",
      "❌ Pre-publish validation locked",
    ],
    cta: "Start validating free →",
    ctaHref: "/signup?tier=free",
  },
  {
    id: "bootstrapper",
    headerTag: "10 LEADS / DAY",
    title: "Bootstrapper",
    price: "$19/mo",
    tagline: "or $9.90 first month trial",
    features: [
      "1 product vault configuration",
      "10 high-intent leads per day (manual fetch)",
      "3 active lead tracking queries",
      "✓ 1-Click Reply Pipeline unlocked (plug / hype / deflect)",
      "✓ Pre-publish validator",
      "✓ Platform intelligence (Reddit + LinkedIn + X)",
    ],
    cta: "Get started with Bootstrapper →",
    ctaHref: "/signup",
  },
  {
    id: "founder",
    headerTag: "50 LEADS / DAY",
    title: "Founder",
    price: "$49/mo",
    tagline: "For active builders running parallel distribution sequences.",
    features: [
      "1 product vault configuration",
      "50 high-intent leads per day",
      "10 active lead tracking queries",
      "✓ Automated daily lead fetch (5 AM wake-up delivery)",
      "✓ Daily OS (morning task checklist, auto-generated)",
      "✓ 3 active framework sequences running in parallel",
      "✓ Streak tracking engine + execution analytics",
      "✓ Priority context weaving",
    ],
    cta: "Get started with Founder →",
    ctaHref: "/signup",
    featured: true,
  },
] as const;

export const PRICING_PAGE_HEADLINE = "One price. One system. One less excuse.";
export const PRICING_PAGE_SUBLINE =
  "No credits. No usage limits on AI generation. Pay for the platform. Use it as much as you need.";
