import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { mapSideCarBlueprintToInsertRow } from "@/lib/labs/labs-mappers";
import { safeParseProductDna } from "@/lib/product-dna-schema";
import type { ProductDNA } from "@/lib/signalflow-types";

const OPENAI_MODEL = "gpt-4o";

const sideCarResponseSchema = z.object({
  toolName: z.string().min(1),
  conceptPitch: z.string().min(1),
  lovableMasterPrompt: z.string().min(1),
  seoKeywordsAndCaptureStrategy: z.string().min(1),
});

export type SideCarBlueprint = z.infer<typeof sideCarResponseSchema>;

/** Prior lead magnet record used for exclusion memory in generation. */
export type PreviousSideCarTool = {
  toolName: string;
  conceptPitch: string;
};

/** Legacy alias for consumers migrating from HTML export model. */
export type SideCarTool = SideCarBlueprint;

export class SideCarError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly step?: string
  ) {
    super(message);
    this.name = "SideCarError";
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

function formatPreviousToolsBlock(previousTools: PreviousSideCarTool[]): string {
  const list =
    previousTools.length > 0
      ? previousTools
          .map(
            (tool) =>
              `- ${tool.toolName}: ${tool.conceptPitch.slice(0, 280)}${tool.conceptPitch.length > 280 ? "…" : ""}`
          )
          .join("\n")
      : "(none yet)";

  return `PREVIOUSLY GENERATED LEAD MAGNETS (DO NOT REPEAT):
${list}

EXCLUSION RULES:
- Do not reuse the same tool name, utility vector, or core concept as any entry above.
- Conceptualize an entirely new utility vector for this run.
- If a prior blueprint was a Calculator, you must now ship an Audit Tool, Checklist Generator, Data Scraper blueprint, or another clearly different format.
- Rotate pain points, inputs, and viral hooks so this blueprint feels like a fresh product, not a reskin.`;
}

function buildSystemPrompt(previousTools: PreviousSideCarTool[]): string {
  return `You are a world-class growth engineer and digital marketing expert who builds free, viral, hyper-focused micro-tools (advanced calculators, audits, generators, scorecards) to capture leads for indie SaaS products.

${formatPreviousToolsBlock(previousTools)}

Your job: analyze the supplied product DNA and architect ONE lead magnet blueprint — not raw code — that a founder can paste into Lovable.dev to ship a beautiful free tool in minutes.

The micro-tool must:
- Solve exactly ONE painful friction point adjacent to the main product (never duplicate core product functionality).
- Be instantly understandable in under 5 seconds.
- Feel share-worthy on X, Reddit, and Hacker News.
- Include a clear email-gate or signup conversion path toward the main product URL.

OUTPUT FORMAT (strict JSON only, no markdown fences):
{
  "toolName": "...",
  "conceptPitch": "...",
  "lovableMasterPrompt": "...",
  "seoKeywordsAndCaptureStrategy": "..."
}

FIELD RULES:

1. toolName
- Catchy, memorable name for a free micro-tool (2-4 words).
- Examples: "Churn Pulse", "MRR Snapshot", "Hook Lab", "ICP Fit Score"

2. conceptPitch
- The psychological hook (2-4 sentences) explaining why this tool will go viral on X, Reddit, and Hacker News.
- Builder voice, zero corporate jargon.

3. lovableMasterPrompt
- A highly descriptive, advanced prompt engineering string optimized for Lovable.dev.
- Instruct Lovable to build a beautiful, modern layout with:
  - Full state handling for the tool's core operation (inputs, validation, computed outputs, reset).
  - Step-by-step UI/UX directives (hero, tool workspace, results panel, social proof placeholder).
  - Responsive mobile-first design using Tailwind utility classes.
  - A prominent call-to-action block converting users to the main product URL (from product DNA).
  - Subtle "powered by {productName}" footer linking to the product URL.
- Write as a single cohesive prompt the founder can paste directly into Lovable — not code, not HTML.
- Be specific about colors (modern, clean, high-contrast), typography, and interaction flows.

4. seoKeywordsAndCaptureStrategy
- A crisp action plan (bullet-style prose ok) covering:
  - 5-8 high-intent programmatic SEO target phrases to rank for.
  - The exact email gate trigger method (when to show gate, what user gets, CTA copy).
  - One distribution tactic each for X, Reddit, and Hacker News.

Return only the JSON object.`;
}

async function loadRequiredProductDna(
  supabase: SupabaseClient,
  userId: string
): Promise<ProductDNA> {
  console.log("[SIDECAR TRACE] Fetching profile product_dna for user:", userId);

  const { data, error } = await supabase
    .from("profiles")
    .select("product_dna")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error(
      "[SIDECAR TRACE] Profile fetch failed:",
      error.message,
      error.details
    );
    throw new SideCarError(
      `Failed to load workspace profile: ${error.message}`,
      500,
      "profile"
    );
  }

  const dna = safeParseProductDna(data?.product_dna);
  if (!dna) {
    console.error(
      "[SIDECAR TRACE] No validated product_dna in vault for user:",
      userId
    );
    throw new SideCarError(
      "Product DNA not found. Complete onboarding before generating lead magnet blueprints.",
      400,
      "onboarding-required"
    );
  }

  console.log("[SIDECAR TRACE] Product DNA loaded:", {
    productName: dna.productName,
    url: dna.url,
  });

  return dna;
}

async function callOpenAiSideCar(
  dna: ProductDNA,
  previousTools: PreviousSideCarTool[]
): Promise<SideCarBlueprint> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new SideCarError("OPENAI_API_KEY is not configured", 500, "openai");
  }

  const systemPrompt = buildSystemPrompt(previousTools);
  const userPrompt = `${buildProductContextBlock(dna)}

Architect one viral lead magnet blueprint for this product. The Lovable prompt must include a CTA linking to: ${dna.url}`;

  console.log(
    "[SIDECAR TRACE] OpenAI request — model:",
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
        temperature: 0.85,
        max_tokens: 8192,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : "OpenAI request failed";
    console.error("[SIDECAR TRACE] OpenAI network error:", msg);
    throw new SideCarError(
      `Lead magnet blueprint generation failed: ${msg}`,
      502,
      "openai"
    );
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    console.error("[SIDECAR TRACE] OpenAI HTTP error:", response.status, detail);
    throw new SideCarError(
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
    console.error("[SIDECAR TRACE] OpenAI returned empty content");
    throw new SideCarError("OpenAI returned empty content", 502, "openai");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch {
    console.error(
      "[SIDECAR TRACE] OpenAI JSON parse failed — raw:",
      rawContent.slice(0, 300)
    );
    throw new SideCarError(
      "OpenAI returned invalid JSON for lead magnet blueprint",
      502,
      "openai"
    );
  }

  const validated = sideCarResponseSchema.safeParse(parsedJson);
  if (!validated.success) {
    console.error(
      "[SIDECAR TRACE] Response schema validation failed:",
      validated.error.message
    );
    throw new SideCarError(
      "OpenAI response did not match side-car blueprint schema",
      502,
      "openai"
    );
  }

  console.log("[SIDECAR TRACE] Blueprint validated:", {
    toolName: validated.data.toolName,
    promptLength: validated.data.lovableMasterPrompt.length,
  });

  return validated.data;
}

async function persistSideCar(params: {
  supabase: SupabaseClient;
  userId: string;
  blueprint: SideCarBlueprint;
}): Promise<void> {
  console.log(
    "[SIDECAR TRACE] Inserting side_cars row — user:",
    params.userId,
    "| tool:",
    params.blueprint.toolName
  );

  const row = mapSideCarBlueprintToInsertRow(params.userId, params.blueprint);
  const { error } = await params.supabase.from("side_cars").insert(row);

  if (error) {
    console.error(
      "[SIDECAR TRACE] Supabase insert rejected:",
      error.message,
      error.details
    );
    throw new SideCarError(
      `Failed to persist lead magnet blueprint: ${error.message}`,
      500,
      "persist"
    );
  }

  console.log("[SIDECAR TRACE] side_cars insert succeeded");
}

export async function executeSideCarGeneration(
  userId: string,
  supabase: SupabaseClient,
  previousTools: PreviousSideCarTool[] = []
): Promise<SideCarBlueprint> {
  const tools = previousTools ?? [];

  console.log("[SIDECAR TRACE] Checkpoint: load product DNA");
  const dna = await loadRequiredProductDna(supabase, userId);

  console.log(
    "[SIDECAR TRACE] Exclusion memory — prior tools:",
    tools.length
  );
  console.log("[SIDECAR TRACE] Checkpoint: OpenAI blueprint generation");
  const blueprint = await callOpenAiSideCar(dna, tools);

  console.log("[SIDECAR TRACE] Checkpoint: Supabase persist");
  await persistSideCar({ supabase, userId, blueprint });

  return blueprint;
}
