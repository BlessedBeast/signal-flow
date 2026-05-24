export type Platform = "reddit" | "x" | "hackernews";
export type IntentTier = "HOT" | "WARM" | "COLD";
export type LeadStatus = "new" | "drafted" | "replied" | "archived";

export type ConversationTurn = {
  role: "prospect" | "user";
  content: string;
  at: string;
};

export type Lead = {
  id: string;
  content: string;
  platform: Platform;
  intent_score: number;
  status: LeadStatus;
  ai_draft_content: string | null;
  conversation_history: ConversationTurn[];
  source_url: string;
  created_at: string;
  author: string;
  subreddit: string | null;
};

export type ProductDNA = {
  productName: string;
  url: string;
  oneLiner: string;
  audience: string;
  painPoints: string[];
  targetPlatforms: Platform[];
  activeSerperQueries: string[];
  competitors: string[];
  keywords: string[];
};

export type CompetitorBattlecards = Record<string, string>;

export type Profile = {
  is_mining: boolean;
  product_dna: ProductDNA | null;
  competitor_battlecards: CompetitorBattlecards;
};

export const initialDNA: ProductDNA = {
  productName: "SignalFlow",
  url: "https://signalflow.app",
  oneLiner:
    "Surface high-intent conversations across Reddit, X, and Hacker News before your competitors do.",
  audience: "B2B SaaS founders, indie hackers, and lean growth teams",
  painPoints: [
    "Manual social listening across fragmented channels",
    "Missing buying-intent signals in community threads",
    "Slow, generic outreach that ignores context",
  ],
  targetPlatforms: ["reddit", "x", "hackernews"],
  activeSerperQueries: [
    'site:reddit.com "looking for alternative" SaaS',
    'site:x.com "anyone recommend" startup tool',
    'site:news.ycombinator.com "Ask HN" competitor',
  ],
  competitors: ["Linear", "Notion", "Attio"],
  keywords: ["intent signals", "lead mining", "competitor mentions", "PLG growth"],
};

export function getIntentTier(score: number): IntentTier {
  if (score >= 80) return "HOT";
  if (score >= 50) return "WARM";
  return "COLD";
}
