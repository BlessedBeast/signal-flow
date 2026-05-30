import type { SubscriptionTierId } from "@/lib/billing/tiers";
import type { ProductDNA } from "@/lib/signalflow-types";

export type ProfilePatchRow = {
  product_dna: ProductDNA;
  is_mining: boolean;
  website_url: string | null;
  mining_started_at: string | null;
  persona_context?: unknown;
  subscription_tier?: SubscriptionTierId;
};

export function buildProfilePatchRow(params: {
  dna: ProductDNA;
  isMining: boolean;
}): ProfilePatchRow {
  return {
    product_dna: params.dna,
    is_mining: params.isMining,
    website_url: params.dna.url || null,
    mining_started_at: params.isMining ? new Date().toISOString() : null,
  };
}

export function buildProfileUpsertRow(
  userId: string,
  patch: ProfilePatchRow
): { id: string } & ProfilePatchRow {
  return {
    id: userId,
    ...patch,
  };
}
