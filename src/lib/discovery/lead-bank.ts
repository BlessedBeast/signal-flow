import type { SupabaseClient } from "@supabase/supabase-js";

import {
  resolveDailyDropQuota as resolveDailyDropQuotaForTier,
  type SubscriptionTierId,
} from "@/lib/billing/tiers";
import {
  DAILY_LIMIT,
  DISCOVERY_LEADS_TABLE,
} from "@/lib/discovery/constants";
import type { SerperCandidate } from "@/lib/miner/search-pipeline";
import { supabaseServer } from "@/lib/supabase-server";

export { DAILY_LIMIT, DISCOVERY_LEADS_TABLE } from "@/lib/discovery/constants";

export type DiscoveryLeadStatus =
  | "queued"
  | "active"
  | "drafted"
  | "replied"
  | "archived";

export type DiscoveryLeadRow = {
  user_id: string;
  source_url: string;
  platform: string;
  content: string;
  intent_score: number;
  status: "queued";
};

export type DailyReleaseResult = {
  activeCount: number;
  queuedCount: number;
  released: number;
  /** Plan baseline batch size for this daily drop (e.g. 15 or 30). */
  dailyDropQuota: number;
};

/**
 * Resolves per-user Daily Drop batch size from subscription tier.
 * Pass `tier` when already loaded; otherwise defaults to Hobbyist (1).
 */
export function resolveDailyDropQuota(
  _userId?: string,
  tier?: SubscriptionTierId
): number {
  void _userId;
  return resolveDailyDropQuotaForTier(tier ?? "hobbyist");
}

/** @deprecated Use tier-based `resolveDailyDropQuota`; kept for legacy imports. */
export const LEGACY_DAILY_LIMIT = DAILY_LIMIT;

const bankLog = {
  info: (msg: string) =>
    console.log(`\x1b[36m[LEAD BANK]\x1b[0m ${msg}`),
  success: (msg: string) =>
    console.log(`\x1b[32m[LEAD BANK]\x1b[0m ${msg}`),
  warn: (msg: string) =>
    console.log(`\x1b[33m[LEAD BANK]\x1b[0m ${msg}`),
};

function buildLeadContent(candidate: SerperCandidate): string {
  return [candidate.title, candidate.snippet].filter(Boolean).join("\n\n");
}

export async function countActiveDiscoveryLeads(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from(DISCOVERY_LEADS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) {
    throw new Error(`Failed to count active discovery leads: ${error.message}`);
  }

  return count ?? 0;
}

export async function countQueuedDiscoveryLeads(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from(DISCOVERY_LEADS_TABLE)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "queued");

  if (error) {
    throw new Error(`Failed to count queued discovery leads: ${error.message}`);
  }

  return count ?? 0;
}

export async function discoveryUrlExistsForUser(
  supabase: SupabaseClient,
  userId: string,
  sourceUrl: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from(DISCOVERY_LEADS_TABLE)
    .select("id")
    .eq("user_id", userId)
    .eq("source_url", sourceUrl)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Discovery lead overlap check failed: ${error.message}`);
  }

  return !!data;
}

export async function queueDiscoveryLead(
  supabase: SupabaseClient,
  params: {
    userId: string;
    candidate: SerperCandidate;
    intentScore: number;
  }
): Promise<"queued" | "duplicate"> {
  const row: DiscoveryLeadRow = {
    user_id: params.userId,
    source_url: params.candidate.link,
    platform: params.candidate.platform,
    content: buildLeadContent(params.candidate),
    intent_score: params.intentScore,
    status: "queued",
  };

  const { data, error } = await supabase
    .from(DISCOVERY_LEADS_TABLE)
    .upsert(row, { onConflict: "user_id,source_url", ignoreDuplicates: true })
    .select("id");

  if (error) {
    if (error.code === "23505") {
      return "duplicate";
    }
    throw new Error(`Lead bank upsert failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return "duplicate";
  }

  return "queued";
}

export async function executeDailyReleaseProtocol(
  supabase: SupabaseClient,
  userId: string,
  options?: { dailyDropQuota?: number }
): Promise<DailyReleaseResult> {
  const dailyDropQuota = options?.dailyDropQuota ?? resolveDailyDropQuota(userId);

  bankLog.info(
    `Daily Drop Protocol — user ${userId} | quota ${dailyDropQuota}`
  );

  const [activeCount, queuedCount] = await Promise.all([
    countActiveDiscoveryLeads(supabase, userId),
    countQueuedDiscoveryLeads(supabase, userId),
  ]);

  bankLog.info(
    `Vault: ${queuedCount} queued | stream active (status=active): ${activeCount}`
  );

  if (queuedCount <= 0) {
    bankLog.warn("Vault empty — no daily drop this run.");
    return { activeCount, queuedCount, released: 0, dailyDropQuota };
  }

  const batchSize = Math.min(queuedCount, dailyDropQuota);

  const { data: queuedLeads, error: selectError } = await supabase
    .from(DISCOVERY_LEADS_TABLE)
    .select("id, intent_score")
    .eq("user_id", userId)
    .eq("status", "queued")
    .order("intent_score", { ascending: false })
    .limit(batchSize);

  if (selectError) {
    throw new Error(`Failed to load queued leads for daily drop: ${selectError.message}`);
  }

  const toRelease = queuedLeads ?? [];
  if (toRelease.length === 0) {
    return { activeCount, queuedCount, released: 0, dailyDropQuota };
  }

  const releasedAt = new Date().toISOString();
  const ids = toRelease.map((row) => row.id as string);

  const { error: updateError } = await supabase
    .from(DISCOVERY_LEADS_TABLE)
    .update({ status: "active", released_at: releasedAt })
    .eq("user_id", userId)
    .in("id", ids);

  if (updateError) {
    throw new Error(`Daily drop release failed: ${updateError.message}`);
  }

  bankLog.success(
    `Daily drop released ${ids.length} lead${ids.length === 1 ? "" : "s"} (highest intent, stamped ${releasedAt}).`
  );

  return {
    activeCount: activeCount + ids.length,
    queuedCount: Math.max(0, queuedCount - ids.length),
    released: ids.length,
    dailyDropQuota,
  };
}

/** Server-default client wrapper for cron + hunt pipelines. */
export async function executeDailyReleaseForUser(
  userId: string
): Promise<DailyReleaseResult> {
  return executeDailyReleaseProtocol(supabaseServer, userId);
}

export async function getLeadBankStats(
  supabase: SupabaseClient,
  userId: string
): Promise<{ activeCount: number; queuedCount: number; dailyLimit: number }> {
  const [activeCount, queuedCount] = await Promise.all([
    countActiveDiscoveryLeads(supabase, userId),
    countQueuedDiscoveryLeads(supabase, userId),
  ]);

  return { activeCount, queuedCount, dailyLimit: DAILY_LIMIT };
}
