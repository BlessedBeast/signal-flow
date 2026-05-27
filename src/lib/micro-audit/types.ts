import type { ProductDNA } from "@/lib/signalflow-types";

export type MicroAuditTeaser = {
  productName: string;
  primaryLeakPlatform: string;
  missedTrafficVolume: string;
  highestIntentThreadTitle: string;
  url: string;
};

export type MicroAuditPreviewLead = {
  platform: string;
  sourceUrl: string;
  threadTitle: string;
  intentScore: number;
  draftSnippet: string;
};

export type MicroAuditResult = {
  teaser: MicroAuditTeaser;
  dna: ProductDNA;
  previewLeads: MicroAuditPreviewLead[];
};

export type PendingMicroAuditPayload = {
  url: string;
  teaser: MicroAuditTeaser;
  dna: ProductDNA;
  savedAt: string;
  /** Freemium path chosen on micro-audit paywall */
  signupTier?: "hobbyist";
};

export const MICRO_AUDIT_STORAGE_KEY = "signalflow_micro_audit_pending";
export const SIGNUP_TIER_STORAGE_KEY = "signalflow_signup_tier";
