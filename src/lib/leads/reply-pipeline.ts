import { z } from "zod";

import { resolveAuthenticatedUserId } from "@/lib/onboard-pipeline";
import type {
  CompetitorBattlecards,
  ConversationTurn,
} from "@/lib/signalflow-types";
import { supabaseServer } from "@/lib/supabase-server";

import {
  buildCommunityComplianceProtocolBlock,
  fetchAndCacheCommunityRules,
  getDefaultComplianceFlags,
} from "./compliance-engine";
import { fetchWinningFlywheelExamples } from "./flywheel-pipeline";
import {
  buildConversationalDepthBlock,
  buildPlatformComplianceBlock,
  buildSourceCommunityContext,
  type SourceCommunityContext,
} from "./source-context";

const OPENAI_MODEL = "gpt-4o";

const conversationTurnSchema = z.object({
  role: z.enum(["prospect", "user"]),
  content: z.string(),
  at: z.string(),
});

const replyBodySchema = z.object({
  leadId: z.string().uuid(),
  prospectResponse: z.string().optional(),
});

export class ReplyError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly step?: string
  ) {
    super(message);
    this.name = "ReplyError";
  }
}

export type ReplyResult = {
  ok: true;
  reply: string;
  conversation_history: ConversationTurn[];
  ai_draft_content: string;
};

export { resolveAuthenticatedUserId };

export function parseReplyBody(body: unknown): {
  leadId: string;
  prospectResponse?: string;
} {
  const parsed = replyBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new ReplyError("Invalid request body: leadId is required", 400, "body");
  }
  const prospectResponse = parsed.data.prospectResponse?.trim();
  return {
    leadId: parsed.data.leadId,
    prospectResponse: prospectResponse || undefined,
  };
}

function parseConversationHistory(raw: unknown): ConversationTurn[] {
  if (!raw) return [];
  const parsed = z.array(conversationTurnSchema).safeParse(raw);
  if (!parsed.success) return [];
  return parsed.data;
}

function formatHistoryForPrompt(history: ConversationTurn[]): string {
  if (history.length === 0) return "(no prior messages in ledger)";
  return history
    .map((t) => `[${t.role}] ${t.content}`)
    .join("\n");
}

type LeadRow = {
  id: string;
  user_id: string;
  content: string;
  platform: string | null;
  source_url: string | null;
  conversation_history: unknown;
  ai_draft_content: string | null;
};

async function fetchLeadForUser(
  leadId: string,
  userId: string
): Promise<LeadRow> {
  const { data, error } = await supabaseServer
    .from("leads")
    .select(
      "id, user_id, content, platform, source_url, conversation_history, ai_draft_content"
    )
    .eq("id", leadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ReplyError(`Failed to load lead: ${error.message}`, 500, "lead");
  }
  if (!data) {
    throw new ReplyError("Lead not found", 404, "lead");
  }
  return data as LeadRow;
}

function parseBattlecardsFromDb(raw: unknown): CompetitorBattlecards {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }
  const out: CompetitorBattlecards = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value.trim()) {
      out[key] = value;
    }
  }
  return out;
}

export function findMentionedCompetitorBattlecard(
  textSources: string[],
  battlecards: CompetitorBattlecards
): { name: string; content: string } | null {
  const entries = Object.entries(battlecards).filter(
    ([, content]) => content.trim().length > 0
  );
  if (entries.length === 0) return null;

  const haystack = textSources.filter(Boolean).join("\n").toLowerCase();
  if (!haystack.trim()) return null;

  const sorted = [...entries].sort(([a], [b]) => b.length - a.length);

  for (const [name, content] of sorted) {
    if (haystack.includes(name.toLowerCase())) {
      return { name, content: content.trim() };
    }
  }

  return null;
}

function buildBattlecardSystemBlock(match: {
  name: string;
  content: string;
}): string {
  return `CRITICAL CONTEXT: The prospect mentioned your competitor ${match.name}. You must subtly weave the following counter-pitch advantage naturally into your casual, fragmented response without sounding like a corporate salesman: ${match.content}`;
}

async function fetchOperatorProfileContext(userId: string): Promise<{
  personaContext: string;
  battlecards: CompetitorBattlecards;
}> {
  const { data, error } = await supabaseServer
    .from("profiles")
    .select("persona_context, competitor_battlecards")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new ReplyError(
      `Failed to load operator profile: ${error.message}`,
      500,
      "profile"
    );
  }

  return {
    personaContext: (data?.persona_context as string | null)?.trim() ?? "",
    battlecards: parseBattlecardsFromDb(data?.competitor_battlecards),
  };
}

function buildRoughEdgesBlock(ctx: SourceCommunityContext): string {
  const platformName =
    ctx.platform === "reddit"
      ? ctx.subreddit
        ? `Reddit (r/${ctx.subreddit})`
        : "Reddit"
      : ctx.platform === "hackernews"
        ? "Hacker News"
        : ctx.platform === "x"
          ? "X (Twitter)"
          : "a community forum";

  return `ROUGH EDGES ENGINE — non-negotiable:
- Fragmented, casual pacing. Short bursts beat long paragraphs.
- Strictly NO corporate greetings (e.g. "Hi there", "Hope you're well").
- Strictly NO sign-offs (e.g. "Best", "Cheers", "Thanks in advance").
- Strictly NO summaries, bullet points, or polished marketing lists.
- Occasionally mid-thought or simple sentence fragments — authentic to ${platformName}.
- Sound like a peer on ${platformName}, not customer support or sales automation.
- Output ONLY the reply text the operator would paste. No quotes, labels, or meta commentary.`;
}

export async function generateRoughEdgesReply(params: {
  leadContent: string;
  sourceUrl: string;
  platform: string | null;
  personaContext: string;
  conversationHistory: ConversationTurn[];
  prospectResponse?: string;
  competitorMatch?: { name: string; content: string } | null;
}): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new ReplyError("OPENAI_API_KEY is not configured", 500, "openai");
  }

  const sourceUrl = params.sourceUrl.trim();
  const communityCtx = buildSourceCommunityContext({
    sourceUrl,
    platform: params.platform,
    conversationHistory: params.conversationHistory,
  });

  const persona =
    params.personaContext ||
    "Indie founder building B2B SaaS — direct, helpful, no corporate polish.";

  const complianceBlock = buildPlatformComplianceBlock(communityCtx);
  const depthBlock = buildConversationalDepthBlock(
    communityCtx.operatorTurnCount
  );

  let communityProtocolFlags = getDefaultComplianceFlags(communityCtx.platform);
  try {
    const cachedFlags = await fetchAndCacheCommunityRules(
      sourceUrl,
      params.platform
    );
    if (cachedFlags.length > 0) {
      communityProtocolFlags = cachedFlags;
    }
  } catch (err) {
    console.error(
      "[reply] compliance cache/scrape failed, using defaults:",
      err instanceof Error ? err.message : err
    );
  }

  const communityProtocolsBlock =
    buildCommunityComplianceProtocolBlock(communityProtocolFlags);

  const flywheelBlock = await fetchWinningFlywheelExamples(
    communityCtx.platform,
    3
  );

  const battlecardBlock = params.competitorMatch
    ? `\n\n${buildBattlecardSystemBlock(params.competitorMatch)}`
    : "";

  const flywheelSection = flywheelBlock ? `\n\n${flywheelBlock}` : "";

  const systemPrompt = `You write community replies for a real human operator — never as a brand bot.

OPERATOR PERSONA (mandatory — match this voice exactly):
${persona}${battlecardBlock}

${complianceBlock}

${communityProtocolsBlock}

${depthBlock}${flywheelSection}

${buildRoughEdgesBlock(communityCtx)}`;

  const historyBlock = formatHistoryForPrompt(params.conversationHistory);
  const task = params.prospectResponse
    ? `Latest message from the prospect:\n${params.prospectResponse}`
    : "Draft a first-touch reply to this thread that fits the operator voice and platform rules.";

  const communityMeta = communityCtx.subreddit
    ? `Detected community: Reddit r/${communityCtx.subreddit}`
    : `Detected platform: ${communityCtx.platform}`;

  const userPrompt = `${communityMeta}
Source URL: ${sourceUrl || "(unknown)"}

Original thread / post context:
---
${params.leadContent.slice(0, 4000)}
---

Conversation ledger (active operator turns: ${communityCtx.operatorTurnCount}):
${historyBlock}

${task}`;

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.85,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : "OpenAI request failed";
    throw new ReplyError(`Reply generation failed: ${msg}`, 502, "openai");
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new ReplyError(
      `OpenAI returned ${response.status}: ${detail}`,
      502,
      "openai"
    );
  }

  const completion = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const reply = completion.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new ReplyError("OpenAI returned an empty reply", 502, "openai");
  }

  return reply;
}

async function persistReplyUpdate(params: {
  leadId: string;
  userId: string;
  conversationHistory: ConversationTurn[];
  aiDraftContent: string;
}): Promise<void> {
  const { error } = await supabaseServer
    .from("leads")
    .update({
      conversation_history: params.conversationHistory,
      ai_draft_content: params.aiDraftContent,
      status: "drafted",
    })
    .eq("id", params.leadId)
    .eq("user_id", params.userId);

  if (error) {
    throw new ReplyError(
      `Failed to update lead ledger: ${error.message}`,
      500,
      "vault"
    );
  }
}

export async function executeReplyGeneration(
  userId: string,
  leadId: string,
  prospectResponse?: string
): Promise<ReplyResult> {
  const lead = await fetchLeadForUser(leadId, userId);
  const { personaContext, battlecards } =
    await fetchOperatorProfileContext(userId);

  const sourceUrl = lead.source_url?.trim() ?? "";

  const scanSources = [lead.content];
  if (prospectResponse) {
    scanSources.push(prospectResponse);
  }
  const competitorMatch = findMentionedCompetitorBattlecard(
    scanSources,
    battlecards
  );

  let history = parseConversationHistory(lead.conversation_history);

  if (prospectResponse) {
    history = [
      ...history,
      {
        role: "prospect",
        content: prospectResponse,
        at: new Date().toISOString(),
      },
    ];
  }

  const generatedReply = await generateRoughEdgesReply({
    leadContent: lead.content,
    sourceUrl,
    platform: lead.platform,
    personaContext,
    conversationHistory: history,
    prospectResponse,
    competitorMatch,
  });

  const userTurn: ConversationTurn = {
    role: "user",
    content: generatedReply,
    at: new Date().toISOString(),
  };

  history = [...history, userTurn];

  await persistReplyUpdate({
    leadId,
    userId,
    conversationHistory: history,
    aiDraftContent: generatedReply,
  });

  return {
    ok: true,
    reply: generatedReply,
    conversation_history: history,
    ai_draft_content: generatedReply,
  };
}
