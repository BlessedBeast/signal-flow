/**
 * Hand-maintained row shapes aligned with Supabase `public` tables.
 * Regenerate or extend when migrations add columns.
 */

import type { SubscriptionTierId } from "@/lib/billing/tiers";
import type { FrameworkStepTracking } from "@/lib/signalflow-types";

/** `public.profiles` — single-vault profile row (one `product_dna` per user). */
export type ProfileRow = {
  id: string;
  is_mining: boolean | null;
  /** Singular product identity vault (JSONB). Not an array of vaults. */
  product_dna: unknown;
  persona_context: unknown;
  competitor_battlecards: unknown;
  subscription_tier: SubscriptionTierId | string | null;
  current_streak: number | null;
  longest_streak: number | null;
  last_action_at: string | null;
  framework_step_tracking: unknown;
};

/** Subset loaded by `refreshProfile` in the browser store. */
export type ProfileStoreSelectRow = Pick<
  ProfileRow,
  | "is_mining"
  | "product_dna"
  | "persona_context"
  | "competitor_battlecards"
  | "subscription_tier"
  | "current_streak"
  | "longest_streak"
  | "last_action_at"
  | "framework_step_tracking"
>;

/** `public.discovery_leads` — lead bank + reply pipeline. */
export type DiscoveryLeadRow = {
  id: string;
  user_id: string;
  platform: string | null;
  source_url: string | null;
  url?: string | null;
  content: string | null;
  intent_score: number | null;
  status: string;
  ai_draft_content: string | null;
  /** JSONB string[]; default `[]` when column absent on older rows. */
  media_directives?: unknown;
  conversation_history: unknown;
  created_at: string;
  released_at: string | null;
};

export type { FrameworkStepTracking, SubscriptionTierId };
