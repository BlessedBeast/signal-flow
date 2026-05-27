export type SubscriptionTierId =
  | "hobbyist"
  | "indie_builder"
  | "growth_studio";

export type BillingTierDefinition = {
  id: SubscriptionTierId;
  name: string;
  priceLabel: string;
  priceCents: number;
  monthlyLeadCap: number;
  dailyDropQuota: number;
  dailyReflectionTaskLimit: number;
  dailyDropsLabel: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
};

/** Ordered lowest → highest for access checks. */
export const TIER_RANK: Record<SubscriptionTierId, number> = {
  hobbyist: 0,
  indie_builder: 1,
  growth_studio: 2,
};

export const BILLING_TIERS: BillingTierDefinition[] = [
  {
    id: "hobbyist",
    name: "Hobbyist",
    priceLabel: "$0/mo",
    priceCents: 0,
    monthlyLeadCap: 30,
    dailyDropQuota: 1,
    dailyReflectionTaskLimit: 1,
    dailyDropsLabel: "1 lead / day",
    features: [
      "Core dashboard + lead stream",
      "1 qualified lead released per day",
      "1 AI daily execution task",
      "Product DNA vault + master blueprint",
      "Perfect for validating distribution fit",
    ],
    ctaLabel: "Current plan",
  },
  {
    id: "indie_builder",
    name: "Indie Builder",
    priceLabel: "$49/mo",
    priceCents: 4900,
    monthlyLeadCap: 450,
    dailyDropQuota: 15,
    dailyReflectionTaskLimit: 3,
    dailyDropsLabel: "15 leads / day",
    highlighted: true,
    features: [
      "Everything in Hobbyist",
      "15 high-intent leads per day",
      "3 AI daily execution tasks",
      "BIP Storyteller memory ledger",
      "Plug Alerts → live lead promotion",
      "Megaphone velocity workflows",
    ],
    ctaLabel: "Upgrade to Indie Builder",
  },
  {
    id: "growth_studio",
    name: "Growth Studio",
    priceLabel: "$149/mo",
    priceCents: 14900,
    monthlyLeadCap: 999_999,
    dailyDropQuota: 100,
    dailyReflectionTaskLimit: 5,
    dailyDropsLabel: "Unlimited lead velocity",
    features: [
      "Everything in Indie Builder",
      "Unlimited daily lead drops (100/batch cap)",
      "5 AI daily execution tasks",
      "GEO Seeds programmatic SEO lab",
      "Side-Cars distribution experiments",
      "1-Click Inbound Replier",
      "Omnichannel burner + priority queue",
    ],
    ctaLabel: "Upgrade to Growth Studio",
  },
];

const TIER_BY_ID = Object.fromEntries(
  BILLING_TIERS.map((tier) => [tier.id, tier])
) as Record<SubscriptionTierId, BillingTierDefinition>;

/** Legacy DB value `indie_pro` maps to Indie Builder. */
export function parseSubscriptionTier(raw: unknown): SubscriptionTierId {
  if (raw === "indie_builder" || raw === "indie_pro") {
    return "indie_builder";
  }
  if (raw === "growth_studio") {
    return "growth_studio";
  }
  return "hobbyist";
}

export function getBillingTier(
  tierId: SubscriptionTierId = "hobbyist"
): BillingTierDefinition {
  return TIER_BY_ID[tierId] ?? TIER_BY_ID.hobbyist;
}

export function meetsMinimumTier(
  userTier: SubscriptionTierId | null | undefined,
  required: SubscriptionTierId
): boolean {
  const resolved = userTier ? parseSubscriptionTier(userTier) : "hobbyist";
  return TIER_RANK[resolved] >= TIER_RANK[required];
}

/** Daily Drop batch size for lead-bank release (1 / 15 / 100). */
export function resolveDailyDropQuota(
  tier: SubscriptionTierId = "hobbyist"
): number {
  return getBillingTier(tier).dailyDropQuota;
}

export function resolveMonthlyLeadCap(
  tier: SubscriptionTierId = "hobbyist"
): number {
  return getBillingTier(tier).monthlyLeadCap;
}

/** Live Reflection Engine task count per cron run (1 / 3 / 5). */
export function resolveDailyReflectionTaskLimit(
  tier: SubscriptionTierId = "hobbyist"
): number {
  return getBillingTier(tier).dailyReflectionTaskLimit;
}

export function reflectionTaskPromptLine(
  tier: SubscriptionTierId = "hobbyist"
): string {
  const count = resolveDailyReflectionTaskLimit(tier);
  return `Generate exactly ${count} high-leverage marketing task${count === 1 ? "" : "s"}.`;
}
