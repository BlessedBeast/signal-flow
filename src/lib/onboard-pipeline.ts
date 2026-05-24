import { z } from "zod";

import type { Platform, ProductDNA } from "@/lib/signalflow-types";
import { supabaseServer } from "@/lib/supabase-server";

export { parseClientProductDna } from "@/lib/product-dna-schema";

const MAX_SCRAPE_CHARS = 12_000;
const OPENAI_MODEL = "gpt-4o";

const aiDnaSchema = z.object({
  productName: z.string().min(1),
  url: z.string().optional(),
  oneLiner: z.string().min(1),
  audience: z.union([z.string(), z.array(z.string())]),
  painPoints: z.array(z.string()).min(1),
  targetPlatforms: z.array(z.string()).min(1),
  activeSerperQueries: z.array(z.string()).min(5),
  competitors: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
});

export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly step?: "scrape" | "extract" | "vault" | "auth"
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

export function normalizeTargetUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new PipelineError("url is required", 400);
  }
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (!parsed.hostname) {
      throw new PipelineError("Invalid URL", 400);
    }
    return parsed.toString();
  } catch {
    throw new PipelineError("Invalid URL format", 400);
  }
}

function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  const token = auth.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function resolveAuthenticatedUserId(
  request: Request
): Promise<string | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data.user?.id) {
    return null;
  }
  return data.user.id;
}

function truncateForModel(text: string, max = MAX_SCRAPE_CHARS): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[Content truncated for analysis…]`;
}

export async function scrapeWithJina(url: string): Promise<string> {
  const jinaKey = process.env.JINA_API_KEY;
  if (!jinaKey) {
    throw new PipelineError("JINA_API_KEY is not configured", 500, "scrape");
  }

  const jinaUrl = `https://r.jina.ai/${url}`;

  let response: Response;
  try {
    response = await fetch(jinaUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${jinaKey}`,
        Accept: "text/plain, text/markdown, application/json",
        "X-Return-Format": "markdown",
      },
      signal: AbortSignal.timeout(60_000),
    });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Jina request failed";
    throw new PipelineError(
      `Jina scrape failed: ${message}`,
      502,
      "scrape"
    );
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new PipelineError(
      `Jina returned ${response.status}: ${detail || response.statusText}`,
      502,
      "scrape"
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  let text = "";

  try {
    if (contentType.includes("application/json")) {
      const json = (await response.json()) as {
        data?: { content?: string; text?: string };
        content?: string;
        text?: string;
      };
      text =
        json.data?.content ??
        json.data?.text ??
        json.content ??
        json.text ??
        JSON.stringify(json);
    } else {
      text = await response.text();
    }
  } catch {
    throw new PipelineError("Failed to read Jina response body", 502, "scrape");
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new PipelineError("Jina returned empty content", 502, "scrape");
  }

  return truncateForModel(trimmed);
}

function buildExtractionPrompt(siteUrl: string, markdown: string): string {
  return `Analyze this startup/product website and extract Product DNA for a B2B lead-intelligence platform.

Website URL: ${siteUrl}

Website content (markdown):
---
${markdown}
---

Return JSON with EXACTLY these keys (no extra keys, no omissions):
- productName (string)
- url (string, use ${siteUrl})
- oneLiner (string, crisp value proposition)
- audience (string[] — 2-5 ICP segments)
- painPoints (string[] — 3-6 specific pains the product solves)
- targetPlatforms (string[] — subset of: "reddit", "x", "hackernews")
- activeSerperQueries (string[] — EXACTLY 5 Google dork strings)
- competitors (string[] — 3-6 competitor names)
- keywords (string[] — 5-10 intent keywords)

COMPETITORS (competitors array):
You must identify DIRECT, scale-matched competitors. Infer the product's true scale from the scrape (team size signals, pricing tier, positioning, feature depth, funding mentions, enterprise vs indie tone).
- If the scraped site is a micro-SaaS, indie-hacker project, solo-founder tool, or narrow niche utility, DO NOT list enterprise giants (e.g. Salesforce, HubSpot, Crunchbase, Oracle, Microsoft, Google Workspace) unless the product explicitly competes in that enterprise category.
- Match competitor scale to the product: micro-SaaS → other micro-SaaS and indie tools in the same niche; mid-market → mid-market alternatives; enterprise → enterprise peers only when the site is clearly enterprise-grade.
- Prefer exact niche alternatives users would actually compare in a buying decision (e.g. Validator AI, Venturus, similar category-specific tools)—not generic platforms that merely share a broad keyword.
- Each entry must be a real product/company name (not a category label). Return 3-6 names.

SERPER QUERIES (activeSerperQueries array):
You must act as an expert boolean search architect. The goal is to find high-intent Reddit, Hacker News, and X threads where users are complaining about, asking for help with, or actively seeking solutions to problems this product solves.
- Return EXACTLY 5 distinct dorks. Each must be production-ready for Google/Serper (site: operators, quoted phrases, boolean logic).
- Prioritize complaint and buying-intent language: "struggling with", "looking for alternative", "anyone recommend", "how do you", "frustrated with", "Ask HN", "what tool", etc.—tied to this product's painPoints and category.
- CRITICAL — negative keywords: You MUST append filters to eliminate false positives. When the product is B2B/SaaS, business analytics, validation, research, or strategy tooling, append disambiguators such as -trading -crypto -forex -stocks -betting -gambling -sportsbook unless the product is explicitly in those verticals.
- Add additional negatives when domain overlap is likely (e.g. -NFT -memecoin for "validation" tools; -recipe -cooking for unrelated "stack" terms). Tailor negatives to this product's most ambiguous keywords.
- Distribute across surfaces: include Reddit (site:reddit.com or site:reddit.com/r/<relevant sub>), Hacker News (site:news.ycombinator.com), and X (site:x.com or site:twitter.com). At least one query per major platform where targetPlatforms includes it.
- Format examples (adapt to this product; do not copy verbatim unless relevant):
  site:reddit.com/r/SaaS "validate my idea" -crypto -trading -forex
  site:news.ycombinator.com "market research tool" -trading -stocks
  site:x.com "anyone recommend" "<category problem>" -crypto -forex
- Make every dork hyper-specific to this product's category and pains—not generic marketing queries.

keywords array:
- 5-10 high-intent phrases prospects use when discussing the problem space (not brand names).`;
}

function normalizePlatforms(raw: string[]): Platform[] {
  const map: Record<string, Platform> = {
    reddit: "reddit",
    x: "x",
    twitter: "x",
    hackernews: "hackernews",
    hn: "hackernews",
    "hacker news": "hackernews",
  };
  const out = new Set<Platform>();
  for (const item of raw) {
    const key = item.toLowerCase().trim();
    const platform = map[key];
    if (platform) out.add(platform);
  }
  if (out.size === 0) {
    return ["reddit", "x", "hackernews"];
  }
  return [...out];
}

function normalizeSerperQueries(queries: string[]): string[] {
  const cleaned = queries.map((q) => q.trim()).filter(Boolean);
  if (cleaned.length >= 5) return cleaned.slice(0, 5);
  const defaults = [
    'site:reddit.com "looking for alternative"',
    'site:x.com "anyone recommend" tool',
    'site:news.ycombinator.com "Ask HN" alternative',
    'site:reddit.com "best tool for"',
    'site:x.com "struggling with"',
  ];
  return [...cleaned, ...defaults].slice(0, 5);
}

export function mapAiJsonToProductDNA(
  raw: unknown,
  fallbackUrl: string
): ProductDNA {
  const parsed = aiDnaSchema.safeParse(raw);
  if (!parsed.success) {
    throw new PipelineError(
      `AI response failed schema validation: ${parsed.error.message}`,
      502,
      "extract"
    );
  }

  const data = parsed.data;
  const audience = Array.isArray(data.audience)
    ? data.audience.join(", ")
    : data.audience;

  return {
    productName: data.productName.trim(),
    url: (data.url?.trim() || fallbackUrl).trim(),
    oneLiner: data.oneLiner.trim(),
    audience,
    painPoints: data.painPoints.map((p) => p.trim()).filter(Boolean),
    targetPlatforms: normalizePlatforms(data.targetPlatforms),
    activeSerperQueries: normalizeSerperQueries(data.activeSerperQueries),
    competitors: data.competitors.map((c) => c.trim()).filter(Boolean),
    keywords: data.keywords.map((k) => k.trim()).filter(Boolean),
  };
}

export async function extractProductDNAWithOpenAI(
  siteUrl: string,
  markdown: string
): Promise<ProductDNA> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new PipelineError("OPENAI_API_KEY is not configured", 500, "extract");
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
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an elite B2B product analyst and boolean search architect. Extract scale-accurate, niche-matched competitors (never inflate micro-SaaS with enterprise giants) and high-intent Serper dorks with mandatory negative keywords to kill false positives. Output only valid JSON with exactly the keys requested—no markdown fences, no commentary.",
          },
          {
            role: "user",
            content: buildExtractionPrompt(siteUrl, markdown),
          },
        ],
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "OpenAI request failed";
    throw new PipelineError(
      `OpenAI extraction failed: ${message}`,
      502,
      "extract"
    );
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new PipelineError(
      `OpenAI returned ${response.status}: ${detail}`,
      502,
      "extract"
    );
  }

  let completion: {
    choices?: { message?: { content?: string | null } }[];
  };

  try {
    completion = (await response.json()) as typeof completion;
  } catch {
    throw new PipelineError("OpenAI returned invalid JSON", 502, "extract");
  }

  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new PipelineError("OpenAI returned empty completion", 502, "extract");
  }

  let json: unknown;
  try {
    json = JSON.parse(content) as unknown;
  } catch {
    throw new PipelineError("OpenAI returned non-JSON content", 502, "extract");
  }

  return mapAiJsonToProductDNA(json, siteUrl);
}

export async function persistProductDnaToVault(
  userId: string,
  dna: ProductDNA,
  options?: { isMining?: boolean }
): Promise<void> {
  const isMining = options?.isMining ?? false;
  const patch: Record<string, unknown> = {
    id: userId,
    product_dna: dna,
    website_url: dna.url,
    is_mining: isMining,
  };

  if (isMining) {
    patch.mining_started_at = new Date().toISOString();
  } else {
    patch.mining_started_at = null;
  }

  const { error } = await supabaseServer.from("profiles").upsert(patch, {
    onConflict: "id",
  });

  if (error) {
    throw new PipelineError(
      `Vault upsert failed: ${error.message}`,
      500,
      "vault"
    );
  }
}
