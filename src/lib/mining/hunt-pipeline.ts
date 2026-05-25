import { z } from "zod";

import {
  countQueuedDiscoveryLeads,
  discoveryUrlExistsForUser,
  executeDailyReleaseProtocol,
  getLeadBankStats,
  queueDiscoveryLead,
  resolveDailyDropQuota,
} from "@/lib/discovery/lead-bank";
import { resolveAuthenticatedUserId } from "@/lib/onboard-pipeline";
import type { Platform, ProductDNA } from "@/lib/signalflow-types";
import { supabaseServer } from "@/lib/supabase-server";

import {
  fetchAllSerperCandidates,
  snippetContainsStaleYear,
  type SerperCandidate,
  type SerperFetchOptions,
} from "@/lib/miner/search-pipeline";

export const DAILY_LEAD_GOAL = 30;
export const BATCH_SEGMENT_TARGET = 15;
export const MAX_RETRIEVAL_PASSES = 3;
export const HISTORICAL_MIN_INTENT_SCORE = 70;

const STALE_LOCK_MS = 5 * 60 * 1000;
const OPENAI_SCORING_MODEL = "gpt-4o-mini";
const OPENAI_EVOLUTION_MODEL = "gpt-4o";

const productDnaSchema = z.object({
  productName: z.string(),
  url: z.string(),
  oneLiner: z.string(),
  audience: z.union([z.string(), z.array(z.string())]).optional(),
  painPoints: z.array(z.string()).default([]),
  targetPlatforms: z.array(z.string()).default([]),
  activeSerperQueries: z.array(z.string()).default([]),
  competitors: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
});

const evolvedQueriesSchema = z.object({
  queries: z.array(z.string().min(1)).min(1).max(5),
});

export class HuntError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly step?: string
  ) {
    super(message);
    this.name = "HuntError";
  }
}

export type HuntResult = {
  ok: true;
  /** Leads drip-fed to active stream this run (legacy field name). */
  inserted: number;
  queued: number;
  released: number;
  scanned: number;
  skippedOverlap: number;
  skippedDuplicate: number;
  skippedErrors: number;
  skippedLowIntent: number;
  skippedStrictFilter: number;
  stoppedEarly: boolean;
  passesExecuted: number;
  dailyLeadGoal: number;
  batchTarget: number;
  bank: {
    activeCount: number;
    queuedCount: number;
    dailyLimit: number;
  };
};

export type { SerperCandidate } from "@/lib/miner/search-pipeline";

type ProfileRow = {
  id: string;
  is_mining: boolean;
  mining_started_at: string | null;
  product_dna: unknown;
  persona_context: string | null;
};

type PassMetrics = {
  scanned: number;
  skippedOverlap: number;
  skippedDuplicate: number;
  skippedErrors: number;
  skippedLowIntent: number;
  skippedStrictFilter: number;
  inserted: number;
};

const minerLog = {
  info: (msg: string) =>
    console.log(`\x1b[36m[ADAPTIVE MINER]\x1b[0m ${msg}`),
  success: (msg: string) =>
    console.log(`\x1b[32m[ADAPTIVE MINER]\x1b[0m ${msg}`),
  warn: (msg: string) =>
    console.log(`\x1b[33m[ADAPTIVE MINER]\x1b[0m ${msg}`),
  error: (msg: string) =>
    console.log(`\x1b[31m[ADAPTIVE MINER]\x1b[0m ${msg}`),
  pass: (pass: number, msg: string) =>
    console.log(`\x1b[35m[ADAPTIVE MINER]\x1b[0m Pass ${pass}: ${msg}`),
};

export { resolveAuthenticatedUserId };

export function intentTierFromScore(score: number): "HOT" | "WARM" | "COLD" {
  if (score >= 70) return "HOT";
  if (score >= 40) return "WARM";
  return "COLD";
}

function parseProductDna(raw: unknown): ProductDNA {
  const parsed = productDnaSchema.safeParse(raw);
  if (!parsed.success) {
    throw new HuntError("Invalid or missing product_dna on profile", 400, "config");
  }
  const d = parsed.data;
  const audience = Array.isArray(d.audience)
    ? d.audience.join(", ")
    : (d.audience ?? "");

  return {
    productName: d.productName,
    url: d.url,
    oneLiner: d.oneLiner,
    audience,
    painPoints: d.painPoints,
    targetPlatforms: normalizePlatforms(d.targetPlatforms),
    activeSerperQueries: d.activeSerperQueries.slice(0, 5),
    competitors: d.competitors,
    keywords: d.keywords,
  };
}

function normalizePlatforms(raw: string[]): Platform[] {
  const map: Record<string, Platform> = {
    reddit: "reddit",
    x: "x",
    twitter: "x",
    hackernews: "hackernews",
    hn: "hackernews",
    indiehackers: "indiehackers",
    ih: "indiehackers",
    "indie hackers": "indiehackers",
    producthunt: "producthunt",
    ph: "producthunt",
    "product hunt": "producthunt",
  };
  const out = new Set<Platform>();
  for (const item of raw) {
    const p = map[item.toLowerCase().trim()];
    if (p) out.add(p);
  }
  return out.size > 0
    ? [...out]
    : ["reddit", "hackernews", "indiehackers", "producthunt"];
}

function normalizeUrl(url: string): string {
  return url.split("#")[0]!.trim();
}

function buildStrictAnchors(dna: ProductDNA): string[] {
  return [
    ...dna.keywords,
    ...dna.painPoints,
    ...dna.competitors,
    dna.productName,
    dna.audience,
  ]
    .flatMap((value) => value.toLowerCase().split(/\s+/))
    .filter((term) => term.length > 3);
}

export function passesStrictRelevanceFilter(
  candidate: SerperCandidate,
  dna: ProductDNA
): boolean {
  const text = `${candidate.title} ${candidate.snippet}`.toLowerCase();
  const anchors = buildStrictAnchors(dna);

  const anchorHit = anchors.some((term) => text.includes(term));
  const platformHit = dna.targetPlatforms.includes(candidate.platform);

  return anchorHit && platformHit;
}

function dedupeCandidates(
  candidates: SerperCandidate[],
  seenUrls: Set<string>
): { unique: SerperCandidate[]; skippedDuplicate: number } {
  const unique: SerperCandidate[] = [];
  let skippedDuplicate = 0;

  for (const candidate of candidates) {
    const normalized = normalizeUrl(candidate.link);
    if (seenUrls.has(normalized)) {
      skippedDuplicate++;
      continue;
    }
    seenUrls.add(normalized);
    unique.push({ ...candidate, link: normalized });
  }

  return { unique, skippedDuplicate };
}

/** Step A: load product_dna + persona_context, enforce lock, then set is_mining. */
export async function readConfigAndAcquireLock(
  userId: string
): Promise<{ dna: ProductDNA; personaContext: string }> {
  const { data, error } = await supabaseServer
    .from("profiles")
    .select("id, is_mining, mining_started_at, product_dna, persona_context")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new HuntError(`Failed to load profile: ${error.message}`, 500, "config");
  }
  if (!data) {
    throw new HuntError("Profile not found", 404, "config");
  }

  const row = data as ProfileRow;

  if (row.is_mining && row.mining_started_at) {
    const elapsed = Date.now() - new Date(row.mining_started_at).getTime();
    if (elapsed < STALE_LOCK_MS) {
      throw new HuntError(
        "A mining execution is already in progress for this workspace",
        409,
        "lock"
      );
    }
  }

  if (!row.product_dna) {
    throw new HuntError(
      "Complete onboarding to generate Product DNA before hunting",
      400,
      "config"
    );
  }

  const { error: lockError } = await supabaseServer
    .from("profiles")
    .update({
      is_mining: true,
      mining_started_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (lockError) {
    throw new HuntError(
      `Failed to acquire mining lock: ${lockError.message}`,
      500,
      "lock"
    );
  }

  return {
    dna: parseProductDna(row.product_dna),
    personaContext: row.persona_context?.trim() ?? "",
  };
}

export async function releaseMiningLock(
  userId: string,
  options?: { success?: boolean }
): Promise<void> {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    is_mining: false,
  };
  if (options?.success !== false) {
    patch.last_mined_at = now;
  }

  const { error } = await supabaseServer
    .from("profiles")
    .update(patch)
    .eq("id", userId);

  if (error) {
    console.error("[ADAPTIVE MINER] Failed to release mining lock:", error.message);
  }
}

export async function sourceUrlExistsGlobally(
  sourceUrl: string
): Promise<boolean> {
  const { data, error } = await supabaseServer
    .from("discovery_leads")
    .select("id")
    .eq("source_url", sourceUrl)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new HuntError(
      `Overlap guard query failed: ${error.message}`,
      500,
      "overlap"
    );
  }
  return !!data;
}

export async function sourceUrlExistsInInboundInteractions(
  userId: string,
  sourceUrl: string
): Promise<boolean> {
  const { data, error } = await supabaseServer
    .from("inbound_interactions")
    .select("id")
    .eq("user_id", userId)
    .ilike("original_thread", `%${sourceUrl}%`)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new HuntError(
      `Inbound overlap guard failed: ${error.message}`,
      500,
      "overlap"
    );
  }
  return !!data;
}

export async function sourceUrlExistsAnywhere(
  userId: string,
  sourceUrl: string
): Promise<boolean> {
  const inVault = await discoveryUrlExistsForUser(
    supabaseServer,
    userId,
    sourceUrl
  );
  if (inVault) return true;
  return sourceUrlExistsInInboundInteractions(userId, sourceUrl);
}

export async function scoreIntentWithOpenAI(params: {
  postText: string;
  painPoints: string[];
  personaContext: string;
  productName: string;
}): Promise<number> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new HuntError("OPENAI_API_KEY is not configured", 500, "scoring");
  }

  const pains = params.painPoints.join("; ") || "B2B software pain points";
  const persona = params.personaContext || "Helpful indie founder tone";

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_SCORING_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You score buying intent for B2B SaaS prospecting. Return JSON only: { "intent_score": number } where intent_score is an integer 0-100.',
          },
          {
            role: "user",
            content: `Product: ${params.productName}
Persona: ${persona}
Target pain points: ${pains}

Post to evaluate:
---
${params.postText.slice(0, 2500)}
---

Score how strongly this post reflects someone actively seeking a solution matching the pain points.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : "OpenAI failed";
    throw new HuntError(`Intent scoring failed: ${msg}`, 502, "scoring");
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new HuntError(
      `OpenAI scoring returned ${response.status}: ${detail}`,
      502,
      "scoring"
    );
  }

  const completion = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new HuntError("OpenAI returned empty scoring response", 502, "scoring");
  }

  let parsed: { intent_score?: number };
  try {
    parsed = JSON.parse(content) as { intent_score?: number };
  } catch {
    throw new HuntError("OpenAI returned invalid scoring JSON", 502, "scoring");
  }

  const score = Math.round(Number(parsed.intent_score));
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new HuntError("OpenAI returned invalid intent_score", 502, "scoring");
  }
  return score;
}

async function evolveQueriesPass2(params: {
  dna: ProductDNA;
  originalQueries: string[];
  haulSoFar: number;
  target: number;
}): Promise<string[]> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new HuntError("OPENAI_API_KEY is not configured", 500, "evolution");
  }

  minerLog.warn(
    `Zero or insufficient results under strict parameters. Haul: ${params.haulSoFar}/${params.target}. Initiating Pass 2 rewriting sequence...`
  );

  const primaryPlatforms =
    params.dna.targetPlatforms.length > 0
      ? params.dna.targetPlatforms.join(", ")
      : "reddit, x, hackernews, indiehackers, producthunt";

  const fallbackPlatforms = ["reddit", "hackernews", "indiehackers", "producthunt"]
    .filter((p) => !params.dna.targetPlatforms.includes(p as Platform))
    .join(", ");

  const systemPrompt = `You are a Google dork query evolution engine for B2B SaaS lead mining.

The strict Pass 1 queries returned insufficient results. Rewrite and expand them.

RULES:
- Remove exact phrase quotes ("") when they over-constrain results.
- Use proximity clusters with parenthetical OR syntax, e.g. (validate OR validation) (startup OR idea).
- If the user's primary platform is dry, auto-generate fallback site: operators for other platforms.
- Return exactly 3-5 Google search query strings optimized for Serper.
- Each query must include a site: operator targeting a community platform.
- Do not repeat the original queries verbatim.

Return strict JSON only: { "queries": ["...", "..."] }`;

  const userPrompt = `Product: ${params.dna.productName}
One-liner: ${params.dna.oneLiner}
Keywords: ${params.dna.keywords.join(", ")}
Pain points: ${params.dna.painPoints.join("; ")}
Primary platforms: ${primaryPlatforms}
Fallback platforms to expand into: ${fallbackPlatforms || "none"}

Failed Pass 1 queries:
${params.originalQueries.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Error brief: Zero results returned under strict parameters.

Evolve these into broader cross-platform dork strings.`;

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_EVOLUTION_MODEL,
        temperature: 0.7,
        max_tokens: 1200,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : "OpenAI failed";
    throw new HuntError(`Query evolution failed: ${msg}`, 502, "evolution");
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new HuntError(
      `OpenAI evolution returned ${response.status}: ${detail}`,
      502,
      "evolution"
    );
  }

  const completion = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = completion.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new HuntError("OpenAI returned empty evolution response", 502, "evolution");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new HuntError("OpenAI returned invalid evolution JSON", 502, "evolution");
  }

  const validated = evolvedQueriesSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new HuntError(
      "OpenAI evolution response did not match query schema",
      502,
      "evolution"
    );
  }

  minerLog.success(
    `Pass 2 query rewrite complete — ${validated.data.queries.length} evolved dorks ready`
  );

  return validated.data.queries.slice(0, 5);
}

export async function queueLeadToBank(params: {
  userId: string;
  candidate: SerperCandidate;
  intentScore: number;
}): Promise<"queued" | "duplicate"> {
  try {
    return await queueDiscoveryLead(supabaseServer, {
      userId: params.userId,
      candidate: params.candidate,
      intentScore: params.intentScore,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lead bank write failed";
    if (message.toLowerCase().includes("duplicate")) {
      return "duplicate";
    }
    throw new HuntError(message, 500, "vault");
  }
}

async function processPassCandidates(params: {
  userId: string;
  dna: ProductDNA;
  personaContext: string;
  candidates: SerperCandidate[];
  insertedSoFar: number;
  target: number;
  pass: number;
  strictRelevance: boolean;
  minIntentScore: number;
  filterStaleYears: boolean;
}): Promise<PassMetrics> {
  const metrics: PassMetrics = {
    scanned: 0,
    skippedOverlap: 0,
    skippedDuplicate: 0,
    skippedErrors: 0,
    skippedLowIntent: 0,
    skippedStrictFilter: 0,
    inserted: 0,
  };

  metrics.scanned = params.candidates.length;

  for (const candidate of params.candidates) {
    if (params.insertedSoFar + metrics.inserted >= params.target) {
      break;
    }

    try {
      if (params.strictRelevance && !passesStrictRelevanceFilter(candidate, params.dna)) {
        metrics.skippedStrictFilter++;
        continue;
      }

      const postText = `${candidate.title}\n\n${candidate.snippet}`.trim();
      if (params.filterStaleYears && snippetContainsStaleYear(postText)) {
        metrics.skippedOverlap++;
        continue;
      }

      const exists = await sourceUrlExistsAnywhere(params.userId, candidate.link);
      if (exists) {
        metrics.skippedOverlap++;
        continue;
      }

      const intentScore = await scoreIntentWithOpenAI({
        postText,
        painPoints: params.dna.painPoints,
        personaContext: params.personaContext,
        productName: params.dna.productName,
      });

      if (intentScore < params.minIntentScore) {
        metrics.skippedLowIntent++;
        minerLog.info(
          `Pass ${params.pass} discard — score ${intentScore} below ${params.minIntentScore} threshold for ${candidate.link}`
        );
        continue;
      }

      const queueResult = await queueLeadToBank({
        userId: params.userId,
        candidate,
        intentScore,
      });

      if (queueResult === "duplicate") {
        metrics.skippedOverlap++;
        continue;
      }

      metrics.inserted++;
      minerLog.success(
        `Pass ${params.pass} vaulted — score ${intentScore} | ${candidate.platform} | ${candidate.link}`
      );
    } catch (err) {
      if (err instanceof HuntError && err.message === "duplicate") {
        metrics.skippedOverlap++;
        continue;
      }
      metrics.skippedErrors++;
      minerLog.error(`Pass ${params.pass} candidate skipped: ${String(err)}`);
    }
  }

  return metrics;
}

function mergeMetrics(totals: PassMetrics, pass: PassMetrics): PassMetrics {
  return {
    scanned: totals.scanned + pass.scanned,
    skippedOverlap: totals.skippedOverlap + pass.skippedOverlap,
    skippedDuplicate: totals.skippedDuplicate + pass.skippedDuplicate,
    skippedErrors: totals.skippedErrors + pass.skippedErrors,
    skippedLowIntent: totals.skippedLowIntent + pass.skippedLowIntent,
    skippedStrictFilter: totals.skippedStrictFilter + pass.skippedStrictFilter,
    inserted: totals.inserted + pass.inserted,
  };
}

/** Primary entry for POST /api/miner/hunt — adaptive multi-pass Serper discovery loop. */
export async function executeLeadHunt(userId: string): Promise<HuntResult> {
  return executeHuntLoop(userId);
}

export async function executeHuntLoop(userId: string): Promise<HuntResult> {
  let lockHeld = false;

  const totals: PassMetrics = {
    scanned: 0,
    skippedOverlap: 0,
    skippedDuplicate: 0,
    skippedErrors: 0,
    skippedLowIntent: 0,
    skippedStrictFilter: 0,
    inserted: 0,
  };

  let passesExecuted = 0;
  const seenUrls = new Set<string>();
  let activeQueries: string[] = [];
  let evolvedQueries: string[] | null = null;

  try {
    const { dna, personaContext } = await readConfigAndAcquireLock(userId);
    lockHeld = true;

    activeQueries = [...dna.activeSerperQueries];

    const dailyDropQuota = resolveDailyDropQuota(userId);
    const queueThreshold = Math.ceil(dailyDropQuota * 1.5);
    const queuedCount = await countQueuedDiscoveryLeads(supabaseServer, userId);
    const skipSerperScrape = queuedCount >= queueThreshold;

    if (skipSerperScrape) {
      console.log(
        `[Miner] Queue healthy (${queuedCount} leads). Bypassing Serper scrape to save compute.`
      );
      minerLog.info(
        `Queue circuit breaker — ${queuedCount} queued >= ${queueThreshold} threshold (quota ${dailyDropQuota}). Serper passes skipped.`
      );
    } else {
      minerLog.info(
        `Starting adaptive hunt — batch target ${BATCH_SEGMENT_TARGET}/${DAILY_LEAD_GOAL} daily goal | ${activeQueries.length} seed queries | vault ${queuedCount} queued`
      );
    }

    if (!skipSerperScrape) {
    for (let pass = 1; pass <= MAX_RETRIEVAL_PASSES; pass++) {
      if (totals.inserted >= BATCH_SEGMENT_TARGET) {
        minerLog.success(
          `Batch target reached (${totals.inserted}/${BATCH_SEGMENT_TARGET}). Circuit breaker idle.`
        );
        break;
      }

      passesExecuted = pass;
      let queriesForPass = activeQueries;
      let serperOptions: SerperFetchOptions = {
        timeRange: "week",
        filterStaleYears: true,
      };
      let strictRelevance = true;
      let minIntentScore = 0;

      if (pass === 1) {
        minerLog.pass(
          1,
          "Ultra-Fresh Sniper — 1 min to 1 week window, strict niche anchors"
        );
      } else if (pass === 2) {
        if (totals.inserted >= BATCH_SEGMENT_TARGET) break;

        minerLog.warn(
          `Pass 1 complete. Haul: ${totals.inserted}/${BATCH_SEGMENT_TARGET}. Initiating Pass 2 rewriting sequence...`
        );

        evolvedQueries = await evolveQueriesPass2({
          dna,
          originalQueries: activeQueries,
          haulSoFar: totals.inserted,
          target: BATCH_SEGMENT_TARGET,
        });
        queriesForPass = evolvedQueries;
        strictRelevance = false;
        serperOptions = { timeRange: "week", filterStaleYears: true };

        minerLog.pass(
          2,
          "Cross-Platform Context Expansion — evolved dork strings firing"
        );
      } else if (pass === 3) {
        if (totals.inserted >= BATCH_SEGMENT_TARGET) break;

        minerLog.warn(
          `Pass 2 complete. Haul: ${totals.inserted}/${BATCH_SEGMENT_TARGET}. Opening Pass 3 historical deep dive (30 day window)...`
        );

        queriesForPass = evolvedQueries ?? activeQueries;
        strictRelevance = false;
        minIntentScore = HISTORICAL_MIN_INTENT_SCORE;
        serperOptions = { timeRange: "month", filterStaleYears: false };

        minerLog.pass(
          3,
          `Historical Deep Dive — max 30 days, WARM/HOT filter (score >= ${HISTORICAL_MIN_INTENT_SCORE})`
        );
      }

      const rawCandidates = await fetchAllSerperCandidates(
        queriesForPass,
        serperOptions
      );
      const { unique, skippedDuplicate } = dedupeCandidates(
        rawCandidates,
        seenUrls
      );
      totals.skippedDuplicate += skippedDuplicate;

      minerLog.info(
        `Pass ${pass} Serper returned ${rawCandidates.length} raw / ${unique.length} unique candidates`
      );

      const passMetrics = await processPassCandidates({
        userId,
        dna,
        personaContext,
        candidates: unique,
        insertedSoFar: totals.inserted,
        target: BATCH_SEGMENT_TARGET,
        pass,
        strictRelevance,
        minIntentScore,
        filterStaleYears: serperOptions.filterStaleYears ?? true,
      });

      Object.assign(totals, mergeMetrics(totals, passMetrics));

      minerLog.pass(
        pass,
        `complete. Haul: ${totals.inserted}/${BATCH_SEGMENT_TARGET} | scanned ${passMetrics.scanned} | strict-skip ${passMetrics.skippedStrictFilter} | low-intent-skip ${passMetrics.skippedLowIntent}`
      );

      if (pass === 1 && totals.inserted >= BATCH_SEGMENT_TARGET) {
        minerLog.success("Pass 1 sniper satisfied batch target. Skipping expansion passes.");
        break;
      }

      if (pass === 2 && totals.inserted >= BATCH_SEGMENT_TARGET) {
        minerLog.success("Pass 2 expansion satisfied batch target. Skipping historical pass.");
        break;
      }
    }

    if (passesExecuted >= MAX_RETRIEVAL_PASSES) {
      minerLog.warn(
        `Circuit breaker engaged — ${MAX_RETRIEVAL_PASSES} retrieval loops exhausted. Final haul: ${totals.inserted}/${BATCH_SEGMENT_TARGET}.`
      );
    }

    minerLog.success(
      `Adaptive hunt finished — queued ${totals.inserted} | passes ${passesExecuted}/${MAX_RETRIEVAL_PASSES}`
    );
    }

    const release = await executeDailyReleaseProtocol(supabaseServer, userId);
    const bank = await getLeadBankStats(supabaseServer, userId);

    minerLog.success(
      `Daily drop complete — released ${release.released}/${release.dailyDropQuota} | active ${bank.activeCount} | vault ${bank.queuedCount} queued`
    );

    return {
      ok: true,
      inserted: release.released,
      queued: totals.inserted,
      released: release.released,
      scanned: totals.scanned,
      skippedOverlap: totals.skippedOverlap,
      skippedDuplicate: totals.skippedDuplicate,
      skippedErrors: totals.skippedErrors,
      skippedLowIntent: totals.skippedLowIntent,
      skippedStrictFilter: totals.skippedStrictFilter,
      stoppedEarly: totals.inserted >= BATCH_SEGMENT_TARGET,
      passesExecuted,
      dailyLeadGoal: DAILY_LEAD_GOAL,
      batchTarget: BATCH_SEGMENT_TARGET,
      bank,
    };
  } finally {
    if (lockHeld) {
      await releaseMiningLock(userId, { success: true });
    }
  }
}
