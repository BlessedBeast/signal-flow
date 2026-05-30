export type SubscriptionTierId = "free" | "bootstrapper" | "founder";

export type BillingTierDefinition = {
  id: SubscriptionTierId;
  name: string;
  priceLabel: string;
  /** First-month trial price when applicable. */
  trialPriceLabel?: string;
  priceCents: number;
  monthlyLeadCap: number;
  dailyDropQuota: number;
  dailyReflectionTaskLimit: number;
  activeSerperQueryLimit: number;
  activeFrameworkSequenceLimit: number;
  oneClickReplyUnlocked: boolean;
  automatedLeadFetch: boolean;
  streakAnalyticsUnlocked: boolean;
  dailyDropsLabel: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
};

/** Ordered lowest → highest for access checks. */
export const TIER_RANK: Record<SubscriptionTierId, number> = {
  free: 0,
  bootstrapper: 1,
  founder: 2,
};

export const BILLING_TIERS: BillingTierDefinition[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "$0/mo",
    priceCents: 0,
    monthlyLeadCap: 30,
    dailyDropQuota: 1,
    dailyReflectionTaskLimit: 1,
    activeSerperQueryLimit: 1,
    activeFrameworkSequenceLimit: 1,
    oneClickReplyUnlocked: false,
    automatedLeadFetch: false,
    streakAnalyticsUnlocked: false,
    dailyDropsLabel: "1 lead / day",
    features: [
      "Core dashboard + lead stream",
      "1 qualified lead released per day",
      "1 active Serper tracking query",
      "1 active framework sequence",
      "Product DNA vault + master blueprint",
    ],
    ctaLabel: "Current plan",
  },
  {
    id: "bootstrapper",
    name: "Bootstrapper",
    priceLabel: "$19/mo",
    trialPriceLabel: "$9.90 first month",
    priceCents: 1900,
    monthlyLeadCap: 300,
    dailyDropQuota: 10,
    dailyReflectionTaskLimit: 3,
    activeSerperQueryLimit: 3,
    activeFrameworkSequenceLimit: 1,
    oneClickReplyUnlocked: true,
    automatedLeadFetch: false,
    streakAnalyticsUnlocked: false,
    dailyDropsLabel: "10 leads / day",
    highlighted: true,
    features: [
      "Everything in Free",
      "10 high-intent leads per day (manual fetch)",
      "3 active lead tracking queries",
      "1 active framework sequence",
      "Full 1-click reply pipeline unlocked",
      "URL analyzer + voice vault synthesis",
    ],
    ctaLabel: "Upgrade to Bootstrapper",
  },
  {
    id: "founder",
    name: "Founder",
    priceLabel: "$49/mo",
    priceCents: 4900,
    monthlyLeadCap: 1500,
    dailyDropQuota: 50,
    dailyReflectionTaskLimit: 5,
    activeSerperQueryLimit: 10,
    activeFrameworkSequenceLimit: 3,
    oneClickReplyUnlocked: true,
    automatedLeadFetch: true,
    streakAnalyticsUnlocked: true,
    dailyDropsLabel: "50 leads / day",
    features: [
      "Everything in Bootstrapper",
      "50 leads per day with 5 AM auto-fetch",
      "10 active lead tracking queries",
      "3 parallel framework sequences",
      "Daily OS + streak execution analytics",
      "BIP Storyteller + Growth Labs access",
    ],
    ctaLabel: "Upgrade to Founder",
  },
];

const TIER_BY_ID = Object.fromEntries(
  BILLING_TIERS.map((tier) => [tier.id, tier])
) as Record<SubscriptionTierId, BillingTierDefinition>;

const LEGACY_TIER_MAP: Record<string, SubscriptionTierId> = {
  free: "free",
  hobbyist: "free",
  bootstrapper: "bootstrapper",
  indie_builder: "bootstrapper",
  indie_pro: "bootstrapper",
  founder: "founder",
  growth_studio: "founder",
  agency: "founder",
};

/** Normalize DB / URL / legacy values to the unified 3-tier model. Unknown → free. */
export function parseSubscriptionTier(raw: unknown): SubscriptionTierId {
  if (typeof raw !== "string") {
    return "free";
  }
  const normalized = raw.trim().toLowerCase();
  return LEGACY_TIER_MAP[normalized] ?? "free";
}

export function getBillingTier(
  tierId: SubscriptionTierId = "free"
): BillingTierDefinition {
  return TIER_BY_ID[tierId] ?? TIER_BY_ID.free;
}

export function meetsMinimumTier(
  userTier: SubscriptionTierId | null | undefined,
  required: SubscriptionTierId
): boolean {
  const resolved = userTier ? parseSubscriptionTier(userTier) : "free";
  return TIER_RANK[resolved] >= TIER_RANK[required];
}

export function resolveDailyDropQuota(
  tier: SubscriptionTierId = "free"
): number {
  return getBillingTier(tier).dailyDropQuota;
}

export function resolveMonthlyLeadCap(
  tier: SubscriptionTierId = "free"
): number {
  return getBillingTier(tier).monthlyLeadCap;
}

export function resolveDailyReflectionTaskLimit(
  tier: SubscriptionTierId = "free"
): number {
  return getBillingTier(tier).dailyReflectionTaskLimit;
}

export function resolveActiveSerperQueryLimit(
  tier: SubscriptionTierId = "free"
): number {
  return getBillingTier(tier).activeSerperQueryLimit;
}

export function resolveActiveFrameworkSequenceLimit(
  tier: SubscriptionTierId = "free"
): number {
  return getBillingTier(tier).activeFrameworkSequenceLimit;
}

export function isOneClickReplyUnlocked(
  tier: SubscriptionTierId = "free"
): boolean {
  return getBillingTier(tier).oneClickReplyUnlocked;
}

export function isAutomatedLeadFetchEnabled(
  tier: SubscriptionTierId = "free"
): boolean {
  return getBillingTier(tier).automatedLeadFetch;
}

export function isStreakAnalyticsUnlocked(
  tier: SubscriptionTierId = "free"
): boolean {
  return getBillingTier(tier).streakAnalyticsUnlocked;
}

export function reflectionTaskPromptLine(
  tier: SubscriptionTierId = "free"
): string {
  const count = resolveDailyReflectionTaskLimit(tier);
  return `Generate exactly ${count} high-leverage marketing task${count === 1 ? "" : "s"}.`;
}
