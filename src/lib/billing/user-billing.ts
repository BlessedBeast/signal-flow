import type { SupabaseClient } from "@supabase/supabase-js";
import { endOfMonth, format, startOfMonth } from "date-fns";

import {
  getBillingTier,
  parseSubscriptionTier,
  resolveDailyDropQuota,
  resolveMonthlyLeadCap,
  type SubscriptionTierId,
} from "@/lib/billing/tiers";
import { DISCOVERY_LEADS_TABLE } from "@/lib/discovery/constants";

export type UserBillingContext = {
  tier: SubscriptionTierId;
  tierName: string;
  dailyDropQuota: number;
  monthlyLeadCap: number;
  leadsUsed: number;
  cycleStart: string;
  cycleEnd: string;
  cycleLabel: string;
};

export async function fetchUserSubscriptionTier(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionTierId> {
  const { data, error } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn(
      "[billing] subscription_tier lookup failed, defaulting to hobbyist:",
      error.message
    );
    return "hobbyist";
  }

  return parseSubscriptionTier(data?.subscription_tier);
}

export async function countMonthlyLeadUsage(
  supabase: SupabaseClient,
  userId: string,
  cycleStart: Date = startOfMonth(new Date())
): Promise<number> {
  const { count, error } = await supabase
    .from(DISCOVERY_LEADS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", cycleStart.toISOString());

  if (error) {
    throw new Error(`Failed to count ledger quota usage: ${error.message}`);
  }

  return count ?? 0;
}

export async function resolveUserBillingContext(
  supabase: SupabaseClient,
  userId: string
): Promise<UserBillingContext> {
  const tier = await fetchUserSubscriptionTier(supabase, userId);
  const tierDef = getBillingTier(tier);
  const now = new Date();
  const cycleStartDate = startOfMonth(now);
  const cycleEndDate = endOfMonth(now);
  const leadsUsed = await countMonthlyLeadUsage(
    supabase,
    userId,
    cycleStartDate
  );

  return {
    tier,
    tierName: tierDef.name,
    dailyDropQuota: resolveDailyDropQuota(tier),
    monthlyLeadCap: resolveMonthlyLeadCap(tier),
    leadsUsed,
    cycleStart: cycleStartDate.toISOString(),
    cycleEnd: cycleEndDate.toISOString(),
    cycleLabel: `${format(cycleStartDate, "MMM d")} – ${format(cycleEndDate, "MMM d, yyyy")}`,
  };
}
