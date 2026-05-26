export type IntelligenceModuleKey = "replier" | "miner";

export type IntelligenceBriefingContent = {
  title: string;
  subtitle: string;
  bullets: string[];
};

const BRIEFINGS: Record<IntelligenceModuleKey, IntelligenceBriefingContent> = {
  replier: {
    title: "1-Click Replier Briefing",
    subtitle: "Velocity Hub · Inbound stream",
    bullets: [
      "Paste your raw social notifications.",
      "Pick a growth posture.",
      "AI generates compliant, frictionless replies.",
    ],
  },
  miner: {
    title: "Discovery Stream Briefing",
    subtitle: "Lead ledger · Daily drops",
    bullets: [
      "Define your ideal customer pain.",
      "The engine adaptively hunts for signals.",
      "Daily drops stack in your ledger.",
    ],
  },
};

export function getIntelligenceBriefing(
  moduleKey: IntelligenceModuleKey
): IntelligenceBriefingContent {
  return BRIEFINGS[moduleKey];
}

export function intelligenceModuleKeyFromPath(
  pathname: string
): IntelligenceModuleKey {
  if (pathname.includes("/velocity/inbound")) {
    return "replier";
  }
  return "miner";
}
