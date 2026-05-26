import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type {
  CoreFrameworkRow,
  MasterBlueprintGeneration,
  UserBlueprint,
} from "@/lib/onboard/blueprint-types";
import { USER_BLUEPRINTS_TABLE } from "@/lib/onboard/blueprint-types";
export {
  buildMasterBlueprintPromptBlock,
  formatFrameworkSlugLabel,
  resolveChosenFrameworkDetails,
} from "@/lib/onboard/blueprint-utils";
import type { ProductDNA } from "@/lib/signalflow-types";
import { supabaseServer } from "@/lib/supabase-server";

const OPENAI_MODEL = "gpt-4o";
const FRAMEWORKS_TO_CHOOSE = 2;

const blueprintResponseSchema = z.object({
  chosen_frameworks: z.array(z.string().min(1)).length(FRAMEWORKS_TO_CHOOSE),
  macro_rationale: z.string().min(80),
  target_audience_summary: z.string().min(10),
});

export class BlueprintEngineError extends Error {
  constructor(
    message: string,
    public readonly step?: string
  ) {
    super(message);
    this.name = "BlueprintEngineError";
  }
}

function frameworkSlug(row: Record<string, unknown>): string | null {
  if (typeof row.slug === "string" && row.slug.trim()) {
    return row.slug.trim();
  }
  if (typeof row.id === "string" && row.id.trim()) {
    return row.id.trim();
  }
  return null;
}

function normalizeFrameworkRow(row: Record<string, unknown>): CoreFrameworkRow | null {
  const slug = frameworkSlug(row);
  if (!slug) return null;

  const name =
    typeof row.name === "string"
      ? row.name
      : typeof row.title === "string"
        ? row.title
        : slug;

  const title = typeof row.title === "string" ? row.title : name;
  const description =
    typeof row.description === "string" ? row.description : "";

  const primary_channels = Array.isArray(row.primary_channels)
    ? row.primary_channels.filter((c): c is string => typeof c === "string")
    : [];

  return { slug, name, title, description, primary_channels };
}

export async function fetchCoreFrameworkCatalog(
  supabase: SupabaseClient = supabaseServer
): Promise<CoreFrameworkRow[]> {
  const { data, error } = await supabase.from("core_frameworks").select("*");

  if (error) {
    throw new BlueprintEngineError(
      `Failed to load core frameworks: ${error.message}`,
      "frameworks"
    );
  }

  return (data ?? [])
    .map((row) => normalizeFrameworkRow(row as Record<string, unknown>))
    .filter((row): row is CoreFrameworkRow => row !== null);
}

function buildDnaContextBlock(dna: ProductDNA): string {
  const painPoints =
    dna.painPoints.length > 0
      ? dna.painPoints.map((p) => `- ${p}`).join("\n")
      : "- (none listed)";

  return `PRODUCT DNA:
- productName: ${dna.productName}
- url: ${dna.url}
- oneLiner: ${dna.oneLiner}
- audience: ${dna.audience}
- painPoints:
${painPoints}
- keywords: ${dna.keywords.length > 0 ? dna.keywords.join(", ") : "(none)"}
- targetPlatforms: ${dna.targetPlatforms.join(", ")}`;
}

function buildFrameworkCatalogBlock(frameworks: CoreFrameworkRow[]): string {
  if (frameworks.length === 0) {
    return "(no frameworks in catalog — return slug placeholders reddit-intent-mining and build-in-public-x)";
  }

  return frameworks
    .map(
      (f) =>
        `- slug: "${f.slug}"
  name: ${f.name}
  title: ${f.title}
  description: ${f.description}
  primary_channels: ${f.primary_channels.join(", ") || "general"}`
    )
    .join("\n");
}

function sanitizeOpenAiJsonResponse(raw: string): string {
  let clean = raw.trim();
  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
  }
  return clean;
}

export async function generateMasterBlueprint(params: {
  dna: ProductDNA;
  frameworks: CoreFrameworkRow[];
}): Promise<MasterBlueprintGeneration> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new BlueprintEngineError(
      "OPENAI_API_KEY is not configured",
      "openai"
    );
  }

  const validSlugs = new Set(params.frameworks.map((f) => f.slug));

  const systemPrompt = `You are a fractional CMO architecting a 90-day Master Strategy Blueprint for an indie SaaS founder.

Select exactly ${FRAMEWORKS_TO_CHOOSE} framework slugs from the catalog that best fit the product DNA. Prefer frameworks whose primary_channels overlap the product's targetPlatforms.

Output strict JSON only (no markdown fences):
{
  "chosen_frameworks": ["slug-one", "slug-two"],
  "macro_rationale": "Two paragraphs explaining WHY these two pillars were chosen, how they compound, and what the founder should ignore for now.",
  "target_audience_summary": "One crisp paragraph summarizing the ICP this roadmap serves."
}

Rules:
- chosen_frameworks must contain exactly ${FRAMEWORKS_TO_CHOOSE} slugs copied verbatim from the catalog.
- macro_rationale must be exactly two paragraphs separated by a blank line.
- Be specific to the product — no generic marketing fluff.`;

  const userPrompt = `${buildDnaContextBlock(params.dna)}

FRAMEWORK CATALOG (choose exactly ${FRAMEWORKS_TO_CHOOSE} slugs):
${buildFrameworkCatalogBlock(params.frameworks)}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.35,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new BlueprintEngineError(
      `OpenAI returned ${response.status}: ${detail}`,
      "openai"
    );
  }

  const completion = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const rawContent = completion.choices?.[0]?.message?.content?.trim();
  if (!rawContent) {
    throw new BlueprintEngineError("OpenAI returned empty blueprint", "openai");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(sanitizeOpenAiJsonResponse(rawContent));
  } catch {
    throw new BlueprintEngineError(
      "OpenAI returned invalid blueprint JSON",
      "openai"
    );
  }

  const validated = blueprintResponseSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new BlueprintEngineError(
      `Blueprint schema validation failed: ${validated.error.message}`,
      "validate"
    );
  }

  const slugs = validated.data.chosen_frameworks.map((s) => s.trim());
  if (validSlugs.size > 0) {
    for (const slug of slugs) {
      if (!validSlugs.has(slug)) {
        throw new BlueprintEngineError(
          `Invalid framework slug from model: ${slug}`,
          "validate"
        );
      }
    }
  }

  return {
    chosen_frameworks: slugs,
    macro_rationale: validated.data.macro_rationale.trim(),
    target_audience_summary: validated.data.target_audience_summary.trim(),
  };
}

export async function persistUserBlueprint(
  supabase: SupabaseClient,
  userId: string,
  blueprint: MasterBlueprintGeneration
): Promise<UserBlueprint> {
  const now = new Date().toISOString();
  const row = {
    user_id: userId,
    chosen_frameworks: blueprint.chosen_frameworks,
    macro_rationale: blueprint.macro_rationale,
    target_audience_summary: blueprint.target_audience_summary,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from(USER_BLUEPRINTS_TABLE)
    .upsert(row, { onConflict: "user_id" })
    .select(
      "id, user_id, chosen_frameworks, macro_rationale, target_audience_summary, created_at, updated_at"
    )
    .single();

  if (error) {
    throw new BlueprintEngineError(
      `Failed to save user blueprint: ${error.message}`,
      "persist"
    );
  }

  if (!data) {
    throw new BlueprintEngineError("Blueprint upsert returned no row", "persist");
  }

  return data as UserBlueprint;
}

/** Non-blocking onboarding hook: generate + save master blueprint. */
export async function generateAndPersistUserBlueprint(params: {
  supabase: SupabaseClient;
  userId: string;
  dna: ProductDNA;
}): Promise<UserBlueprint | null> {
  const frameworks = await fetchCoreFrameworkCatalog(params.supabase);
  const generated = await generateMasterBlueprint({
    dna: params.dna,
    frameworks,
  });
  return persistUserBlueprint(params.supabase, params.userId, generated);
}

export async function fetchUserBlueprint(
  userId: string,
  supabase: SupabaseClient = supabaseServer
): Promise<UserBlueprint | null> {
  const { data, error } = await supabase
    .from(USER_BLUEPRINTS_TABLE)
    .select(
      "id, user_id, chosen_frameworks, macro_rationale, target_audience_summary, created_at, updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load user blueprint: ${error.message}`);
  }

  return (data as UserBlueprint | null) ?? null;
}
