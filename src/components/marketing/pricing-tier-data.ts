export type PricingTierId = "bootstrapper" | "founder" | "agency";

/** Marketing + future enforcement contract — Founder daily lead cap. */
export const FOUNDER_DAILY_LEAD_LIMIT = 50;

export type PricingTier = {
  id: PricingTierId;
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
    id: "bootstrapper",
    title: "Bootstrapper",
    price: "$19/month",
    priceAlt: "(or $9.90 first month)",
    tagline: "For founders validating their first distribution channel.",
    features: [
      "1 product vault",
      "URL analyzer + strategy briefing",
      "Full intake + voice profile synthesis",
      "3 active lead tracking queries",
      "10 leads per day (manual fetch — you click, it runs)",
      "All 6 framework templates",
      "1-click reply pipeline (plug / hype / deflect)",
      "Platform intelligence (Reddit + LinkedIn + X)",
      "Pre-publish validator",
      "1 active framework sequence",
    ],
    cta: "Start validating free →",
    ctaHref: "/signup",
  },
  {
    id: "founder",
    title: "Founder",
    price: "$79/month",
    tagline: "For active indie hackers running a real distribution system.",
    features: [
      "3 product vaults",
      "Automated daily lead fetch (5 AM, runs while you sleep)",
      `${FOUNDER_DAILY_LEAD_LIMIT} leads per day`,
      "10 active lead tracking queries",
      "Sequential framework tracking (multi-step, multi-platform)",
      "Streak system + execution analytics",
      "3 active framework sequences (run parallel campaigns)",
      "Daily OS (morning task checklist, auto-generated)",
      "Priority context weaving (your vault referenced in every output)",
    ],
    cta: "Get started with Founder →",
    ctaHref: "/signup",
    featured: true,
  },
  {
    id: "agency",
    title: "Agency / Studio",
    price: "$249/month",
    tagline: "For studios and serial builders running multiple products.",
    features: [
      "Unlimited product vaults",
      "Unlimited lead tracking queries",
      "Unlimited leads per day",
      "Hourly lead monitoring (not just 5 AM — continuous)",
      "Custom framework upload (build your own playbook sequences)",
      "Multi-product dashboard view",
      "White-label output (remove SignalFlow branding from exports)",
    ],
    cta: "Deploy Agency Engine →",
    ctaHref: "/signup",
  },
] as const;

export const PRICING_PAGE_HEADLINE = "One price. One system. One less excuse.";
export const PRICING_PAGE_SUBLINE =
  "No credits. No usage limits on AI generation. Pay for the platform. Use it as much as you need.";
