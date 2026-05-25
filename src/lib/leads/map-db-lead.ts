import { z } from "zod";

import type {
  ConversationTurn,
  Lead,
  LeadStatus,
  Platform,
} from "@/lib/signalflow-types";
import { parsePlatform } from "@/lib/signalflow-types";

const conversationTurnSchema = z.object({
  role: z.enum(["prospect", "user"]),
  content: z.string(),
  at: z.string(),
});

export type DbLeadRow = {
  id: string;
  user_id: string;
  platform: string | null;
  source_url?: string | null;
  url?: string | null;
  content: string | null;
  intent_score: number | null;
  status: string;
  ai_draft_content: string | null;
  conversation_history: unknown;
  created_at: string;
  released_at?: string | null;
};

function parseConversationHistory(raw: unknown): ConversationTurn[] {
  if (!raw) return [];
  const parsed = z.array(conversationTurnSchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
}

function normalizeWorkflowStatus(raw: string): LeadStatus {
  switch (raw) {
    case "active":
    case "queued":
    case "new":
      return "new";
    case "drafted":
    case "replied":
    case "archived":
      return raw;
    default:
      return "new";
  }
}

function authorFromPlatform(platform: Platform): string {
  switch (platform) {
    case "reddit":
      return "u/prospect";
    case "x":
      return "@prospect";
    case "hackernews":
      return "hn_user";
    case "indiehackers":
      return "ih_member";
    case "producthunt":
      return "ph_maker";
    default:
      return "Community";
  }
}

export function mapDbLeadToClient(row: DbLeadRow): Lead {
  const platform = parsePlatform(row.platform);
  const sourceUrl = row.source_url ?? row.url ?? "";

  const releasedAt = row.released_at ?? row.created_at;

  return {
    id: row.id,
    content: row.content ?? "",
    platform,
    intent_score: row.intent_score ?? 0,
    status: normalizeWorkflowStatus(row.status),
    ai_draft_content: row.ai_draft_content,
    conversation_history: parseConversationHistory(row.conversation_history),
    source_url: sourceUrl,
    released_at: releasedAt,
    created_at: releasedAt,
    author: authorFromPlatform(platform),
    subreddit: platform === "reddit" ? "Community" : null,
  };
}
