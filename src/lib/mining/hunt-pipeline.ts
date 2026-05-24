import { z } from "zod";

import { resolveAuthenticatedUserId } from "@/lib/onboard-pipeline";
import type { Platform, ProductDNA } from "@/lib/signalflow-types";
import { supabaseServer } from "@/lib/supabase-server";

import {
  fetchAllSerperCandidates,
  snippetContainsStaleYear,
  type SerperCandidate,
} from "@/lib/miner/search-pipeline";

const MAX_LEADS_PER_RUN = 15;
const STALE_LOCK_MS = 5 * 60 * 1000;
const OPENAI_MODEL = "gpt-4o-mini";

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
  inserted: number;
  scanned: number;
  skippedOverlap: number;
  skippedDuplicate: number;
  skippedErrors: number;
  stoppedEarly: boolean;
};

export type { SerperCandidate } from "@/lib/miner/search-pipeline";

type ProfileRow = {
  id: string;
  is_mining: boolean;
  mining_started_at: string | null;
  product_dna: unknown;
  persona_context: string | null;
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
    console.error("[hunt] Failed to release mining lock:", error.message);
  }
}

export async function sourceUrlExistsGlobally(
  sourceUrl: string
): Promise<boolean> {
  const { data, error } = await supabaseServer
    .from("leads")
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
        model: OPENAI_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You score buying intent for B2B SaaS prospecting. Return JSON only: { \"intent_score\": number } where intent_score is an integer 0-100.",
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

export async function insertLead(params: {
  userId: string;
  candidate: SerperCandidate;
  intentScore: number;
}): Promise<void> {
  const content = [params.candidate.title, params.candidate.snippet]
    .filter(Boolean)
    .join("\n\n");

  const { error } = await supabaseServer.from("leads").insert({
    user_id: params.userId,
    platform: params.candidate.platform,
    source_url: params.candidate.link,
    content,
    intent_score: params.intentScore,
    status: "new",
    ai_draft_content: null,
  });

  if (error) {
    if (error.code === "23505") {
      throw new HuntError("duplicate", 409, "insert");
    }
    throw new HuntError(`Lead insert failed: ${error.message}`, 500, "insert");
  }
}

/** Primary entry for POST /api/miner/hunt — runs Serper discovery + intent scoring + lead inserts. */
export async function executeLeadHunt(userId: string): Promise<HuntResult> {
  return executeHuntLoop(userId);
}

export async function executeHuntLoop(userId: string): Promise<HuntResult> {
  let lockHeld = false;

  try {
    const { dna, personaContext } = await readConfigAndAcquireLock(userId);
    lockHeld = true;

    const serperCandidates = await fetchAllSerperCandidates(
      dna.activeSerperQueries
    );

    const seenUrls = new Set<string>();
    const uniqueCandidates: SerperCandidate[] = [];
    let skippedDuplicate = 0;

    for (const c of serperCandidates) {
      const normalized = c.link.split("#")[0]!.trim();
      if (seenUrls.has(normalized)) {
        skippedDuplicate++;
        continue;
      }
      seenUrls.add(normalized);
      uniqueCandidates.push({ ...c, link: normalized });
    }

    let inserted = 0;
    let skippedOverlap = 0;
    let skippedErrors = 0;
    let stoppedEarly = false;
    const scanned = uniqueCandidates.length;

    for (const candidate of uniqueCandidates) {
      if (inserted >= MAX_LEADS_PER_RUN) {
        stoppedEarly = true;
        break;
      }

      try {
        const exists = await sourceUrlExistsGlobally(candidate.link);
        if (exists) {
          skippedOverlap++;
          continue;
        }

        const postText = `${candidate.title}\n\n${candidate.snippet}`.trim();
        if (snippetContainsStaleYear(postText)) {
          skippedOverlap++;
          continue;
        }

        const intentScore = await scoreIntentWithOpenAI({
          postText,
          painPoints: dna.painPoints,
          personaContext,
          productName: dna.productName,
        });

        await insertLead({
          userId,
          candidate,
          intentScore,
        });
        inserted++;
      } catch (err) {
        if (err instanceof HuntError && err.message === "duplicate") {
          skippedOverlap++;
          continue;
        }
        skippedErrors++;
        console.error("[hunt] Candidate skipped:", err);
      }
    }

    return {
      ok: true,
      inserted,
      scanned,
      skippedOverlap,
      skippedDuplicate,
      skippedErrors,
      stoppedEarly,
    };
  } finally {
    if (lockHeld) {
      await releaseMiningLock(userId, { success: true });
    }
  }
}
