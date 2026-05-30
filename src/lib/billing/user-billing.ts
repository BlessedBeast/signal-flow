import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getBillingTier,
  isOneClickReplyUnlocked,
  parseSubscriptionTier,
  resolveActiveFrameworkSequenceLimit,
  resolveActiveSerperQueryLimit,
  resolveDailyDropQuota,
  resolveDailyReflectionTaskLimit,
  resolveMonthlyLeadCap,
  type SubscriptionTierId,
} from "@/lib/billing/tiers";
import { DISCOVERY_LEADS_TABLE } from "@/lib/discovery/constants";
import { endOfMonth, format, startOfMonth } from "date-fns";

export type UserBillingContext = {
  tier: SubscriptionTierId;
  tierName: string;
  dailyDropQuota: number;
  dailyReflectionTaskLimit: number;
  monthlyLeadCap: number;
  activeSerperQueryLimit: number;
  activeFrameworkSequenceLimit: number;
  oneClickReplyUnlocked: boolean;
  automatedLeadFetch: boolean;
  leadsUsed: number;
  cycleStart: string;
  cycleEnd: string;
  cycleLabel: string;
};

export class SubscriptionTierError extends Error {
  constructor(
    message: string,
    public readonly status: number = 403,
    public readonly code: "reply_locked" | "framework_locked" = "reply_locked"
  ) {
    super(message);
    this.name = "SubscriptionTierError";
  }
}

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
      "[billing] subscription_tier lookup failed, defaulting to free:",
      error.message
    );
    return "free";
  }

  return parseSubscriptionTier(data?.subscription_tier);
}

/** Blocks free-tier users from 1-click reply generation endpoints. */
export async function requireOneClickReplyAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionTierId> {
  const tier = await fetchUserSubscriptionTier(supabase, userId);
  if (!isOneClickReplyUnlocked(tier)) {
    throw new SubscriptionTierError(
      "The 1-click reply pipeline requires Bootstrapper or Founder. Upgrade to unlock automated replies.",
      403,
      "reply_locked"
    );
  }
  return tier;
}

export function assertFrameworkSlugAllowedForTier(
  selectedSlugs: readonly string[],
  frameworkSlug: string,
  tier: SubscriptionTierId
): void {
  const limit = resolveActiveFrameworkSequenceLimit(tier);
  const allowed = selectedSlugs.slice(0, limit);
  if (!allowed.includes(frameworkSlug)) {
    throw new SubscriptionTierError(
      `Your plan allows ${limit} active framework sequence${limit === 1 ? "" : "s"}. Upgrade to unlock additional playbooks.`,
      403,
      "framework_locked"
    );
  }
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
    dailyReflectionTaskLimit: resolveDailyReflectionTaskLimit(tier),
    monthlyLeadCap: resolveMonthlyLeadCap(tier),
    activeSerperQueryLimit: resolveActiveSerperQueryLimit(tier),
    activeFrameworkSequenceLimit: resolveActiveFrameworkSequenceLimit(tier),
    oneClickReplyUnlocked: tierDef.oneClickReplyUnlocked,
    automatedLeadFetch: tierDef.automatedLeadFetch,
    leadsUsed,
    cycleStart: cycleStartDate.toISOString(),
    cycleEnd: cycleEndDate.toISOString(),
    cycleLabel: `${format(cycleStartDate, "MMM d")} – ${format(cycleEndDate, "MMM d, yyyy")}`,
  };
}
