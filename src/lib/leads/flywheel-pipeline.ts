import { z } from "zod";

import type { ConversationTurn, Platform } from "@/lib/signalflow-types";
import { supabaseServer } from "@/lib/supabase-server";

import { extractSubredditFromUrl, normalizePlatform } from "./source-context";

const conversationTurnSchema = z.object({
  role: z.enum(["prospect", "user"]),
  content: z.string(),
  at: z.string(),
});

export type FlywheelRow = {
  id: string;
  platform: string;
  subreddit: string | null;
  source_url: string | null;
  original_post: string;
  conversation_history: ConversationTurn[];
  created_at: string;
};

function parseHistory(raw: unknown): ConversationTurn[] {
  if (!raw) return [];
  const parsed = z.array(conversationTurnSchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
}

function formatFlywheelExample(row: FlywheelRow, index: number): string {
  const history = row.conversation_history
    .map((t) => `[${t.role}] ${t.content}`)
    .join("\n");

  const meta = [
    row.subreddit ? `subreddit: r/${row.subreddit}` : null,
    row.source_url ? `source: ${row.source_url}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return `Example ${index + 1}${meta ? ` (${meta})` : ""}:
Original post:
${row.original_post.slice(0, 800)}

Outbound sequence:
${history || "(single-touch win)"}`;
}

export async function fetchWinningFlywheelExamples(
  platform: Platform,
  limit = 3
): Promise<string> {
  const { data, error } = await supabaseServer
    .from("conversion_flywheel")
    .select(
      "id, platform, subreddit, source_url, original_post, conversation_history, created_at"
    )
    .eq("platform", platform)
    .eq("outcome", "won")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[flywheel] fetch examples:", error.message);
    return "";
  }

  const rows = (data ?? []) as FlywheelRow[];
  if (rows.length === 0) return "";

  const examples = rows
    .map((row, i) =>
      formatFlywheelExample(
        { ...row, conversation_history: parseHistory(row.conversation_history) },
        i
      )
    )
    .join("\n\n");

  return `HISTORICAL PERFORMANCE CONTEXT: Here are real examples of past outbound sequences on this platform that successfully converted prospects into paying users. Mirror their tone, brevity, and pacing style:\n\n${examples}`;
}

export class ConversionError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly step?: string
  ) {
    super(message);
    this.name = "ConversionError";
  }
}

const conversionBodySchema = z.object({
  leadId: z.string().uuid(),
  outcome: z.enum(["won", "lost"]),
});

export function parseConversionBody(body: unknown): {
  leadId: string;
  outcome: "won" | "lost";
} {
  const parsed = conversionBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new ConversionError(
      "Invalid body: leadId and outcome ('won' | 'lost') required",
      400,
      "body"
    );
  }
  return parsed.data;
}

type LeadForConversion = {
  id: string;
  user_id: string;
  platform: string | null;
  source_url: string | null;
  content: string;
  conversation_history: unknown;
  ai_draft_content: string | null;
};

async function fetchLeadForConversion(
  leadId: string,
  userId: string
): Promise<LeadForConversion> {
  const { data, error } = await supabaseServer
    .from("leads")
    .select(
      "id, user_id, platform, source_url, content, conversation_history, ai_draft_content"
    )
    .eq("id", leadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ConversionError(`Failed to load lead: ${error.message}`, 500, "lead");
  }
  if (!data) {
    throw new ConversionError("Lead not found", 404, "lead");
  }
  return data as LeadForConversion;
}

export async function executeConversionOutcome(
  userId: string,
  leadId: string,
  outcome: "won" | "lost"
): Promise<{ ok: true; leadId: string; status: string; flywheelSaved: boolean }> {
  const lead = await fetchLeadForConversion(leadId, userId);
  const sourceUrl = lead.source_url?.trim() ?? "";
  const platform = normalizePlatform(lead.platform, sourceUrl);
  const subreddit = extractSubredditFromUrl(sourceUrl);
  let history = parseHistory(lead.conversation_history);

  if (
    lead.ai_draft_content?.trim() &&
    !history.some((t) => t.role === "user" && t.content === lead.ai_draft_content)
  ) {
    history = [
      ...history,
      {
        role: "user",
        content: lead.ai_draft_content.trim(),
        at: new Date().toISOString(),
      },
    ];
  }

  let flywheelSaved = false;

  if (outcome === "won") {
    const { error: insertError } = await supabaseServer
      .from("conversion_flywheel")
      .insert({
        user_id: userId,
        lead_id: lead.id,
        platform,
        subreddit,
        source_url: sourceUrl || null,
        original_post: lead.content,
        conversation_history: history,
        outcome: "won",
      });

    if (insertError) {
      throw new ConversionError(
        `Failed to save conversion flywheel: ${insertError.message}`,
        500,
        "flywheel"
      );
    }
    flywheelSaved = true;
  }

  const { error: archiveError } = await supabaseServer
    .from("leads")
    .update({ status: "archived" })
    .eq("id", leadId)
    .eq("user_id", userId);

  if (archiveError) {
    throw new ConversionError(
      `Failed to archive lead: ${archiveError.message}`,
      500,
      "archive"
    );
  }

  return {
    ok: true,
    leadId,
    status: "archived",
    flywheelSaved,
  };
}
