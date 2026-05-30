import {
  PRICING_PAGE_HEADLINE,
  PRICING_PAGE_SUBLINE,
  PRICING_TIERS,
} from "@/components/marketing/pricing-tier-data";

export { PRICING_PAGE_HEADLINE, PRICING_PAGE_SUBLINE, PRICING_TIERS };

export const PRICING_TIER_GATES: Partial<Record<string, string>> = {
  founder:
    "Streak tracking exists because the data is clear: founders who show up 21 consecutive days get their first inbound lead within that window. Founder tier tracks the only metric that matters.",
};

export type PricingFeatureRow = {
  feature: string;
  free: string;
  bootstrapper: string;
  founder: string;
};

export const PRICING_FEATURE_ROWS: readonly PricingFeatureRow[] = [
  { feature: "PRODUCT VAULTS", free: "1", bootstrapper: "1", founder: "1" },
  { feature: "LEAD TRACKING QUERIES", free: "1", bootstrapper: "3", founder: "10" },
  { feature: "LEADS PER DAY", free: "1", bootstrapper: "10", founder: "50" },
  {
    feature: "LEAD FETCH STYLE",
    free: "Manual",
    bootstrapper: "Manual",
    founder: "5 AM Automated Delivery",
  },
  { feature: "PARALLEL CAMPAIGNS", free: "1", bootstrapper: "1", founder: "3" },
  { feature: "1-CLICK REPLY PIPELINE", free: "—", bootstrapper: "✓", founder: "✓" },
  { feature: "PRE-PUBLISH VALIDATOR", free: "—", bootstrapper: "✓", founder: "✓" },
  { feature: "DAILY OS CHECKLIST", free: "—", bootstrapper: "—", founder: "✓" },
  { feature: "STREAK TRACKING", free: "—", bootstrapper: "—", founder: "✓" },
  { feature: "URL ANALYZER", free: "✓", bootstrapper: "✓", founder: "✓" },
  { feature: "VOICE SYNTHESIS", free: "✓", bootstrapper: "✓", founder: "✓" },
];

export const PRICING_FAQ_ITEMS = [
  {
    q: "Is there a free trial?",
    a: "Yes. Bootstrapper is $9.90 for your first month. Free Sandbox is $0 forever with proof-of-fit limits. If you don't find one lead worth replying to in 30 days, cancel in two clicks.",
  },
  {
    q: "Can I upgrade or downgrade anytime?",
    a: "Yes. Upgrades take effect immediately. Downgrades take effect at your next billing cycle. Your vault and history are always preserved.",
  },
  {
    q: "What counts as a 'lead'?",
    a: "A lead is a Reddit post, LinkedIn thread, or X conversation where someone is actively describing the problem your product solves. We don't count brand mentions, news articles, or low-intent noise.",
  },
  {
    q: "Is there a limit on AI generation?",
    a: "No. You can generate as many drafts, replies, and framework posts as you need. The limits are on lead volume and tracking queries — not on AI output.",
  },
  {
    q: "Do you store my Reddit or LinkedIn credentials?",
    a: "No. You enter your platform stats (karma, follower count, account age) manually during setup. We never ask for passwords or OAuth access to your social accounts.",
  },
  {
    q: "What if I'm not technical?",
    a: "The URL analyzer works on any publicly accessible website. Setup takes under 10 minutes. No code, no integrations, no API keys. If you can paste a URL, you can use SignalFlow.",
  },
] as const;

export const PRICING_CLOSING = {
  headline: "Start with your URL. Everything else follows.",
  body: "Paste your product URL. We'll run your distribution audit for free — no account required. If the gaps we find don't surprise you, you don't need SignalFlow. If they do, you know where to start.",
  primaryCta: "Scan my URL — free, 30 seconds",
  primaryHref: "/",
  secondaryCta: "Start validating free →",
  secondaryHref: "/signup?tier=free",
} as const;
