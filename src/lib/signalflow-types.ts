import type { SubscriptionTierId } from "@/lib/billing/tiers";

export const PLATFORMS = [
  "reddit",
  "x",
  "hackernews",
  "indiehackers",
  "producthunt",
] as const;

export type Platform = (typeof PLATFORMS)[number];

export function parsePlatform(raw: string | null | undefined): Platform {
  if (raw && PLATFORMS.includes(raw as Platform)) {
    return raw as Platform;
  }
  return "reddit";
}
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
  /** Optional API alias for `source_url` (one-click outbound navigation). */
  url?: string;
  /** Calendar day bucket for the daily drop (ISO timestamp). */
  released_at: string;
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

/** Proximity-based default Serper dorks (no exact-match quotes). */
export const DEFAULT_SERPER_QUERIES = [
  "site:reddit.com (validate OR validation) (idea OR business OR startup) -crypto -trading -forex",
  "site:reddit.com/r/SaaS (alternative OR competitor) (validation OR research) -trading -crypto",
  "site:news.ycombinator.com (alternative OR validation OR feedback) (tool OR project OR product) -stocks -trading",
  "site:x.com (validation OR market) (struggling OR nightmare OR hard) -crypto -forex",
  "site:producthunt.com/discussions (recommend OR tool) (validation OR feasibility) -trading",
] as const;

export type Profile = {
  is_mining: boolean;
  product_dna: ProductDNA | null;
  competitor_battlecards: CompetitorBattlecards;
  subscription_tier: SubscriptionTierId;
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
  activeSerperQueries: [...DEFAULT_SERPER_QUERIES],
  competitors: ["Linear", "Notion", "Attio"],
  keywords: ["intent signals", "lead mining", "competitor mentions", "PLG growth"],
};

export function getIntentTier(score: number): IntentTier {
  if (score >= 80) return "HOT";
  if (score >= 50) return "WARM";
  return "COLD";
}
