import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { DISCOVERY_LEADS_TABLE } from "@/lib/discovery/lead-bank";
import {
  buildPlatformCommunityGuidelinesBlock,
  buildSourceCommunityContext,
  normalizePlatform,
} from "@/lib/leads/source-context";
import { safeParseProductDna } from "@/lib/product-dna-schema";
import type { ConversationTurn, Platform, ProductDNA } from "@/lib/signalflow-types";

const OPENAI_MODEL = "gpt-4o";

const followUpBodySchema = z.object({
  leadId: z.string().uuid(),
  followInput: z.string().min(1, "followInput is required"),
});

const conversationTurnSchema = z.object({
  role: z.enum(["prospect", "user"]),
  content: z.string(),
  at: z.string(),
});

const openAiReplySchema = z.object({
  suggestedReply: z.string().min(1),
});

export class FollowUpError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly step?: string
  ) {
    super(message);
    this.name = "FollowUpError";
  }
}

export type FollowUpResult = {
  ok: true;
  suggestedReply: string;
  conversation_history: ConversationTurn[];
  ai_draft_content: string;
};

export function parseFollowUpBody(body: unknown): {
  leadId: string;
  followInput: string;
} {
  const parsed = followUpBodySchema.safeParse(body);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => i.message).join("; ");
    throw new FollowUpError(
      `Invalid request body: ${detail}`,
      400,
      "body"
    );
  }

  const followInput = parsed.data.followInput.trim();
  if (!followInput) {
    throw new FollowUpError(
      "Invalid request body: followInput cannot be empty",
      400,
      "body"
    );
  }

  return {
    leadId: parsed.data.leadId,
    followInput,
  };
}

function parseConversationHistory(raw: unknown): ConversationTurn[] {
  if (!raw) return [];
  const parsed = z.array(conversationTurnSchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
}

function buildAntiAiDetectionBlock(): string {
  return `ANTI-AI DETECTION (mandatory):
- NEVER use em-dashes (—) or en-dashes (–). Only commas, periods, or a basic hyphen (-).
- BANNED WORDS/PHRASES: delve, leverage, landscape, shortcut, game-changer, unlock, supercharge, crucial, pain point, hope that helps, happy to help, in conclusion, right?, remember.
- Write like a raw human message typed in an IDE chat panel: lowercase-heavy, casual shortcuts (idk, tbh, imo, wdym), fragmented phrasing.
- No bullet points, no bold, no corporate greetings or sign-offs.
- Add a slight rough edge (missing apostrophe, trailing comma) so it reads human-posted.
- No rhetorical opener/closer questions.`;
}

function formatHistoryForPrompt(history: ConversationTurn[]): string {
  if (history.length === 0) return "(no prior turns in ledger)";
  return history
    .map((t) => `[${t.role}] ${t.content}`)
    .join("\n\n");
}

function buildProductContextBlock(dna: ProductDNA): string {
  const pains =
    dna.painPoints.length > 0
      ? dna.painPoints.map((p) => `- ${p}`).join("\n")
      : "- (none listed)";

  return `PRODUCT DNA:
- productName: ${dna.productName}
- url: ${dna.url}
- oneLiner: ${dna.oneLiner}
- audience: ${dna.audience}
- painPoints:
${pains}`;
}

type DiscoveryLeadRow = {
  id: string;
  user_id: string;
  content: string | null;
  platform: string | null;
  source_url: string | null;
  conversation_history: unknown;
  ai_draft_content: string | null;
  created_at: string;
};

async function fetchLeadForUser(
  supabase: SupabaseClient,
  leadId: string,
  userId: string
): Promise<DiscoveryLeadRow> {
  const { data, error } = await supabase
    .from(DISCOVERY_LEADS_TABLE)
    .select(
      "id, user_id, content, platform, source_url, conversation_history, ai_draft_content, created_at"
    )
    .eq("id", leadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new FollowUpError(`Failed to load lead: ${error.message}`, 500, "lead");
  }
  if (!data) {
    throw new FollowUpError("Lead not found", 404, "lead");
  }

  return data as DiscoveryLeadRow;
}

async function fetchProductDna(
  supabase: SupabaseClient,
  userId: string
): Promise<ProductDNA> {
  const { data, error } = await supabase
    .from("profiles")
    .select("product_dna")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new FollowUpError(
      `Failed to load profile: ${error.message}`,
      500,
      "profile"
    );
  }

  const dna = safeParseProductDna(data?.product_dna);
  if (!dna) {
    throw new FollowUpError(
      "Product DNA not found. Complete onboarding before generating follow-ups.",
      400,
      "onboarding-required"
    );
  }

  return dna;
}

async function generateFollowUpReply(params: {
  dna: ProductDNA;
  leadContent: string;
  history: ConversationTurn[];
  followInput: string;
  platform: Platform;
  sourceUrl: string;
}): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new FollowUpError("OPENAI_API_KEY is not configured", 500, "openai");
  }

  const communityCtx = buildSourceCommunityContext({
    sourceUrl: params.sourceUrl,
    platform: params.platform,
    conversationHistory: params.history,
  });

  const platformMatrix = buildPlatformCommunityGuidelinesBlock(communityCtx.platform);

  const systemPrompt = `You are an elite conversion strategist and peer software builder.

Review the entire chronological thread in conversation_history, including the prospect's newest message (followInput), and synthesize one high-converting smart follow-up reply as the operator.

ACTIVE PLATFORM: ${communityCtx.platform}
${platformMatrix}

${buildAntiAiDetectionBlock()}

Return strict JSON only: { "suggestedReply": "..." }
The suggestedReply must be the raw message text only, ready to paste into a community thread. It must strictly obey the platform matrix above.`;

  const userPrompt = `${buildProductContextBlock(params.dna)}

Detected platform: ${communityCtx.platform}
Source URL: ${params.sourceUrl || "(unknown)"}

Original thread post:
---
${params.leadContent.slice(0, 2500)}
---

Conversation ledger (chronological):
---
${formatHistoryForPrompt(params.history)}
---

Prospect follow-up (newest message — respond to this):
---
${params.followInput}
---`;

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
        temperature: 0.9,
        max_tokens: 800,
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
    throw new FollowUpError(`Follow-up generation failed: ${msg}`, 502, "openai");
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new FollowUpError(
      `OpenAI returned ${response.status}: ${detail}`,
      502,
      "openai"
    );
  }

  const completion = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const rawContent = completion.choices?.[0]?.message?.content?.trim();
  if (!rawContent) {
    throw new FollowUpError("OpenAI returned empty follow-up content", 502, "openai");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch {
    throw new FollowUpError(
      "OpenAI returned invalid JSON for follow-up reply",
      502,
      "openai"
    );
  }

  const validated = openAiReplySchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new FollowUpError(
      "OpenAI follow-up response did not match expected schema",
      502,
      "openai"
    );
  }

  return validated.data.suggestedReply.trim();
}

async function persistFollowUpUpdate(
  supabase: SupabaseClient,
  params: {
    leadId: string;
    userId: string;
    conversationHistory: ConversationTurn[];
    aiDraftContent: string;
  }
): Promise<void> {
  const { error } = await supabase
    .from(DISCOVERY_LEADS_TABLE)
    .update({
      conversation_history: params.conversationHistory,
      ai_draft_content: params.aiDraftContent,
      status: "drafted",
    })
    .eq("id", params.leadId)
    .eq("user_id", params.userId);

  if (error) {
    throw new FollowUpError(
      `Failed to update lead follow-up ledger: ${error.message}`,
      500,
      "persist"
    );
  }
}

export async function executeFollowUpGeneration(
  userId: string,
  supabase: SupabaseClient,
  input: { leadId: string; followInput: string }
): Promise<FollowUpResult> {
  const [lead, dna] = await Promise.all([
    fetchLeadForUser(supabase, input.leadId, userId),
    fetchProductDna(supabase, userId),
  ]);

  const leadContent = lead.content?.trim() ?? "";
  let history = parseConversationHistory(lead.conversation_history);

  if (history.length === 0 && leadContent) {
    history = [
      {
        role: "prospect",
        content: leadContent,
        at: lead.created_at,
      },
    ];
  }

  const prospectTurn: ConversationTurn = {
    role: "prospect",
    content: input.followInput,
    at: new Date().toISOString(),
  };

  const historyWithProspect = [...history, prospectTurn];

  const sourceUrl = lead.source_url?.trim() ?? "";
  const platform = normalizePlatform(lead.platform, sourceUrl);

  const suggestedReply = await generateFollowUpReply({
    dna,
    leadContent,
    history: historyWithProspect,
    followInput: input.followInput,
    platform,
    sourceUrl,
  });

  const userTurn: ConversationTurn = {
    role: "user",
    content: suggestedReply,
    at: new Date().toISOString(),
  };

  const conversation_history = [...historyWithProspect, userTurn];

  await persistFollowUpUpdate(supabase, {
    leadId: input.leadId,
    userId,
    conversationHistory: conversation_history,
    aiDraftContent: suggestedReply,
  });

  return {
    ok: true,
    suggestedReply,
    conversation_history,
    ai_draft_content: suggestedReply,
  };
}
