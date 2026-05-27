import { NextResponse } from "next/server";
import { z } from "zod";

import { scrapeWithJina } from "@/lib/onboard-pipeline";
import {
  fetchSerperQuery,
  type SerperCandidate,
} from "@/lib/miner/search-pipeline";

const OPENAI_MODEL = "gpt-4o";

// ─────────────────────────────────────────────
// Zod schemas
// ─────────────────────────────────────────────

const hookRequestSchema = z.object({
  url: z.string().url().min(1),
});

const hookContextSchema = z.object({
  brandName: z.string().min(1),
  targetPersona: z.string().min(1),
  coreFrictionPoint: z.string().min(1),
  dorks: z.array(z.string().min(8)).length(2),
});

const goldenLeadSchema = z.object({
  platform: z.string().min(1),
  title: z.string().min(1),
  intentScore: z.string().min(1),
});

const hookResultSchema = z.object({
  mirror: z.object({
    brandName: z.string().min(1),
    targetPersona: z.string().min(1),
    coreFriction: z.string().min(1),
  }),
  goldenLeads: z.array(goldenLeadSchema).length(2),
  fomoMetrics: z.object({
    totalThreadsFound: z.number().int().nonnegative(),
    missedImpressionsEst: z.number().int().nonnegative(),
  }),
  strategyTeaser: z.object({
    unblurredDiagnosis: z.string().min(1),
    blurredPlaybookName: z.string().min(1),
  }),
});

type HookResult = z.infer<typeof hookResultSchema>;

type HookErrorResponse = {
  ok: false;
  error: string;
  step: string;
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function buildExtractionPrompt(url: string, markdown: string): string {
  return `You are a fast onboarding hook architect.

Analyze this product website and extract the minimum context needed to run a \"gut punch\" organic traffic audit.

Website URL: ${url}

Website markdown (truncated):
---
${markdown}
---

Return strict JSON only with exactly these keys (no extras):
{
  "brandName": "string",
  "targetPersona": "string",
  "coreFrictionPoint": "string (one sharp sentence)",
  "dorks": [
    "google dork string 1",
    "google dork string 2"
  ]
}

Rules for dorks:
- Each MUST be a production-ready Google/Serper query.
- Include site filters like site:reddit.com or site:news.ycombinator.com where appropriate.
- Keep them under 140 characters and focused on real buyer pain (not brand name).`;
}

function serializeSerperCandidates(candidates: SerperCandidate[]): string {
  if (candidates.length === 0) {
    return "(no serper results)";
  }
  return JSON.stringify(
    candidates.map((c) => ({
      platform: c.platform,
      title: c.title,
      snippet: c.snippet,
      link: c.link,
      query: c.query,
    })),
    null,
    2
  );
}

function buildHookResultPrompt(params: {
  url: string;
  context: z.infer<typeof hookContextSchema>;
  serperSnapshot: string;
}): string {
  const { url, context, serperSnapshot } = params;

  return `You are designing a \"gut punch\" onboarding hook for an organic distribution product.

You already analyzed the website and know:
- brandName: ${context.brandName}
- targetPersona: ${context.targetPersona}
- coreFrictionPoint: ${context.coreFrictionPoint}

You also have SERPER RESULTS (may be empty or partial):
---
${serperSnapshot}
---

Your job:
- Mirror the founder's reality back to them in one sharp friction sentence.
- Surface exactly 2 \"golden\" high-intent leads (real or hyper-realistic proxy) that feel like threads they SHOULD have been in.
- Quantify FOMO with a threads-found count and a conservative missed impressions estimate.
- Bridge into a strategy diagnosis and a blurred playbook name, without revealing the full system.

IMPORTANT FALLBACK:
- If serperSnapshot is \"(no serper results)\" or obviously empty/noisy, you MUST fabricate 2 highly realistic proxy leads and reasonable metrics based on the product and persona. The UI must never be empty.

Return strict JSON only with this EXACT shape:
{
  "mirror": {
    "brandName": "...",
    "targetPersona": "...",
    "coreFriction": "..."
  },
  "goldenLeads": [
    { "platform": "...", "title": "...", "intentScore": "..." },
    { "platform": "...", "title": "...", "intentScore": "..." }
  ],
  "fomoMetrics": {
    "totalThreadsFound": 0,
    "missedImpressionsEst": 0
  },
  "strategyTeaser": {
    "unblurredDiagnosis": "...",
    "blurredPlaybookName": "..."
  }
}

Guidance:
- goldenLeads platform must be one of: "reddit", "hackernews", "indiehackers", "producthunt", "x".
- intentScore should look like \"HOT · 96\" or \"WARM · 82\" style strings.
- missedImpressionsEst is a rough numeric guess, not exaggerated.
- blurredPlaybookName should sound like a proprietary system name, not a generic \"growth system\".`;
}

async function callOpenAI<T>(params: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
  temperature?: number;
  step: string;
}): Promise<T> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const { system, user, schema, maxTokens = 900, temperature = 0.4, step } =
    params;

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
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : "OpenAI request failed";
    throw new Error(`[HOOK] OpenAI network error (${step}): ${msg}`);
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new Error(
      `[HOOK] OpenAI HTTP ${response.status} (${step}): ${detail}`
    );
  }

  const completion = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = completion.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw new Error(`[HOOK] OpenAI returned empty content (${step})`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`[HOOK] OpenAI returned invalid JSON (${step})`);
  }

  const validated = schema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      `[HOOK] OpenAI response schema mismatch (${step}): ${validated.error.message}`
    );
  }

  return validated.data;
}

// ─────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsedBody = hookRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json<HookErrorResponse>(
        {
          ok: false,
          error: "Invalid request payload",
          step: "request",
        },
        { status: 400 }
      );
    }

    const siteUrl = parsedBody.data.url;

    // Step A: Fast Jina scrape
    const markdown = await scrapeWithJina(siteUrl);

    // Step B: Extract brand + persona + core friction + 2 dorks
    const context = await callOpenAI({
      system:
        "You extract minimum viable context for an organic distribution audit.",
      user: buildExtractionPrompt(siteUrl, markdown),
      schema: hookContextSchema,
      maxTokens: 450,
      temperature: 0.5,
      step: "extract-context",
    });

    // Step C: Run 2 Serper queries in parallel (best-effort)
    let allCandidates: SerperCandidate[] = [];
    try {
      const settled = await Promise.allSettled(
        context.dorks.map((q) =>
          fetchSerperQuery(q, { timeRange: "week", filterStaleYears: true })
        )
      );
      for (const res of settled) {
        if (res.status === "fulfilled") {
          allCandidates = allCandidates.concat(res.value);
        }
      }
    } catch {
      // Soft fail — rely on LLM fallback for goldenLeads + metrics
      allCandidates = [];
    }

    const serperSnapshot = serializeSerperCandidates(allCandidates);

    // Step D: Final hook JSON assembly
    const hookResult = await callOpenAI<HookResult>({
      system:
        "You design high-converting onboarding hooks for organic distribution products.",
      user: buildHookResultPrompt({
        url: siteUrl,
        context,
        serperSnapshot,
      }),
      schema: hookResultSchema,
      maxTokens: 650,
      temperature: 0.6,
      step: "assemble-hook",
    });

    return NextResponse.json({ ok: true, data: hookResult }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected onboarding hook error";
    console.error("[HOOK] Fatal error:", message);
    return NextResponse.json<HookErrorResponse>(
      { ok: false, error: message, step: "unknown" },
      { status: 500 }
    );
  }
}

