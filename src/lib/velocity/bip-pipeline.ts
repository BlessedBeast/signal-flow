import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  BIP_POST_TYPES,
  type BipGenerateResult,
  type BipLedgerEntry,
  type BipLedgerListResult,
  type BipPostType,
} from "@/lib/bip/types";
import { safeParseProductDna } from "@/lib/product-dna-schema";
import type { ProductDNA } from "@/lib/signalflow-types";

export const BIP_LEDGER_TABLE = "bip_ledger" as const;
const OPENAI_MODEL = "gpt-4o";
const MEMORY_FETCH_LIMIT = 3;
const TIMELINE_FETCH_LIMIT = 30;

const bipBodySchema = z.object({
  postType: z.enum(BIP_POST_TYPES),
  currentFocus: z.string().min(1, "currentFocus is required"),
});

const openAiPostSchema = z.object({
  postContent: z.string().min(1),
});

export class BipPipelineError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly step?: string
  ) {
    super(message);
    this.name = "BipPipelineError";
  }
}

export function parseBipGenerateBody(body: unknown): {
  postType: BipPostType;
  currentFocus: string;
} {
  const parsed = bipBodySchema.safeParse(body);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => i.message).join("; ");
    throw new BipPipelineError(
      `Invalid request body: ${detail}`,
      400,
      "body"
    );
  }

  const currentFocus = parsed.data.currentFocus.trim();
  if (!currentFocus) {
    throw new BipPipelineError(
      "Invalid request body: currentFocus cannot be empty",
      400,
      "body"
    );
  }

  return {
    postType: parsed.data.postType,
    currentFocus,
  };
}

function buildAntiAiBlock(): string {
  return `ANTI-AI TONE (mandatory):
- NEVER use em-dashes (—) or en-dashes (–). Only commas, periods, or a basic hyphen (-).
- BANNED: delve, leverage, unlock, landscape, shortcut, game-changer, supercharge, crucial, pain point, hope that helps, in conclusion.
- lowercase-heavy, fragmented sentences, indie hacker voice. no hashtags.
- emphasize raw gritty build metrics: db query times, specific bugs, real mrr numbers, deploy fails, latency wins.
- slight rough edge ok (missing apostrophe, trailing comma). no corporate polish.`;
}

function buildPostTypeDirective(postType: BipPostType): string {
  switch (postType) {
    case "milestone":
      return "POST TYPE: milestone — celebrate a concrete win with specific numbers or shipped scope. no vague hype.";
    case "friction":
      return "POST TYPE: friction — honest struggle: what broke, what slowed you down, what you're untangling.";
    case "insight":
      return "POST TYPE: insight — a non-obvious lesson from building, tied to real user or code behavior.";
    case "ship":
      return "POST TYPE: ship — what you shipped today and why it matters for users. builder log energy.";
  }
}

function formatTimelineBlock(entries: BipLedgerEntry[]): string {
  if (entries.length === 0) {
    return "(no prior posts in ledger — this is day one of the public build log)";
  }

  return entries
    .map((entry, index) => {
      const focus = entry.current_focus?.trim()
        ? `\nBuilder focus that day: ${entry.current_focus}`
        : "";
      return `[${index + 1}] ${entry.created_at} · ${entry.post_type}${focus}\n${entry.post_content}`;
    })
    .join("\n\n---\n\n");
}

function clampPost(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 280) return trimmed;
  return `${trimmed.slice(0, 277).trimEnd()}…`;
}

function mapLedgerRow(row: {
  id: string;
  post_type: string;
  post_content: string;
  current_focus: string | null;
  created_at: string;
}): BipLedgerEntry {
  const postType = BIP_POST_TYPES.includes(row.post_type as BipPostType)
    ? (row.post_type as BipPostType)
    : "insight";

  return {
    id: row.id,
    post_type: postType,
    post_content: row.post_content,
    current_focus: row.current_focus,
    created_at: row.created_at,
  };
}

async function loadProductDna(
  supabase: SupabaseClient,
  userId: string
): Promise<ProductDNA> {
  const { data, error } = await supabase
    .from("profiles")
    .select("product_dna")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new BipPipelineError(
      `Failed to load profile: ${error.message}`,
      500,
      "profile"
    );
  }

  const dna = safeParseProductDna(data?.product_dna);
  if (!dna) {
    throw new BipPipelineError(
      "Product DNA not found. Complete onboarding before generating BIP posts.",
      400,
      "profile"
    );
  }

  return dna;
}

export async function fetchRecentBipMemory(
  supabase: SupabaseClient,
  userId: string
): Promise<BipLedgerEntry[]> {
  const { data, error } = await supabase
    .from(BIP_LEDGER_TABLE)
    .select("id, post_type, post_content, current_focus, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(MEMORY_FETCH_LIMIT);

  if (error) {
    throw new BipPipelineError(
      `Failed to load BIP memory: ${error.message}`,
      500,
      "memory"
    );
  }

  return (data ?? []).map(mapLedgerRow);
}

export async function fetchBipLedgerTimeline(
  supabase: SupabaseClient,
  userId: string
): Promise<BipLedgerListResult> {
  const { data, error } = await supabase
    .from(BIP_LEDGER_TABLE)
    .select("id, post_type, post_content, current_focus, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(TIMELINE_FETCH_LIMIT);

  if (error) {
    throw new BipPipelineError(
      `Failed to load BIP timeline: ${error.message}`,
      500,
      "timeline"
    );
  }

  return {
    ok: true,
    posts: (data ?? []).map(mapLedgerRow),
  };
}

async function generatePostWithOpenAI(params: {
  dna: ProductDNA;
  postType: BipPostType;
  currentFocus: string;
  memory: BipLedgerEntry[];
}): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new BipPipelineError("OPENAI_API_KEY is not configured", 500, "openai");
  }

  const timelineForPrompt = [...params.memory].reverse();

  const systemPrompt = `You are an elite indie hacker documenting your build-in-public journey on X (Twitter).

RECENT TIMELINE (newest last — read in chronological order):
${formatTimelineBlock(timelineForPrompt)}

Review the recent timeline. Your new post MUST logically follow these events. Do not introduce the same features, metrics, or insights that were just discussed.

${buildAntiAiBlock()}

${buildPostTypeDirective(params.postType)}

Return strict JSON only: { "postContent": "..." }
Hard limit: postContent must be ≤280 characters, ready to paste on X.`;

  const userPrompt = `Product: ${params.dna.productName}
One-liner: ${params.dna.oneLiner}
Audience: ${params.dna.audience}

What the builder did today (current focus):
${params.currentFocus}

Draft one new X post that continues the storyline.`;

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
        temperature: 0.88,
        max_tokens: 500,
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
    throw new BipPipelineError(`BIP generation failed: ${msg}`, 502, "openai");
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new BipPipelineError(
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
    throw new BipPipelineError("OpenAI returned empty post content", 502, "openai");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch {
    throw new BipPipelineError("OpenAI returned invalid JSON", 502, "openai");
  }

  const validated = openAiPostSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new BipPipelineError(
      "OpenAI response did not match post schema",
      502,
      "openai"
    );
  }

  return clampPost(validated.data.postContent);
}

async function insertLedgerEntry(
  supabase: SupabaseClient,
  params: {
    userId: string;
    postType: BipPostType;
    postContent: string;
    currentFocus: string;
  }
): Promise<BipLedgerEntry> {
  const { data, error } = await supabase
    .from(BIP_LEDGER_TABLE)
    .insert({
      user_id: params.userId,
      post_type: params.postType,
      post_content: params.postContent,
      current_focus: params.currentFocus,
    })
    .select("id, post_type, post_content, current_focus, created_at")
    .single();

  if (error || !data) {
    throw new BipPipelineError(
      `Failed to persist BIP ledger entry: ${error?.message ?? "unknown"}`,
      500,
      "persist"
    );
  }

  return mapLedgerRow(data);
}

export async function executeBipGenerate(
  userId: string,
  supabase: SupabaseClient,
  input: { postType: BipPostType; currentFocus: string }
): Promise<BipGenerateResult> {
  const [dna, memory] = await Promise.all([
    loadProductDna(supabase, userId),
    fetchRecentBipMemory(supabase, userId),
  ]);

  const postContent = await generatePostWithOpenAI({
    dna,
    postType: input.postType,
    currentFocus: input.currentFocus,
    memory,
  });

  const entry = await insertLedgerEntry(supabase, {
    userId,
    postType: input.postType,
    postContent,
    currentFocus: input.currentFocus,
  });

  return {
    ok: true,
    postContent,
    postType: input.postType,
    entry,
  };
}
