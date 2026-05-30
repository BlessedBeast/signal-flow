import { z } from "zod";

import { DISCOVERY_LEADS_TABLE } from "@/lib/discovery/lead-bank";
import { resolveAuthenticatedUserId } from "@/lib/onboard-pipeline";
import { safeParseProductDna } from "@/lib/product-dna-schema";
import type {
  CompetitorBattlecards,
  ConversationTurn,
  ProductDNA,
} from "@/lib/signalflow-types";
import { supabaseServer } from "@/lib/supabase-server";

import { getPlatformConstraints } from "@/lib/moderation/rule-cache-service";
import { buildPlatformComplianceGuardrailsBlock } from "@/lib/moderation/prompt-blocks";
import {
  emptyPlatformConstraints,
  type PlatformConstraints,
} from "@/lib/moderation/types";

import {
  buildCommunityComplianceProtocolBlock,
  getDefaultComplianceFlags,
} from "./compliance-engine";
import { fetchWinningFlywheelExamples } from "./flywheel-pipeline";
import {
  buildConversationalDepthBlock,
  buildPlatformComplianceBlock,
  buildSourceCommunityContext,
  extractSubredditFromUrl,
  normalizePlatform,
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

const replyOutputSchema = z.object({
  draft_text: z.string().min(1),
  media_directives: z.array(z.string().min(1)).min(1).max(2),
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
  media_directives: string[];
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
  url: string | null;
  conversation_history: unknown;
  ai_draft_content: string | null;
};

async function fetchLeadForUser(
  leadId: string,
  userId: string
): Promise<LeadRow> {
  const { data, error } = await supabaseServer
    .from(DISCOVERY_LEADS_TABLE)
    .select(
      "id, user_id, content, platform, source_url, conversation_history, ai_draft_content"
    )
    .eq("id", leadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "[REPLY TRACE] Lead fetch rejected by Supabase:",
      error.message,
      error.details
    );
    throw new ReplyError(`Failed to load lead: ${error.message}`, 500, "lead");
  }
  if (!data) {
    console.error("[REPLY TRACE] Lead not found for user:", userId, leadId);
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

function resolveTargetLocation(
  platform: string | null,
  sourceUrl: string
): string {
  const sub = extractSubredditFromUrl(sourceUrl);
  if (sub) return sub;
  const resolved = normalizePlatform(platform, sourceUrl);
  if (resolved === "reddit") return sourceUrl.trim() || "global";
  return `global_${resolved}`;
}

async function fetchOperatorProfileContext(userId: string): Promise<{
  personaContext: Record<string, unknown> | null;
  battlecards: CompetitorBattlecards;
  productDna: ProductDNA | null;
  userStats: Record<string, unknown>;
}> {
  console.log("[REPLY TRACE] Checkpoint 3: Profile Context Fetch — userId:", userId);

  const { data, error } = await supabaseServer
    .from("profiles")
    .select(
      "persona_context, competitor_battlecards, product_dna, current_streak, longest_streak"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "[REPLY TRACE] Profile fetch rejected by Supabase:",
      error.message,
      error.details
    );
    throw new ReplyError(
      `Failed to load operator profile: ${error.message}`,
      500,
      "profile"
    );
  }

  const productDna = safeParseProductDna(data?.product_dna);
  console.log(
    "[REPLY TRACE] Profile DNA retrieved keys:",
    Object.keys(productDna ?? {})
  );
  console.log("[REPLY TRACE] Profile context loaded:", {
    hasPersona: Boolean(data?.persona_context),
    battlecardCount: Object.keys(
      parseBattlecardsFromDb(data?.competitor_battlecards)
    ).length,
    hasProductDna: productDna !== null,
  });

  const personaContext =
    data?.persona_context &&
    typeof data.persona_context === "object" &&
    !Array.isArray(data.persona_context)
      ? (data.persona_context as Record<string, unknown>)
      : null;

  return {
    personaContext,
    battlecards: parseBattlecardsFromDb(data?.competitor_battlecards),
    productDna,
    userStats: {
      current_streak: Number(data?.current_streak ?? 0),
      longest_streak: Number(data?.longest_streak ?? 0),
      persona_context: personaContext,
    },
  };
}

function buildAntiAiDetectionToneBlock(): string {
  return `CRITICAL TONE CONSTRAINTS (ANTI-AI DETECTION):
You are an exhausted, highly technical indie-hacker scrolling a forum on your phone. You are NOT a helpful assistant, marketer, or AI.
1. BAN LIST: You must NEVER use the following words: 'delve, leverage, maze, goldmine, unlock, supercharge, crucial, pain point, right?, remember, in conclusion, game-changer, hope that helps, happy to help.'
2. SYNTAX: Write in lowercase-heavy, fragmented sentences. Do not use perfect grammar. Use casual abbreviations (e.g., 'idk', 'tbh', 'imo', 'wdym').
3. NO RHETORICAL QUESTIONS: Never open or close with a question like 'Have you tried...?' or 'Makes sense, right?'.
4. STRUCTURE: No bullet points. No bold text. One or two short, blocky paragraphs max.
5. THE 'ROUGH EDGE': Introduce a slight grammatical flaw (like a missing apostrophe or a trailing comma) to prove human origin. Be hyper-specific to the technical context.
6. THE PUNCTUATION TRAP: You must NEVER use the em-dash (—) or en-dash (–) characters under any circumstances. Only use standard commas, periods, or a basic keyboard hyphen (-). Subreddit auto-moderators use the em-dash as a hardcoded Regex trigger to instantly block AI content.`;
}

export async function generateRoughEdgesReply(params: {
  leadContent: string;
  sourceUrl: string;
  platform: string | null;
  personaContext: Record<string, unknown> | null;
  userStats?: Record<string, unknown>;
  conversationHistory: ConversationTurn[];
  prospectResponse?: string;
  competitorMatch?: { name: string; content: string } | null;
}): Promise<{ draft_text: string; media_directives: string[] }> {
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

  const personaJson = JSON.stringify(
    params.personaContext ?? { note: "No persona context captured yet." },
    null,
    2
  );

  const complianceBlock = buildPlatformComplianceBlock(communityCtx);
  const depthBlock = buildConversationalDepthBlock(
    communityCtx.operatorTurnCount
  );

  const targetLocation = resolveTargetLocation(params.platform, sourceUrl);
  let constraints: PlatformConstraints = emptyPlatformConstraints();
  try {
    console.log(
      "[REPLY TRACE] Checkpoint 4: Platform constraints cache — platform:",
      communityCtx.platform,
      "| location:",
      targetLocation
    );
    constraints = await getPlatformConstraints(
      communityCtx.platform,
      targetLocation,
      params.userStats
    );
    console.log(
      "[REPLY TRACE] Platform constraints resolved — rule count:",
      constraints.rules.length
    );
  } catch (err) {
    console.error(
      "[REPLY TRACE] Platform constraints cache failed, using defaults:",
      err instanceof Error ? err.message : err
    );
  }

  const platformGuardrailsBlock =
    buildPlatformComplianceGuardrailsBlock(constraints);

  const communityProtocolFlags =
    constraints.rules.length > 0
      ? constraints.rules
      : getDefaultComplianceFlags(communityCtx.platform);

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

  const systemPrompt = `OPERATOR PERSONA CONTEXT (mandatory):
${personaJson}${battlecardBlock}

PERSONA INJECTION RULE (non-negotiable):
- Adopt the specific background, tone, and historical details provided in the founder persona context.
- Integrate these facts seamlessly in the response.
- Do not invent generic backstories or fictional origin details.

ACTIVE PLATFORM: ${communityCtx.platform}

${buildAntiAiDetectionToneBlock()}

${platformGuardrailsBlock}

${complianceBlock}

${communityProtocolsBlock}

${depthBlock}${flywheelSection}

NATIVE PROOF PROTOCOL (mandatory):
- Alongside the draft, output 1-2 explicit directives for required visual proof assets (screenshot, short video, analytics chart, etc.).
- These directives must be specific to this platform/thread and immediately actionable.
- Do NOT ask the user to upload files in-app. The media is attached natively on the target platform.

OUTPUT FORMAT (strict JSON only):
{
  "draft_text": "string",
  "media_directives": ["directive 1", "directive 2"]
}`;

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
    console.log(
      "[REPLY TRACE] Checkpoint 5: OpenAI Pipeline Fire — model:",
      OPENAI_MODEL,
      "| operatorTurns:",
      communityCtx.operatorTurnCount
    );
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : "OpenAI request failed";
    console.error("[REPLY TRACE] OpenAI network/request error:", msg);
    throw new ReplyError(`Reply generation failed: ${msg}`, 502, "openai");
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    console.error(
      "[REPLY TRACE] OpenAI rejected request — HTTP status:",
      response.status,
      detail
    );
    throw new ReplyError(
      `OpenAI returned ${response.status}: ${detail}`,
      502,
      "openai"
    );
  }

  const completion = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const raw = completion.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    console.error("[REPLY TRACE] OpenAI returned empty reply content");
    throw new ReplyError("OpenAI returned an empty reply", 502, "openai");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ReplyError("OpenAI returned invalid reply JSON", 502, "openai");
  }

  const validated = replyOutputSchema.safeParse(parsed);
  if (!validated.success) {
    throw new ReplyError(
      `OpenAI reply schema mismatch: ${validated.error.message}`,
      502,
      "openai"
    );
  }

  console.log(
    "[REPLY TRACE] OpenAI draft generated — character length:",
    validated.data.draft_text.length
  );
  return validated.data;
}

async function persistReplyUpdate(params: {
  leadId: string;
  userId: string;
  conversationHistory: ConversationTurn[];
  aiDraftContent: string;
  mediaDirectives: string[];
}): Promise<void> {
  const { error } = await supabaseServer
    .from(DISCOVERY_LEADS_TABLE)
    .update({
      conversation_history: params.conversationHistory,
      ai_draft_content: params.aiDraftContent,
      media_directives: params.mediaDirectives,
      status: "drafted",
    })
    .eq("id", params.leadId)
    .eq("user_id", params.userId);

  if (error) {
    console.error(
      "[REPLY TRACE] Lead ledger update rejected by Supabase:",
      error.message,
      error.details
    );
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
  console.log("[REPLY TRACE] Lead record loaded:", {
    id: lead.id,
    platform: lead.platform,
    source_url: lead.source_url ?? lead.url,
    contentLength: lead.content.length,
    historyTurns: parseConversationHistory(lead.conversation_history).length,
    hasExistingDraft: Boolean(lead.ai_draft_content?.trim()),
  });
  console.log(
    "[REPLY TRACE] Target community / source URL:",
    lead.source_url ?? lead.url ?? "(none)"
  );

  const { personaContext, battlecards, userStats } =
    await fetchOperatorProfileContext(userId);

  const sourceUrl = lead.source_url?.trim() ?? lead.url?.trim() ?? "";

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

  const generated = await generateRoughEdgesReply({
    leadContent: lead.content,
    sourceUrl,
    platform: lead.platform,
    personaContext,
    userStats,
    conversationHistory: history,
    prospectResponse,
    competitorMatch,
  });

  const userTurn: ConversationTurn = {
    role: "user",
    content: generated.draft_text,
    at: new Date().toISOString(),
  };

  history = [...history, userTurn];

  await persistReplyUpdate({
    leadId,
    userId,
    conversationHistory: history,
    aiDraftContent: generated.draft_text,
    mediaDirectives: generated.media_directives,
  });

  return {
    ok: true,
    reply: generated.draft_text,
    conversation_history: history,
    ai_draft_content: generated.draft_text,
    media_directives: generated.media_directives,
  };
}
