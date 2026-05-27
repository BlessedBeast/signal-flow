"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { UpgradeGate } from "@/components/billing/upgrade-gate";
import {
  getTierGateCopy,
  meetsMinimumTier,
  parseSubscriptionTier,
  type SubscriptionTierId,
} from "@/lib/billing/tier-access";
import { getBillingTier } from "@/lib/billing/tiers";
import { useSignalFlow } from "@/lib/signalflow-store";

type TierGatedToolProps = {
  minimumTier: SubscriptionTierId;
  moduleLabel?: string;
  children: ReactNode;
};

export function TierGatedTool({
  minimumTier,
  moduleLabel,
  children,
}: TierGatedToolProps) {
  const { profile, profileLoading } = useSignalFlow();
  const userTier = parseSubscriptionTier(profile.subscription_tier);

  if (profileLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2
          className="size-8 animate-spin text-primary"
          aria-label="Loading account tier"
        />
      </div>
    );
  }

  if (!meetsMinimumTier(userTier, minimumTier)) {
    const plan = getBillingTier(minimumTier);
    const copy = getTierGateCopy({
      minimumTier,
      requiredPlanName: plan.name,
      moduleLabel,
    });
    return (
      <UpgradeGate
        headline={copy.headline}
        body={copy.body}
        requiredPlanName={plan.name}
      />
    );
  }

  return <>{children}</>;
}
