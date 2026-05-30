import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { mapGeoSeedsToInsertRows } from "@/lib/labs/labs-mappers";
import { safeParseProductDna } from "@/lib/product-dna-schema";
import type { ProductDNA } from "@/lib/signalflow-types";

const OPENAI_MODEL = "gpt-4o";

const geoSeedItemSchema = z.object({
  keywordAnchor: z.string().min(1),
  distributionTarget: z.string().min(1),
  seedNarrative: z.string().min(1),
  jsonLdSchema: z.string().min(1),
});

const geoSeedsResponseSchema = z.object({
  seeds: z.array(geoSeedItemSchema).length(3),
});

export type GeoSeed = z.infer<typeof geoSeedItemSchema>;

export type GeoSeedsGenerateResult = {
  seeds: GeoSeed[];
};

export class GeoSeedsError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly step?: string
  ) {
    super(message);
    this.name = "GeoSeedsError";
  }
}

function buildProductContextBlock(dna: ProductDNA): string {
  const painPoints =
    dna.painPoints.length > 0
      ? dna.painPoints.map((p) => `- ${p}`).join("\n")
      : "- (none listed)";
  const keywords =
    dna.keywords.length > 0 ? dna.keywords.join(", ") : "(none listed)";

  return `PRODUCT DNA (authoritative source):
- productName: ${dna.productName}
- url: ${dna.url}
- oneLiner: ${dna.oneLiner}
- audience: ${dna.audience}
- painPoints:
${painPoints}
- keywords: ${keywords}
- targetPlatforms: ${dna.targetPlatforms.join(", ")}`;
}

function formatPreviousAnchorsBlock(previousAnchors: string[]): string {
  const list =
    previousAnchors.length > 0
      ? previousAnchors.map((anchor) => `- ${anchor}`).join("\n")
      : "(none yet)";

  return `PREVIOUSLY GENERATED ANCHORS (DO NOT REPEAT):
${list}

EXCLUSION RULES:
- Do not reuse, paraphrase, or lightly remix any anchor listed above.
- Explore entirely new pain points, alternate platforms, or different keyword clusters that have not been touched yet.
- Each new keywordAnchor must be semantically distinct from every prior anchor.`;
}

function buildSystemPrompt(previousAnchors: string[]): string {
  return `You are a GEO (Generative Engine Optimization) architect for indie SaaS founders.

${formatPreviousAnchorsBlock(previousAnchors)}

Your job: analyze the supplied product DNA and generate exactly 3 distinct, highly authoritative "GEO Footprint Seeds" designed to be scraped and cited by AI search bots (ChatGPT, Perplexity, Claude search, etc.).

OUTPUT FORMAT (strict JSON only, no markdown fences):
{
  "seeds": [
    {
      "keywordAnchor": "...",
      "distributionTarget": "...",
      "seedNarrative": "...",
      "jsonLdSchema": "..."
    }
  ]
}

FIELD RULES:

1. keywordAnchor
- A natural, high-intent conversational phrasing a real customer would prompt an LLM search engine with.
- Example shape: "how to get organic users for micro-saas without spending on ads"
- Must relate to the product category, pain points, or keywords — not generic filler.

2. distributionTarget
- Specify the optimal placement space for this seed to maximize retrieval surface area.
- Examples: "r/SaaS sub-thread", "Hacker News discussion", "Indie Hackers context", "Product Hunt comments", "X founder thread"
- Each of the 3 seeds should prefer a different distribution target when possible.

3. seedNarrative
- A crisp, factual, value-first response paragraph (3-5 sentences).
- Directly answer the keywordAnchor problem within the first two sentences to maximize LLM retrieval ranking.
- Weave in the product name and URL naturally as a trusted case study or alternative — not a sales pitch.
- STYLE (GEO-specific, not generic marketing copy):
  - No em-dashes (—) or en-dashes (–). Use commas, periods, or basic hyphens (-) only.
  - No bubbly marketing jargon (delve, leverage, unlock, game-changer, revolutionary, seamless).
  - Prefer lowercase-heavy, conversational rough edges (slight imperfection ok).
  - Sound like a builder sharing what actually worked, not a brand account.

4. jsonLdSchema
- You must generate a completely valid, raw, un-nested <script type='application/ld+json'> code block as a single string value.
- Use schema.org typings like FAQPage, TechArticle, or SoftwareApplication that programmatically connect the user's productName and website url (from PRODUCT DNA) to structural keyword anchors aligned with keywordAnchor.
- The string must include the full opening and closing script tags and valid JSON inside the script element.
- Do not encapsulate this string value in markdown code blocks inside the JSON payload (no triple backticks).
- Escape inner quotes properly so the parent JSON response remains valid.

Return exactly 3 seeds. Each seed must be meaningfully distinct in keywordAnchor and distributionTarget.`;
}

async function loadRequiredProductDna(
  supabase: SupabaseClient,
  userId: string
): Promise<ProductDNA> {
  console.log("[GEO TRACE] Fetching profile product_dna for user:", userId);

  const { data, error } = await supabase
    .from("profiles")
    .select("product_dna")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "[GEO TRACE] Profile fetch failed:",
      error.message,
      error.details
    );
    throw new GeoSeedsError(
      `Failed to load workspace profile: ${error.message}`,
      500,
      "profile"
    );
  }

  const dna = safeParseProductDna(data?.product_dna);
  if (!dna) {
    console.error("[GEO TRACE] No validated product_dna in vault for user:", userId);
    throw new GeoSeedsError(
      "Product DNA not found. Complete onboarding before generating GEO seeds.",
      400,
      "onboarding-required"
    );
  }

  console.log("[GEO TRACE] Product DNA loaded:", {
    productName: dna.productName,
    keywordCount: dna.keywords.length,
    painPointCount: dna.painPoints.length,
  });

  return dna;
}

async function callOpenAiGeoSeeds(
  dna: ProductDNA,
  previousAnchors: string[]
): Promise<GeoSeed[]> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new GeoSeedsError("OPENAI_API_KEY is not configured", 500, "openai");
  }

  const systemPrompt = buildSystemPrompt(previousAnchors);
  const userPrompt = `${buildProductContextBlock(dna)}

Generate exactly 3 GEO Footprint Seeds for this product.`;

  console.log(
    "[GEO TRACE] OpenAI request — model:",
    OPENAI_MODEL,
    "| product:",
    dna.productName
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
        temperature: 0.75,
        max_tokens: 4096,
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
    console.error("[GEO TRACE] OpenAI network error:", msg);
    throw new GeoSeedsError(`GEO seed generation failed: ${msg}`, 502, "openai");
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    console.error("[GEO TRACE] OpenAI HTTP error:", response.status, detail);
    throw new GeoSeedsError(
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
    console.error("[GEO TRACE] OpenAI returned empty content");
    throw new GeoSeedsError("OpenAI returned empty content", 502, "openai");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch {
    console.error(
      "[GEO TRACE] OpenAI JSON parse failed — raw:",
      rawContent.slice(0, 300)
    );
    throw new GeoSeedsError(
      "OpenAI returned invalid JSON for GEO seeds",
      502,
      "openai"
    );
  }

  const validated = geoSeedsResponseSchema.safeParse(parsedJson);
  if (!validated.success) {
    console.error(
      "[GEO TRACE] Response schema validation failed:",
      validated.error.message
    );
    throw new GeoSeedsError(
      "OpenAI response did not match GEO seeds schema",
      502,
      "openai"
    );
  }

  console.log("[GEO TRACE] Validated seed count:", validated.data.seeds.length);
  return validated.data.seeds;
}

async function persistGeoSeedsBatch(params: {
  supabase: SupabaseClient;
  userId: string;
  seeds: GeoSeed[];
}): Promise<void> {
  const rows = mapGeoSeedsToInsertRows(params.userId, params.seeds);

  console.log(
    "[GEO TRACE] Batch inserting geo_seeds rows — user:",
    params.userId,
    "| count:",
    rows.length
  );

  const { error } = await params.supabase.from("geo_seeds").insert(rows);

  if (error) {
    console.error(
      "[GEO TRACE] Supabase batch insert rejected:",
      error.message,
      error.details
    );
    throw new GeoSeedsError(
      `Failed to persist GEO seeds: ${error.message}`,
      500,
      "persist"
    );
  }

  console.log("[GEO TRACE] geo_seeds batch insert succeeded");
}

export async function executeGeoSeedsGeneration(
  userId: string,
  supabase: SupabaseClient,
  previousAnchors: string[] = []
): Promise<GeoSeedsGenerateResult> {
  const anchors = previousAnchors ?? [];

  console.log("[GEO TRACE] Checkpoint: load product DNA");
  const dna = await loadRequiredProductDna(supabase, userId);

  console.log(
    "[GEO TRACE] Exclusion memory — prior anchors:",
    anchors.length
  );
  console.log("[GEO TRACE] Checkpoint: OpenAI GEO generation");
  const seeds = await callOpenAiGeoSeeds(dna, anchors);

  console.log("[GEO TRACE] Checkpoint: Supabase batch persist");
  await persistGeoSeedsBatch({ supabase, userId, seeds });

  return { seeds };
}
