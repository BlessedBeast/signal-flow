import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { safeParseProductDna } from "@/lib/product-dna-schema";
import type { ProductDNA } from "@/lib/signalflow-types";

const OPENAI_MODEL = "gpt-4o";

const inboundBodySchema = z.object({
  platform: z.enum(["x", "linkedin"]),
  originalThread: z.string().min(1, "originalThread is required"),
  posture: z.enum(["plug", "hype", "deflector"]),
});

const inboundReplyItemSchema = z.object({
  commentSnippet: z.string().min(1),
  suggestedReply: z.string().min(1),
});

const inboundResponseSchema = z.object({
  replies: z.array(inboundReplyItemSchema).min(1),
});

export type InboundPlatform = z.infer<typeof inboundBodySchema>["platform"];
export type InboundPosture = z.infer<typeof inboundBodySchema>["posture"];

export type InboundReplyItem = z.infer<typeof inboundReplyItemSchema>;

export type InboundGenerateResult = {
  ok: true;
  data: InboundReplyItem[];
};

export class InboundError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly step?: string
  ) {
    super(message);
    this.name = "InboundError";
  }
}

export function parseInboundBody(body: unknown): {
  platform: InboundPlatform;
  originalThread: string;
  posture: InboundPosture;
} {
  const parsed = inboundBodySchema.safeParse(body);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => i.message).join("; ");
    throw new InboundError(
      `Invalid request body: ${detail}`,
      400,
      "body"
    );
  }

  const originalThread = parsed.data.originalThread.trim();
  if (!originalThread) {
    throw new InboundError(
      "Invalid request body: originalThread cannot be empty",
      400,
      "body"
    );
  }

  return {
    platform: parsed.data.platform,
    originalThread,
    posture: parsed.data.posture,
  };
}

function buildAntiAiDetectionBlock(): string {
  return `CRITICAL ANTI-AI DETECTION RULES (mandatory for every suggestedReply):
- NEVER use em-dashes (—) or en-dashes (–). Only commas, periods, or a basic hyphen (-).
- BANNED WORDS/PHRASES: delve, leverage, maze, goldmine, unlock, supercharge, crucial, pain point, hope that helps, happy to help, game-changer, in conclusion, right?, remember.
- Write lowercase-heavy, fragmented, casual developer voice. Use shortcuts like idk, tbh, imo, wdym when natural.
- No bullet points, no bold, no corporate greetings or sign-offs.
- Add a slight rough edge (missing apostrophe, trailing comma) so it reads human-posted.
- No rhetorical opener/closer questions.`;
}

function buildPostureBlock(
  posture: InboundPosture,
  productDna: ProductDNA | null
): string {
  const productLine = productDna
    ? `Product: ${productDna.productName} — ${productDna.oneLiner} — URL: ${productDna.url}`
    : "Product: (no vault DNA — keep any plug soft and generic, no fabricated URLs)";

  switch (posture) {
    case "plug":
      return `POSTURE: plug
${productLine}
Style: acknowledge their point casually with low-cap fragmented styling. drop a quick technical implementation detail. naturally weave the product value prop and include the product URL when it fits (never forced). sound like a builder who actually shipped something, not a marketer.`;
    case "hype":
      return `POSTURE: hype
Style: high-energy but ultra-authentic acknowledgment (e.g. "appreciate that", "huge fan of this approach"). treat them like an elite peer builder. celebrate their insight without sounding like a fanboy bot.`;
    case "deflector":
      return `POSTURE: deflector
Style: witty, completely calm, objective defense against critics or trolls. highlight actual execution over over-engineering. zero corporate tone, zero defensive whining. short punchy counters only.`;
  }
}

function buildPlatformBlock(platform: InboundPlatform): string {
  if (platform === "x") {
    return `PLATFORM: X (Twitter)
- Keep each suggestedReply tight and punchy. fragmented micro-bursts, not essay paragraphs.
- Match timeline-native casual tone.`;
  }

  return `PLATFORM: LinkedIn
- Slightly more complete sentences than X, still casual and peer-level.
- No LinkedIn-bro hype or " thrilled to announce " energy.`;
}

function buildSystemPrompt(params: {
  platform: InboundPlatform;
  posture: InboundPosture;
  productDna: ProductDNA | null;
}): string {
  return `You are an inbound comment reply engine for indie SaaS founders.

INPUT SHAPE:
The user pastes a messy raw text block copied from social feeds. It may contain usernames, timestamps, line breaks, emoji, quote markers, or multiple comments run together without clean structure.

YOUR JOB:
1. Parse the pasted block and separate distinct user comments (ignore duplicate UI chrome, "Show more", like counts, etc.).
2. For each distinct comment worth replying to, produce one object in a JSON array.

OUTPUT FORMAT (strict JSON only, no markdown fences):
{
  "replies": [
    { "commentSnippet": "short excerpt of the comment you are replying to", "suggestedReply": "your draft reply" }
  ]
}

Rules:
- commentSnippet: max ~120 chars, verbatim or lightly trimmed from the source comment.
- suggestedReply: ready to paste as a public reply on ${params.platform}.
- Skip spam, bots, or empty noise. If only one real comment exists, return one item.
- Return at least one reply when any reply-worthy comment exists.

${buildPlatformBlock(params.platform)}

${buildPostureBlock(params.posture, params.productDna)}

${buildAntiAiDetectionBlock()}`;
}

async function loadProductDna(
  supabase: SupabaseClient,
  userId: string
): Promise<ProductDNA | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("product_dna")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "[INBOUND TRACE] Profile DNA fetch failed:",
      error.message,
      error.details
    );
    throw new InboundError(
      `Failed to load profile context: ${error.message}`,
      500,
      "profile"
    );
  }

  return safeParseProductDna(data?.product_dna);
}

async function callOpenAiInbound(params: {
  platform: InboundPlatform;
  posture: InboundPosture;
  originalThread: string;
  productDna: ProductDNA | null;
}): Promise<InboundReplyItem[]> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new InboundError("OPENAI_API_KEY is not configured", 500, "openai");
  }

  const systemPrompt = buildSystemPrompt({
    platform: params.platform,
    posture: params.posture,
    productDna: params.productDna,
  });

  const userPrompt = `Parse this pasted ${params.platform} thread block and generate replies with posture "${params.posture}":

---
${params.originalThread.slice(0, 12000)}
---`;

  console.log(
    "[INBOUND TRACE] OpenAI request — model:",
    OPENAI_MODEL,
    "| platform:",
    params.platform,
    "| posture:",
    params.posture,
    "| thread length:",
    params.originalThread.length
  );

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
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : "OpenAI request failed";
    console.error("[INBOUND TRACE] OpenAI network error:", msg);
    throw new InboundError(`Inbound generation failed: ${msg}`, 502, "openai");
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    console.error(
      "[INBOUND TRACE] OpenAI HTTP error:",
      response.status,
      detail
    );
    throw new InboundError(
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
    console.error("[INBOUND TRACE] OpenAI returned empty content");
    throw new InboundError("OpenAI returned empty content", 502, "openai");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch {
    console.error(
      "[INBOUND TRACE] OpenAI JSON parse failed — raw:",
      rawContent.slice(0, 300)
    );
    throw new InboundError(
      "OpenAI returned invalid JSON for inbound replies",
      502,
      "openai"
    );
  }

  const validated = inboundResponseSchema.safeParse(parsedJson);
  if (!validated.success) {
    console.error(
      "[INBOUND TRACE] Response schema validation failed:",
      validated.error.message
    );
    throw new InboundError(
      "OpenAI response did not match inbound reply schema",
      502,
      "openai"
    );
  }

  console.log(
    "[INBOUND TRACE] Parsed reply count:",
    validated.data.replies.length
  );

  return validated.data.replies;
}

async function persistInboundInteraction(params: {
  supabase: SupabaseClient;
  userId: string;
  platform: InboundPlatform;
  originalThread: string;
  replies: InboundReplyItem[];
}): Promise<void> {
  const generatedReplies = JSON.stringify(params.replies);

  console.log(
    "[INBOUND TRACE] Persisting inbound_interactions row — user:",
    params.userId,
    "| platform:",
    params.platform
  );

  const { error } = await params.supabase.from("inbound_interactions").insert({
    user_id: params.userId,
    platform: params.platform,
    original_thread: params.originalThread,
    generated_replies: params.replies,
  });

  if (error) {
    const rlsViolation =
      error.code === "42501" ||
      /row-level security/i.test(error.message ?? "");
    console.error(
      "[INBOUND TRACE] Supabase insert rejected:",
      error.message,
      error.details,
      rlsViolation ? "(RLS — JWT may not be bound to this client)" : ""
    );
    throw new InboundError(
      rlsViolation
        ? "Failed to persist inbound interaction: not authorized (session token required for RLS)"
        : `Failed to persist inbound interaction: ${error.message}`,
      rlsViolation ? 403 : 500,
      "persist"
    );
  }

  console.log(
    "[INBOUND TRACE] Persisted generated_replies payload length:",
    generatedReplies.length
  );
}

export async function executeInboundGeneration(
  userId: string,
  supabase: SupabaseClient,
  input: {
    platform: InboundPlatform;
    originalThread: string;
    posture: InboundPosture;
  }
): Promise<InboundGenerateResult> {
  console.log("[INBOUND TRACE] Checkpoint: load profile DNA");
  const productDna = await loadProductDna(supabase, userId);

  console.log("[INBOUND TRACE] Checkpoint: OpenAI completion");
  const replies = await callOpenAiInbound({
    platform: input.platform,
    posture: input.posture,
    originalThread: input.originalThread,
    productDna,
  });

  console.log("[INBOUND TRACE] Checkpoint: Supabase persist");
  await persistInboundInteraction({
    supabase,
    userId,
    platform: input.platform,
    originalThread: input.originalThread,
    replies,
  });

  return { ok: true, data: replies };
}
