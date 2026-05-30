import {
  PRICING_PAGE_HEADLINE,
  PRICING_PAGE_SUBLINE,
  PRICING_TIERS,
} from "@/components/marketing/pricing-tier-data";

export { PRICING_PAGE_HEADLINE, PRICING_PAGE_SUBLINE, PRICING_TIERS };

export const PRICING_TIER_GATES: Record<string, string> = {
  bootstrapper:
    "Tier 1 founders check manually. Tier 2 founders wake up to leads that found them.",
  founder:
    "Streak tracking exists because the data is clear: founders who show up 21 consecutive days get their first inbound lead within that window. Tier 2 tracks the only metric that matters.",
};

export const PRICING_TABLE_GATE =
  "Running one framework is a post. Running three in parallel is a distribution system. The difference is compounding.";

export const PRICING_FEATURE_ROWS = [
  { feature: "Product vaults", bootstrapper: "1", founder: "3", agency: "Unlimited" },
  {
    feature: "Lead tracking queries",
    bootstrapper: "3",
    founder: "10",
    agency: "Unlimited",
  },
  {
    feature: "Leads per day",
    bootstrapper: "10",
    founder: "50",
    agency: "Unlimited",
  },
  { feature: "Lead fetch", bootstrapper: "Manual", founder: "5 AM auto", agency: "Hourly" },
  {
    feature: "Framework sequences",
    bootstrapper: "1",
    founder: "3",
    agency: "Unlimited",
    gateAfter: true,
  },
  { feature: "Daily OS checklist", bootstrapper: "—", founder: "✓", agency: "✓" },
  { feature: "Streak tracking", bootstrapper: "—", founder: "✓", agency: "✓" },
  { feature: "Execution analytics", bootstrapper: "—", founder: "✓", agency: "✓" },
  { feature: "Custom frameworks", bootstrapper: "—", founder: "—", agency: "✓" },
  { feature: "URL analyzer", bootstrapper: "✓", founder: "✓", agency: "✓" },
  { feature: "Voice synthesis", bootstrapper: "✓", founder: "✓", agency: "✓" },
  {
    feature: "Platform intelligence",
    bootstrapper: "✓",
    founder: "✓",
    agency: "✓",
  },
  { feature: "Reply pipeline", bootstrapper: "✓", founder: "✓", agency: "✓" },
  {
    feature: "Pre-publish validator",
    bootstrapper: "✓",
    founder: "✓",
    agency: "✓",
  },
] as const;

export const PRICING_FAQ_ITEMS = [
  {
    q: "Is there a free trial?",
    a: "Yes. Tier 1 is $9.90 for your first month. Full access, no credit card limit. If you don't find one lead worth replying to in 30 days, cancel in two clicks.",
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
  secondaryCta: "Start 7-day Founder trial — $9.90 first month",
  secondaryHref: "/signup",
} as const;
