import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { DISCOVERY_LEADS_TABLE } from "@/lib/discovery/constants";
import { discoveryUrlExistsForUser } from "@/lib/discovery/lead-bank";
import {
  type IngestAlertPayload,
  upsertDiscoveryLeadFromPlugMatch,
} from "@/lib/leads/ingest-alert-pipeline";
import {
  passesStrictRelevanceFilter,
  scoreIntentWithOpenAI,
} from "@/lib/mining/hunt-pipeline";
import { fetchSerperQuery, type SerperCandidate } from "@/lib/miner/search-pipeline";
import { safeParseProductDna } from "@/lib/product-dna-schema";
import {
  getIntentTier,
  parsePlatform,
  type IntentTier,
  type Platform,
  type ProductDNA,
} from "@/lib/signalflow-types";

const OPENAI_MODEL = "gpt-4o";
const PLUG_PROMOTE_MIN_SCORE = 50;
const MAX_SERPER_QUERIES_PER_SCAN = 3;
const MAX_KEYWORD_CANDIDATES_TO_SCORE = 8;

export const PLUG_ALERTS_TABLE = "plug_alerts" as const;

/** Columns selected from public.plug_alerts — must match PostgreSQL exactly. */
export const PLUG_ALERTS_SELECT =
  "id, user_id, lead_id, url, source_url, content, platform, author, subreddit, post_snippet, comments, velocity_score, velocity_tier, tier, created_at" as const;

/** 1:1 with public.plug_alerts row (platform parsed for UI badges). */
export type PlugAlert = {
  id: string;
  user_id: string;
  lead_id: string | null;
  url: string;
  source_url: string;
  content: string;
  platform: Platform;
  author: string;
  subreddit: string | null;
  post_snippet: string;
  comments: number;
  velocity_score: number;
  velocity_tier: IntentTier;
  tier: IntentTier;
  created_at: string;
};

export type PlugAlertDbRow = {
  id: string;
  user_id: string;
  lead_id: string | null;
  url: string;
  source_url: string;
  content: string;
  platform: string;
  author: string;
  subreddit: string | null;
  post_snippet: string;
  comments: number;
  velocity_score: number | string;
  velocity_tier: string;
  tier: string;
  created_at: string;
};

export type PlugAlertsResult = {
  alerts: PlugAlert[];
  scannedAt: string;
  productName: string;
  productUrl: string;
};

export class PlugAlertsError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly step?: string
  ) {
    super(message);
    this.name = "PlugAlertsError";
  }
}

const plugTextResponseSchema = z.object({
  plugText: z.string().min(1),
});

type DiscoveryLeadAlertRow = {
  id: string;
  platform: string | null;
  source_url: string;
  content: string | null;
  intent_score: number | null;
  created_at: string;
};

function parseIntentTier(raw: string | null | undefined): IntentTier {
  if (raw === "HOT" || raw === "WARM" || raw === "COLD") {
    return raw;
  }
  return "COLD";
}

function parseVelocityScore(raw: number | string | null | undefined): number {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function snippetFromContent(content: string | null, max = 320): string {
  const text = (content ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "Thread snippet unavailable";
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

function extractSubreddit(sourceUrl: string): string | null {
  try {
    const match = sourceUrl.match(/reddit\.com\/r\/([^/]+)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function authorFromPlatform(platform: Platform): string {
  switch (platform) {
    case "reddit":
      return "u/prospect";
    case "x":
      return "@prospect";
    case "hackernews":
      return "hn_user";
    case "indiehackers":
      return "ih_member";
    case "producthunt":
      return "ph_maker";
    default:
      return "Community";
  }
}

function estimateComments(intentScore: number): number {
  const factor = Math.min(100, Math.max(0, intentScore)) / 100;
  return Math.round(3 + factor * 50);
}

/** UI-only label derived from tier columns (not stored in DB). */
export function tierStatusLabel(
  tier: IntentTier,
  velocity_score: number
): string {
  switch (tier) {
    case "HOT":
      return "Peak Velocity Reached — Deploy Link";
    case "WARM":
      return velocity_score >= 55
        ? "Momentum Surging — Link Window Opening"
        : "Click to open workspace and forge custom stealth reply";
    case "COLD":
      return "Click to open workspace and forge custom stealth reply";
  }
}

/** HOT plug draft lives in `content` after scan enrichment. */
export function hotPlugDraftFromAlert(alert: PlugAlert): string | null {
  const tier = alert.velocity_tier ?? alert.tier;
  if (tier !== "HOT") return null;
  const draft = alert.content.trim();
  const snippet = alert.post_snippet.trim();
  if (!draft || draft === snippet) return null;
  return draft;
}

function mapDbRowToPlugAlert(row: PlugAlertDbRow): PlugAlert {
  const velocity_score = parseVelocityScore(row.velocity_score);
  const velocity_tier = parseIntentTier(row.velocity_tier);
  const tier = parseIntentTier(row.tier);
  const sourceUrl = (row.source_url ?? "").trim();
  if (!sourceUrl) {
    throw new Error("plug_alerts row missing source_url");
  }
  const url = (row.url ?? "").trim() || sourceUrl;

  return {
    id: row.id,
    user_id: row.user_id,
    lead_id: row.lead_id,
    url,
    source_url: sourceUrl,
    content: row.content ?? "",
    platform: parsePlatform(row.platform),
    author: row.author ?? "",
    subreddit: row.subreddit,
    post_snippet: row.post_snippet,
    comments: row.comments ?? 0,
    velocity_score,
    velocity_tier,
    tier,
    created_at: row.created_at,
  };
}

function mapDiscoveryLeadToPlugAlert(
  lead: DiscoveryLeadAlertRow,
  userId: string
): PlugAlert | null {
  const sourceUrl = lead.source_url?.trim();
  if (!sourceUrl) return null;

  const platform = parsePlatform(lead.platform);
  const velocity_score = parseVelocityScore(lead.intent_score);
  const velocity_tier = getIntentTier(velocity_score);
  const tier = velocity_tier;
  const post_snippet = snippetFromContent(lead.content);
  const fullContent = (lead.content ?? "").trim() || post_snippet;

  return {
    id: lead.id,
    user_id: userId,
    lead_id: lead.id,
    url: sourceUrl,
    source_url: sourceUrl,
    content: fullContent,
    platform,
    author: authorFromPlatform(platform),
    subreddit: extractSubreddit(sourceUrl),
    post_snippet,
    comments: estimateComments(velocity_score),
    velocity_score,
    velocity_tier,
    tier,
    created_at: lead.created_at,
  };
}

function alertToInsertRow(alert: PlugAlert, userId: string) {
  const source_url = alert.source_url.trim();
  const url = alert.url.trim() || source_url;

  return {
    user_id: userId,
    lead_id: alert.lead_id,
    url,
    source_url,
    content: alert.content ?? "",
    platform: alert.platform,
    author: alert.author ?? "",
    subreddit: alert.subreddit,
    post_snippet: alert.post_snippet,
    comments: alert.comments ?? 0,
    velocity_score: alert.velocity_score,
    velocity_tier: alert.velocity_tier,
    tier: alert.tier,
  };
}

async function fetchAlertsFromDiscoveryLeads(
  supabase: SupabaseClient,
  userId: string
): Promise<PlugAlert[]> {
  const { data, error } = await supabase
    .from(DISCOVERY_LEADS_TABLE)
    .select("id, platform, source_url, content, intent_score, created_at")
    .eq("user_id", userId)
    .in("status", ["active", "drafted", "replied"])
    .not("source_url", "is", null)
    .order("intent_score", { ascending: false })
    .limit(30);

  if (error) {
    throw new PlugAlertsError(
      `Failed to load discovery leads for plug radar: ${error.message}`,
      500,
      "discovery"
    );
  }

  const alerts = (data ?? [])
    .map((row) =>
      mapDiscoveryLeadToPlugAlert(row as DiscoveryLeadAlertRow, userId)
    )
    .filter((alert): alert is PlugAlert => alert !== null);

  alerts.sort((a, b) => b.velocity_score - a.velocity_score);
  return alerts;
}

async function persistPlugAlerts(
  supabase: SupabaseClient,
  userId: string,
  alerts: PlugAlert[]
): Promise<void> {
  const { error: deleteError } = await supabase
    .from(PLUG_ALERTS_TABLE)
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    throw new PlugAlertsError(
      `Failed to reset plug alerts: ${deleteError.message}`,
      500,
      "persist"
    );
  }

  if (alerts.length === 0) return;

  const rows = alerts.map((alert) => alertToInsertRow(alert, userId));

  const { error: insertError } = await supabase
    .from(PLUG_ALERTS_TABLE)
    .insert(rows);

  if (insertError) {
    throw new PlugAlertsError(
      `Failed to persist plug alerts: ${insertError.message}`,
      500,
      "persist"
    );
  }
}

function buildAntiAiDetectionBlock(): string {
  return `CRITICAL ANTI-AI DETECTION RULES (mandatory):
- NEVER use em-dashes (—) or en-dashes (–). Only commas, periods, or a basic hyphen (-).
- BANNED WORDS/PHRASES: delve, leverage, maze, goldmine, unlock, supercharge, crucial, pain point, hope that helps, happy to help, game-changer, in conclusion, right?, remember.
- Write lowercase-heavy, fragmented, casual developer voice. Use shortcuts like idk, tbh, imo, wdym when natural.
- No bullet points, no bold, no corporate greetings or sign-offs.
- Add a slight rough edge (missing apostrophe, trailing comma) so it reads human-posted.
- No rhetorical opener/closer questions.`;
}

async function loadRequiredProductDna(
  supabase: SupabaseClient,
  userId: string
): Promise<ProductDNA> {
  const { data, error } = await supabase
    .from("profiles")
    .select("product_dna")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new PlugAlertsError(
      `Failed to load workspace profile: ${error.message}`,
      500,
      "profile"
    );
  }

  const dna = safeParseProductDna(data?.product_dna);
  if (!dna) {
    throw new PlugAlertsError(
      "Product DNA not found. Complete onboarding before running plug radar scans.",
      400,
      "onboarding-required"
    );
  }

  return dna;
}

async function generatePlugText(params: {
  dna: ProductDNA;
  post_snippet: string;
  platform: Platform;
}): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new PlugAlertsError("OPENAI_API_KEY is not configured", 500, "openai");
  }

  const systemPrompt = `You write high-conversion follow-up replies for social threads at peak velocity.
The user will paste your text as a casual comment to naturally invite readers to check out their product URL.

${buildAntiAiDetectionBlock()}

Return strict JSON only: { "plugText": "..." }
Keep plugText under 280 characters. Include the product URL naturally once.`;

  const userPrompt = `Product: ${params.dna.productName}
URL: ${params.dna.url}
One-liner: ${params.dna.oneLiner}
Platform: ${params.platform}

Original thread snippet:
${params.post_snippet}

Write a casual follow-up plug comment for peak-momentum deployment.`;

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
        max_tokens: 400,
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
    throw new PlugAlertsError(`Plug text generation failed: ${msg}`, 502, "openai");
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new PlugAlertsError(
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
    throw new PlugAlertsError("OpenAI returned empty plug text", 502, "openai");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch {
    throw new PlugAlertsError("OpenAI returned invalid plug text JSON", 502, "openai");
  }

  const validated = plugTextResponseSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new PlugAlertsError(
      "OpenAI plug text did not match expected schema",
      502,
      "openai"
    );
  }

  return validated.data.plugText.trim();
}

async function enrichHotAlerts(
  alerts: PlugAlert[],
  dna: ProductDNA
): Promise<PlugAlert[]> {
  const hotAlerts = alerts.filter(
    (alert) => alert.velocity_tier === "HOT" || alert.tier === "HOT"
  );
  if (hotAlerts.length === 0) return alerts;

  const plugTexts = await Promise.all(
    hotAlerts.map((alert) =>
      generatePlugText({
        dna,
        post_snippet: alert.post_snippet,
        platform: alert.platform,
      })
    )
  );

  const plugById = new Map(
    hotAlerts.map((alert, index) => [alert.id, plugTexts[index] ?? ""])
  );

  return alerts.map((alert) => {
    const plug = plugById.get(alert.id);
    if (!plug || (alert.velocity_tier !== "HOT" && alert.tier !== "HOT")) {
      return alert;
    }
    return { ...alert, content: plug };
  });
}

function plugAlertToIngestPayload(alert: PlugAlert): IngestAlertPayload {
  const tier = alert.velocity_tier ?? alert.tier;
  const plugDraft = hotPlugDraftFromAlert(alert);

  return {
    content: alert.post_snippet.trim() || alert.content.trim(),
    platform: alert.platform,
    source_url: alert.source_url,
    author: alert.author.trim() || authorFromPlatform(alert.platform),
    intent_score: alert.velocity_score,
    tier,
    plugText: plugDraft,
  };
}

async function autoPromoteQualifiedAlertsToDiscoveryStream(
  supabase: SupabaseClient,
  userId: string,
  alerts: PlugAlert[]
): Promise<number> {
  let promoted = 0;

  for (const alert of alerts) {
    if (alert.velocity_score < PLUG_PROMOTE_MIN_SCORE) continue;

    try {
      await upsertDiscoveryLeadFromPlugMatch(
        supabase,
        userId,
        plugAlertToIngestPayload(alert)
      );
      promoted += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "promote failed";
      console.warn(
        `[plug-alerts] Auto-promote skipped for ${alert.source_url}:`,
        message
      );
    }
  }

  return promoted;
}

async function discoverAndPromoteKeywordMatches(
  supabase: SupabaseClient,
  userId: string,
  dna: ProductDNA
): Promise<number> {
  const platformSet = new Set(dna.targetPlatforms);
  const queries = dna.activeSerperQueries.slice(0, MAX_SERPER_QUERIES_PER_SCAN);
  const seenUrls = new Set<string>();
  const candidates: SerperCandidate[] = [];

  for (const query of queries) {
    try {
      const results = await fetchSerperQuery(query, {
        timeRange: "week",
        filterStaleYears: true,
      });

      for (const candidate of results) {
        if (!platformSet.has(candidate.platform)) continue;
        if (!passesStrictRelevanceFilter(candidate, dna)) continue;

        const normalized = candidate.link.split("#")[0]!.trim();
        if (seenUrls.has(normalized)) continue;
        seenUrls.add(normalized);
        candidates.push({ ...candidate, link: normalized });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Serper failed";
      console.warn(`[plug-alerts] Serper query skipped (${query}):`, message);
    }
  }

  let promoted = 0;

  for (const candidate of candidates.slice(0, MAX_KEYWORD_CANDIDATES_TO_SCORE)) {
    try {
      const exists = await discoveryUrlExistsForUser(
        supabase,
        userId,
        candidate.link
      );
      if (exists) continue;

      const postText = [candidate.title, candidate.snippet]
        .filter(Boolean)
        .join("\n\n");

      let intentScore: number;
      try {
        intentScore = await scoreIntentWithOpenAI({
          postText,
          painPoints: dna.painPoints,
          personaContext: "",
          productName: dna.productName,
        });
      } catch (scoreErr) {
        const message =
          scoreErr instanceof Error ? scoreErr.message : "scoring failed";
        console.warn(
          `[plug-alerts] Intent scoring skipped for ${candidate.link}:`,
          message
        );
        continue;
      }

      if (intentScore < PLUG_PROMOTE_MIN_SCORE) continue;

      const tier = getIntentTier(intentScore);

      await upsertDiscoveryLeadFromPlugMatch(supabase, userId, {
        content: postText,
        platform: candidate.platform,
        source_url: candidate.link,
        author: authorFromPlatform(candidate.platform),
        intent_score: intentScore,
        tier,
        plugText: null,
      });

      promoted += 1;
    } catch (promoteErr) {
      const message =
        promoteErr instanceof Error ? promoteErr.message : "promote failed";
      console.warn(
        `[plug-alerts] Keyword match promote skipped for ${candidate.link}:`,
        message
      );
    }
  }

  return promoted;
}

function latestScannedAt(alerts: PlugAlert[]): string {
  if (alerts.length === 0) return new Date(0).toISOString();
  return alerts.reduce((latest, row) =>
    row.created_at > latest ? row.created_at : latest
  , alerts[0].created_at);
}

export async function fetchUserPlugAlerts(
  userId: string,
  supabase: SupabaseClient
): Promise<PlugAlertsResult> {
  const dna = await loadRequiredProductDna(supabase, userId);

  const { data, error } = await supabase
    .from(PLUG_ALERTS_TABLE)
    .select(PLUG_ALERTS_SELECT)
    .eq("user_id", userId)
    .order("velocity_score", { ascending: false });

  if (error) {
    throw new PlugAlertsError(
      `Failed to load plug alerts: ${error.message}`,
      500,
      "fetch"
    );
  }

  const rows = (data ?? []) as PlugAlertDbRow[];
  const alerts = rows
    .map((row) => {
      try {
        return mapDbRowToPlugAlert(row);
      } catch (mapError) {
        console.warn(
          "[plug-alerts] Skipping row with invalid shape:",
          row.id,
          mapError
        );
        return null;
      }
    })
    .filter((alert): alert is PlugAlert => alert !== null);

  return {
    alerts,
    scannedAt: latestScannedAt(alerts),
    productName: dna.productName,
    productUrl: dna.url,
  };
}

export async function executePlugAlertsScan(
  userId: string,
  supabase: SupabaseClient
): Promise<PlugAlertsResult> {
  const dna = await loadRequiredProductDna(supabase, userId);

  const keywordPromoted = await discoverAndPromoteKeywordMatches(
    supabase,
    userId,
    dna
  );
  if (keywordPromoted > 0) {
    console.log(
      `[plug-alerts] Promoted ${keywordPromoted} keyword match(es) to discovery_leads`
    );
  }

  const alerts = await fetchAlertsFromDiscoveryLeads(supabase, userId);
  const enriched = await enrichHotAlerts(alerts, dna);

  const streamPromoted = await autoPromoteQualifiedAlertsToDiscoveryStream(
    supabase,
    userId,
    enriched
  );
  if (streamPromoted > 0) {
    console.log(
      `[plug-alerts] Synced ${streamPromoted} qualified alert(s) into discovery_leads`
    );
  }

  await persistPlugAlerts(supabase, userId, enriched);

  return {
    alerts: enriched,
    scannedAt: latestScannedAt(enriched),
    productName: dna.productName,
    productUrl: dna.url,
  };
}
