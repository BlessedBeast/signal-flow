import { z } from "zod";

import type {
  BipGenerateResult,
  BipOptionType,
  BipPostOption,
} from "@/lib/bip/types";
import { resolveAuthenticatedUserId } from "@/lib/onboard-pipeline";
import { safeParseProductDna } from "@/lib/product-dna-schema";
import type { ProductDNA } from "@/lib/signalflow-types";
import { supabaseServer } from "@/lib/supabase-server";

export type { BipGenerateResult, BipOptionType, BipPostOption } from "@/lib/bip/types";

const OPENAI_MODEL = "gpt-4o-mini";

const bipOptionTypeSchema = z.enum([
  "data-drop",
  "raw-build",
  "competitor-flank",
]);

const aiBipOptionSchema = z.object({
  type: bipOptionTypeSchema,
  label: z.string().min(1),
  text: z.string().min(1),
});

const aiBipResponseSchema = z.object({
  options: z.array(aiBipOptionSchema).length(3),
});

export class BipError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly step?: "auth" | "profile" | "leads" | "generate"
  ) {
    super(message);
    this.name = "BipError";
  }
}

export { resolveAuthenticatedUserId };

const OPTION_LABELS: Record<BipOptionType, string> = {
  "data-drop": "The Data-Drop",
  "raw-build": "The Raw Build",
  "competitor-flank": "The Competitor Flank",
};

function clampTweet(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= 280) return trimmed;
  return `${trimmed.slice(0, 277).trimEnd()}…`;
}

async function loadProfileDna(userId: string): Promise<ProductDNA> {
  const { data, error } = await supabaseServer
    .from("profiles")
    .select("product_dna")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new BipError(`Failed to load profile: ${error.message}`, 500, "profile");
  }

  const dna = safeParseProductDna(data?.product_dna);
  if (!dna) {
    throw new BipError(
      "Product DNA not found. Complete onboarding before generating Build in Public posts.",
      400,
      "profile"
    );
  }

  return dna;
}

async function countActiveLeads(userId: string): Promise<number> {
  const { count, error } = await supabaseServer
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("status", "archived");

  if (error) {
    throw new BipError(`Failed to count leads: ${error.message}`, 500, "leads");
  }

  return count ?? 0;
}

function buildBipPrompt(dna: ProductDNA, activeLeadCount: number): string {
  const platforms = dna.targetPlatforms.join(", ");
  const keywords = dna.keywords.length > 0 ? dna.keywords.join(", ") : "(none)";
  const competitors =
    dna.competitors.length > 0 ? dna.competitors.join(", ") : "(none listed)";

  return `Generate exactly three distinct daily X (Twitter) post options for a Build in Public indie hacker.

Product context:
- productName: ${dna.productName}
- oneLiner: ${dna.oneLiner}
- audience: ${dna.audience}
- targetPlatforms: ${platforms}
- keywords: ${keywords}
- competitors: ${competitors}
- active tracked pipeline leads (non-archived): ${activeLeadCount}

Tone rules (all options):
- Casual, raw, authentic indie hacker voice — fragmented developer styling, lowercase hooks where natural.
- Zero corporate marketing fluff, no hashtag spam, no "we're excited to announce".
- Each post MUST be ≤280 characters (hard limit).
- Write ready-to-post copy — no quotes around the tweet, no option labels inside the text.

Return JSON with exactly this shape:
{
  "options": [
    { "type": "data-drop", "label": "The Data-Drop", "text": "..." },
    { "type": "raw-build", "label": "The Raw Build", "text": "..." },
    { "type": "competitor-flank", "label": "The Competitor Flank", "text": "..." }
  ]
}

Option requirements:

1. data-drop ("The Data-Drop"):
- Use product keywords and/or the active lead count (${activeLeadCount}) as data indicators.
- Frame a value-first observation — a insight, pattern, or signal from building in public.
- Feel like a founder sharing a real metric or discovery, not a press release.

2. raw-build ("The Raw Build"):
- Shipping milestone narrative referencing "${dna.productName}".
- Mention mining/listening on ${platforms} or building for ${dna.audience}.
- Raw builder energy — what shipped, what broke, what's next.

3. competitor-flank ("The Competitor Flank"):
- Use competitors (${competitors}) to explain why an alternative is needed for ${dna.audience}.
- Don't trash-talk — contrast positioning with honest indie-builder perspective.
- If no competitors listed, contrast generic incumbents in the category without naming fake brands.`;
}

function normalizeOptions(raw: z.infer<typeof aiBipResponseSchema>): BipPostOption[] {
  const byType = new Map<BipOptionType, BipPostOption>();

  for (const option of raw.options) {
    byType.set(option.type, {
      type: option.type,
      label: OPTION_LABELS[option.type] ?? option.label.trim(),
      text: clampTweet(option.text),
    });
  }

  const orderedTypes: BipOptionType[] = [
    "data-drop",
    "raw-build",
    "competitor-flank",
  ];

  return orderedTypes.map((type) => {
    const existing = byType.get(type);
    if (existing) return existing;
    throw new BipError(`Missing AI option for type: ${type}`, 502, "generate");
  });
}

async function generateWithOpenAI(
  dna: ProductDNA,
  activeLeadCount: number
): Promise<BipPostOption[]> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new BipError("OPENAI_API_KEY is not configured", 500, "generate");
  }

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
          {
            role: "system",
            content:
              "You are an expert Build in Public copywriter for indie hackers on X. Output only valid JSON. Every post text must be ≤280 characters.",
          },
          {
            role: "user",
            content: buildBipPrompt(dna, activeLeadCount),
          },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "OpenAI request failed";
    throw new BipError(`Generation failed: ${message}`, 502, "generate");
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new BipError(
      `OpenAI returned ${response.status}: ${detail}`,
      502,
      "generate"
    );
  }

  let completion: {
    choices?: { message?: { content?: string | null } }[];
  };

  try {
    completion = (await response.json()) as typeof completion;
  } catch {
    throw new BipError("OpenAI returned invalid JSON envelope", 502, "generate");
  }

  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new BipError("OpenAI returned empty completion", 502, "generate");
  }

  let json: unknown;
  try {
    json = JSON.parse(content) as unknown;
  } catch {
    throw new BipError("OpenAI returned non-JSON content", 502, "generate");
  }

  const parsed = aiBipResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new BipError(
      `AI response failed validation: ${parsed.error.message}`,
      502,
      "generate"
    );
  }

  const options = normalizeOptions(parsed.data);
  if (options.length !== 3) {
    throw new BipError("AI did not return three valid post options", 502, "generate");
  }

  return options;
}

export async function executeBipGenerate(userId: string): Promise<BipGenerateResult> {
  const [dna, activeLeadCount] = await Promise.all([
    loadProfileDna(userId),
    countActiveLeads(userId),
  ]);

  const options = await generateWithOpenAI(dna, activeLeadCount);

  return {
    ok: true,
    options,
    meta: {
      activeLeadCount,
      generatedAt: new Date().toISOString(),
    },
  };
}
