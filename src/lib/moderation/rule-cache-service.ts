import "server-only";

import { supabaseServer } from "@/lib/supabase-server";

import {
  type PlatformConstraints,
  emptyPlatformConstraints,
  platformConstraintsSchema,
} from "@/lib/moderation/types";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const OPENAI_MINI = "gpt-4o-mini";
const MAX_SCRAPE_CHARS = 14_000;

export const PLATFORM_RULE_CHECKER_SYSTEM_PROMPT = `You are a community moderation analyst for social platforms.

Extract posting and formatting constraints for the given platform and location context.
Return strict JSON only matching this schema:
{
  "rules": string[],
  "formatting_rules": string[],
  "ai_smell_flags": string[],
  "link_policy": { "links_in_body": "banned" | "allowed" | "restricted" }
}

Rules:
- "rules": one concise imperative per community rule (max 12 items).
- "formatting_rules": markdown/format limits (length, bullets, flair, etc.).
- "ai_smell_flags": phrases/patterns that trigger AI or spam detection on this platform.
- "link_policy.links_in_body": use "banned" when URLs must not appear in post/comment body.
- Use empty arrays when a category has no items.
- Do not include markdown code fences.`;

type PlatformRulesCacheRow = {
  platform: string;
  normalized_location: string;
  constraints_json: unknown;
  last_updated_at: string;
};

function sanitizeOpenAiJsonResponse(rawResponse: string): string {
  let clean = rawResponse.trim();
  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
  }
  return clean;
}

/**
 * Normalize community/location identifiers for cache lookup.
 * Reddit: strip r/, URL prefixes, and reddit.com paths → subreddit slug only.
 */
export function normalizeTargetLocation(
  platform: string,
  rawLocation: string
): string {
  const p = platform.trim().toLowerCase();
  let loc = rawLocation.trim().toLowerCase();

  if (p === "reddit") {
    loc = loc
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/^reddit\.com\//, "")
      .replace(/^r\//, "");
    const segment = loc.split("/").filter(Boolean)[0] ?? loc;
    return segment.replace(/[^a-z0-9_]/g, "") || "unknown";
  }

  return loc.replace(/\s+/g, " ").trim() || "global";
}

function buildGuidelinesUrl(platform: string, normalizedLocation: string): string | null {
  const p = platform.trim().toLowerCase();

  if (p === "reddit") {
    if (
      !normalizedLocation ||
      normalizedLocation === "unknown" ||
      normalizedLocation.startsWith("global")
    ) {
      return "https://www.reddit.com/r/startups/about/rules";
    }
    return `https://www.reddit.com/r/${normalizedLocation}/about/rules`;
  }

  if (p === "hackernews") {
    return "https://news.ycombinator.com/newsguidelines.html";
  }

  if (p === "x" || p === "twitter") {
    return "https://help.x.com/en/rules-and-policies/x-rules";
  }

  if (p === "indiehackers") {
    return "https://www.indiehackers.com/";
  }

  if (p === "producthunt") {
    return "https://www.producthunt.com/";
  }

  return null;
}

async function fetchGuidelinesText(
  platform: string,
  normalizedLocation: string
): Promise<string> {
  const url = buildGuidelinesUrl(platform, normalizedLocation);
  if (!url) {
    throw new Error(
      `No guidelines URL configured for platform=${platform} location=${normalizedLocation}`
    );
  }

  const jinaKey = process.env.JINA_API_KEY;
  if (!jinaKey) {
    throw new Error("JINA_API_KEY is not configured");
  }

  const response = await fetch(`https://r.jina.ai/${url}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${jinaKey}`,
      Accept: "text/plain, text/markdown, application/json",
      "X-Return-Format": "markdown",
    },
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Jina returned ${response.status}: ${detail}`);
  }

  const text = await response.text();
  if (!text.trim()) {
    throw new Error("Jina returned empty guidelines text");
  }

  return text.length > MAX_SCRAPE_CHARS
    ? `${text.slice(0, MAX_SCRAPE_CHARS)}\n\n[Truncated…]`
    : text;
}

async function generateConstraintsWithLlm(params: {
  platform: string;
  normalizedLocation: string;
  guidelinesText: string;
  userStats?: unknown;
}): Promise<PlatformConstraints> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const statsHint =
    params.userStats != null
      ? `\nOptional founder context: ${JSON.stringify(params.userStats).slice(0, 500)}`
      : "";

  const userPrompt = `Platform: ${params.platform}
Normalized location: ${params.normalizedLocation}
${statsHint}

Guidelines source text:
---
${params.guidelinesText.slice(0, 12000)}
---

Extract constraints per PLATFORM_RULE_CHECKER_SYSTEM_PROMPT schema.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MINI,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PLATFORM_RULE_CHECKER_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new Error(`OpenAI returned ${response.status}: ${detail}`);
  }

  const completion = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = completion.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error("OpenAI returned empty constraints payload");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(sanitizeOpenAiJsonResponse(raw));
  } catch {
    throw new Error("OpenAI returned invalid constraints JSON");
  }

  const validated = platformConstraintsSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `OpenAI constraints schema mismatch: ${validated.error.message}`
    );
  }

  return validated.data;
}

function isCacheFresh(lastUpdatedAt: string): boolean {
  const ts = new Date(lastUpdatedAt).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < CACHE_TTL_MS;
}

function parseConstraintsJson(raw: unknown): PlatformConstraints {
  const parsed = platformConstraintsSchema.safeParse(raw);
  if (parsed.success) {
    return parsed.data;
  }
  return emptyPlatformConstraints();
}

/**
 * Fetch cached platform constraints with 30-day TTL.
 * On hit: returns parsed constraints without LLM.
 * On miss/expiry: scrapes guidelines (when URL known), calls LLM, upserts cache.
 */
export async function getPlatformConstraints(
  platform: string,
  rawLocation: string,
  userStats?: unknown
): Promise<PlatformConstraints> {
  const normalizedLocation = normalizeTargetLocation(platform, rawLocation);
  const platformKey = platform.trim().toLowerCase();

  const { data, error } = await supabaseServer
    .from("platform_rules_cache")
    .select("platform, normalized_location, constraints_json, last_updated_at")
    .eq("platform", platformKey)
    .eq("normalized_location", normalizedLocation)
    .maybeSingle();

  if (error) {
    throw new Error(`platform_rules_cache lookup failed: ${error.message}`);
  }

  const row = data as PlatformRulesCacheRow | null;

  if (row && isCacheFresh(row.last_updated_at)) {
    return parseConstraintsJson(row.constraints_json);
  }

  const guidelinesText = await fetchGuidelinesText(platformKey, normalizedLocation);
  const constraints = await generateConstraintsWithLlm({
    platform: platformKey,
    normalizedLocation,
    guidelinesText,
    userStats,
  });

  const now = new Date().toISOString();

  const { error: upsertError } = await supabaseServer
    .from("platform_rules_cache")
    .upsert(
      {
        platform: platformKey,
        normalized_location: normalizedLocation,
        constraints_json: constraints,
        last_updated_at: now,
      },
      { onConflict: "platform,normalized_location" }
    );

  if (upsertError) {
    throw new Error(`platform_rules_cache upsert failed: ${upsertError.message}`);
  }

  return constraints;
}
