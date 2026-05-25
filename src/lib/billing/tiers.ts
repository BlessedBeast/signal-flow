export type SubscriptionTierId = "hobbyist" | "indie_pro" | "growth_studio";

export type BillingTierDefinition = {
  id: SubscriptionTierId;
  name: string;
  priceLabel: string;
  priceCents: number;
  monthlyLeadCap: number;
  dailyDropQuota: number;
  dailyDropsLabel: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel: string;
};

export const BILLING_TIERS: BillingTierDefinition[] = [
  {
    id: "hobbyist",
    name: "Hobbyist",
    priceLabel: "$0/mo",
    priceCents: 0,
    monthlyLeadCap: 30,
    dailyDropQuota: 1,
    dailyDropsLabel: "1 daily drop",
    features: [
      "30 leads/mo ledger cap",
      "Basic Reddit intent scanning",
      "Capped 1-Click inbound processing",
      "Product DNA vault storage",
    ],
    ctaLabel: "Current plan",
  },
  {
    id: "indie_pro",
    name: "Indie Pro",
    priceLabel: "$29/mo",
    priceCents: 2900,
    monthlyLeadCap: 450,
    dailyDropQuota: 15,
    dailyDropsLabel: "15 daily drops",
    highlighted: true,
    features: [
      "450 leads/mo ledger cap",
      "Full Reddit + Hacker News radar",
      "The Megaphone Plug Alerts (HOT/WARM)",
      "BIP Storyteller memory ledger",
      "Chronological Daily Drop releases",
    ],
    ctaLabel: "Upgrade to Indie Pro",
  },
  {
    id: "growth_studio",
    name: "Growth Studio",
    priceLabel: "$79/mo",
    priceCents: 7900,
    monthlyLeadCap: 900,
    dailyDropQuota: 30,
    dailyDropsLabel: "30 daily drops",
    features: [
      "900 leads/mo ledger cap",
      "Omnichannel tracking (X, LinkedIn, Product Hunt)",
      "Unlimited 50+ bulk notification burner passes",
      "All Velocity Hub + Growth Labs modules",
      "Priority circuit-breaker queue headroom",
    ],
    ctaLabel: "Upgrade to Growth Studio",
  },
];

const TIER_BY_ID = Object.fromEntries(
  BILLING_TIERS.map((tier) => [tier.id, tier])
) as Record<SubscriptionTierId, BillingTierDefinition>;

export function parseSubscriptionTier(raw: unknown): SubscriptionTierId {
  if (raw === "indie_pro" || raw === "growth_studio") {
    return raw;
  }
  return "hobbyist";
}

export function getBillingTier(tierId: SubscriptionTierId): BillingTierDefinition {
  return TIER_BY_ID[tierId];
}

/** Daily Drop batch size for lead-bank release protocol (1 / 15 / 30). */
export function resolveDailyDropQuota(tier: SubscriptionTierId = "hobbyist"): number {
  return getBillingTier(tier).dailyDropQuota;
}

export function resolveMonthlyLeadCap(tier: SubscriptionTierId = "hobbyist"): number {
  return getBillingTier(tier).monthlyLeadCap;
}
