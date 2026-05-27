import {
  getBillingTier,
  meetsMinimumTier,
  parseSubscriptionTier,
  type SubscriptionTierId,
} from "@/lib/billing/tiers";

export type TierGateRequirement = {
  minimumTier: SubscriptionTierId;
  /** Short label for the upgrade gate, e.g. "Indie Builder" */
  requiredPlanName: string;
  /** One-line module name shown on the lock screen */
  moduleLabel?: string;
};

export function resolveUserTier(
  raw: unknown
): SubscriptionTierId {
  return parseSubscriptionTier(raw);
}

export function getTierGateCopy(
  requirement: TierGateRequirement
): { headline: string; body: string; cta: string } {
  const plan = getBillingTier(requirement.minimumTier);
  return {
    headline: "This module requires an upgraded execution tier.",
    body: `${requirement.moduleLabel ?? "This tool"} is included on ${plan.name} (${plan.priceLabel}) and above. Unlock ${requirement.requiredPlanName} to run it at full velocity.`,
    cta: `Upgrade to ${plan.name}`,
  };
}

export { meetsMinimumTier, parseSubscriptionTier };
export type { SubscriptionTierId };
