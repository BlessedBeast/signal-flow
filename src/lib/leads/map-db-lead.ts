import { z } from "zod";

import type {
  ConversationTurn,
  Lead,
  LeadStatus,
  Platform,
} from "@/lib/signalflow-types";

const conversationTurnSchema = z.object({
  role: z.enum(["prospect", "user"]),
  content: z.string(),
  at: z.string(),
});

export type DbLeadRow = {
  id: string;
  user_id: string;
  platform: string | null;
  source_url: string | null;
  content: string | null;
  intent_score: number | null;
  status: string;
  ai_draft_content: string | null;
  conversation_history: unknown;
  created_at: string;
};

function parseConversationHistory(raw: unknown): ConversationTurn[] {
  if (!raw) return [];
  const parsed = z.array(conversationTurnSchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
}

function authorFromPlatform(platform: Platform): string {
  switch (platform) {
    case "reddit":
      return "u/prospect";
    case "x":
      return "@prospect";
    case "hackernews":
      return "hn_user";
    default:
      return "Community";
  }
}

export function mapDbLeadToClient(row: DbLeadRow): Lead {
  const platform = (row.platform ?? "reddit") as Platform;
  return {
    id: row.id,
    content: row.content ?? "",
    platform,
    intent_score: row.intent_score ?? 0,
    status: row.status as LeadStatus,
    ai_draft_content: row.ai_draft_content,
    conversation_history: parseConversationHistory(row.conversation_history),
    source_url: row.source_url ?? "",
    created_at: row.created_at,
    author: authorFromPlatform(platform),
    subreddit: platform === "reddit" ? "Community" : null,
  };
}
