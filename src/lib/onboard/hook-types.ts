export type HookGoldenLead = {
  platform: string;
  title: string;
  intentScore: string;
};

export type HookCompetitorBattlecard = {
  name: string;
  positioningAngle: string;
  winTheme?: string;
};

export type HookRecommendedPlaybook = {
  slug: string;
  title: string;
  description: string;
  matchScore: number;
  projectedImpact: string;
  executionWindow: string;
};

export type HookResult = {
  mirror: {
    brandName: string;
    targetPersona: string;
    coreFriction: string;
  };
  goldenLeads: [HookGoldenLead, HookGoldenLead];
  fomoMetrics: {
    totalThreadsFound: number;
    missedImpressionsEst: number;
  };
  recommendedPlaybooks: HookRecommendedPlaybook[];
  competitorBattlecards: HookCompetitorBattlecard[];
};

export const HOOK_AUDIT_USED_KEY = "signalflow_hook_used";

export function isHookAuditUsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(HOOK_AUDIT_USED_KEY) === "true";
  } catch {
    return false;
  }
}

export function markHookAuditUsed(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HOOK_AUDIT_USED_KEY, "true");
  } catch {
    // ignore quota / private mode
  }
}
