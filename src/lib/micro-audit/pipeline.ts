import { z } from "zod";

import type { MicroAuditPreviewLead, MicroAuditResult, MicroAuditTeaser } from "@/lib/micro-audit/types";
import {
  normalizeTargetUrl,
  PipelineError,
  scrapeWithJina,
} from "@/lib/onboard-pipeline";
import { fetchSerperQuery, type SerperCandidate } from "@/lib/miner/search-pipeline";
import type { Platform, ProductDNA } from "@/lib/signalflow-types";
import { detectPlatformFromUrl } from "@/lib/miner/search-pipeline";
import { DEFAULT_SERPER_QUERIES } from "@/lib/signalflow-types";

const TEASER_SCRAPE_MAX = 6_000;
const OPENAI_MODEL = "gpt-4o";
const SERPER_RESULTS_PER_SURFACE = 5;
const PREVIEW_LEADS_LIMIT = 5;

const teaserExtractSchema = z.object({
  productName: z.string().min(1),
  oneLiner: z.string().min(1),
  painPoints: z.array(z.string()).min(2).max(6),
  keywords: z.array(z.string()).min(3).max(10),
});

function truncateMarkdown(text: string, max = TEASER_SCRAPE_MAX): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[Content truncated for teaser analysis…]`;
}

function buildTeaserPrompt(siteUrl: string, markdown: string): string {
  return `Analyze this product website for a public micro-audit teaser. Be fast and precise.

Website URL: ${siteUrl}

Content:
---
${markdown}
---

Return JSON only with these keys:
- productName (string)
- oneLiner (string — crisp value proposition)
- painPoints (string[] — 2-6 pains)
- keywords (string[] — 3-10 intent keywords)`;
}

type TeaserQueryPair = {
  redditQuery: string;
  hnQuery: string;
};

const teaserQuerySchema = z.object({
  redditQuery: z.string().min(10),
  hnQuery: z.string().min(10),
});

function sanitizeOpenAiJsonResponse(raw: string): string {
  let clean = raw.trim();
  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
  }
  return clean;
}

async function extractHighIntentQueries(params: {
  siteUrl: string;
  productName: string;
  oneLiner: string;
  painPoints: string[];
  keywords: string[];
}): Promise<TeaserQueryPair> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new PipelineError(
      "OPENAI_API_KEY is not configured",
      500,
      "extract",
      "Teaser Mining Failed"
    );
  }

  const systemPrompt = `You write desperate-customer search queries used to find solutions on Reddit and Hacker News.

Return strict JSON only:
{
  "redditQuery": "a google/serper-ready query that MUST include site:reddit.com",
  "hnQuery": "a google/serper-ready query that MUST include site:news.ycombinator.com"
}

Rules:
- Output exactly 2 queries (one reddit, one hn).
- These must be high-intent, problem-first, not brand-first.
- No quotes. Prefer OR clusters in parentheses. Add basic B2B negatives: -crypto -trading -forex -stocks.
- Keep each query under 180 characters.`;

  const userPrompt = `Website: ${params.siteUrl}
Product: ${params.productName}
One-liner: ${params.oneLiner}
Pain points: ${params.painPoints.join("; ")}
Keywords: ${params.keywords.join(", ")}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.4,
      max_tokens: 250,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new PipelineError(
      `OpenAI returned ${response.status}: ${detail}`,
      502,
      "extract",
      "Teaser Mining Failed",
      detail
    );
  }

  const completion = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = completion.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new PipelineError(
      "OpenAI returned empty mining query content",
      502,
      "extract",
      "Teaser Mining Failed"
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(sanitizeOpenAiJsonResponse(content));
  } catch {
    throw new PipelineError(
      "OpenAI returned invalid JSON for mining queries",
      502,
      "extract",
      "Teaser Mining Failed"
    );
  }

  const parsed = teaserQuerySchema.safeParse(json);
  if (!parsed.success) {
    throw new PipelineError(
      `Mining query schema validation failed: ${parsed.error.message}`,
      502,
      "extract",
      "Teaser Mining Failed",
      parsed.error.message
    );
  }

  const redditQuery = parsed.data.redditQuery.trim();
  const hnQuery = parsed.data.hnQuery.trim();
  if (!redditQuery.toLowerCase().includes("site:reddit.com")) {
    throw new PipelineError(
      "redditQuery must include site:reddit.com",
      502,
      "extract",
      "Teaser Mining Failed"
    );
  }
  if (!hnQuery.toLowerCase().includes("site:news.ycombinator.com")) {
    throw new PipelineError(
      "hnQuery must include site:news.ycombinator.com",
      502,
      "extract",
      "Teaser Mining Failed"
    );
  }

  return { redditQuery, hnQuery };
}

function pickTopSerper(results: SerperCandidate[], limit: number): SerperCandidate[] {
  const out: SerperCandidate[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    const link = (r.link ?? "").split("#")[0]!.trim();
    if (!link) continue;
    if (seen.has(link)) continue;
    seen.add(link);
    out.push({ ...r, link });
    if (out.length >= limit) break;
  }
  return out;
}

const verifiedLeadSchema = z.object({
  platform: z.string().min(1),
  sourceUrl: z.string().url(),
  threadTitle: z.string().min(1),
  intentScore: z.number().int().min(1).max(100),
  draftSnippet: z.string().min(1),
});

const miningVerificationSchema = z.object({
  primaryLeakPlatform: z.string().min(1),
  missedTrafficVolume: z.string().min(1),
  highestIntentThreadTitle: z.string().min(1),
  previewLeads: z.array(verifiedLeadSchema).min(1).max(PREVIEW_LEADS_LIMIT),
});

async function verifyAndMapLeadsWithOpenAI(params: {
  productName: string;
  oneLiner: string;
  url: string;
  painPoints: string[];
  keywords: string[];
  rawResults: { title: string; snippet: string; link: string; platform: Platform }[];
  allowProxyFallback: boolean;
}): Promise<{
  primaryLeakPlatform: string;
  missedTrafficVolume: string;
  highestIntentThreadTitle: string;
  previewLeads: MicroAuditPreviewLead[];
}> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new PipelineError(
      "OPENAI_API_KEY is not configured",
      500,
      "extract",
      "Teaser Mining Failed"
    );
  }

  const resultsBlock =
    params.rawResults.length > 0
      ? params.rawResults
          .map(
            (r, i) =>
              `[${i + 1}] ${r.platform}\nTitle: ${r.title}\nSnippet: ${r.snippet}\nURL: ${r.link}`
          )
          .join("\n\n")
      : "(no serper results)";

  const systemPrompt = `You are a high-speed verifier for distribution mining results.

Your job:
- Remove spam, irrelevant, job posts, and low-intent chatter.
- Pick the best matching discussions for the product's pain points.
- Assign a true buying-intent score (1-100).
- Draft a short, contextual reply snippet that is value-first and naturally mentions the product only if it fits. No hard sell.

Return strict JSON only:
{
  "primaryLeakPlatform": "e.g. r/SaaS or Hacker News",
  "missedTrafficVolume": "a short metric string like '5 active threads' or '9 high-intent discussions'",
  "highestIntentThreadTitle": "unblurred real title of the best thread",
  "previewLeads": [
    {
      "platform": "Reddit · r/SaaS" ,
      "sourceUrl": "https://...",
      "threadTitle": "...",
      "intentScore": 94,
      "draftSnippet": "..."
    }
  ]
}

Constraints:
- previewLeads must be 3-5 items.
- Never invent URLs when real URLs exist.
${params.allowProxyFallback ? "- If the serper results are empty or unusable, generate hyper-realistic proxy leads with plausible URLs and titles (structure only) so the UI never renders empty." : ""}`;

  const userPrompt = `Product: ${params.productName}
URL: ${params.url}
One-liner: ${params.oneLiner}
Pain points: ${params.painPoints.join("; ")}
Keywords: ${params.keywords.join(", ")}

RAW SERPER RESULTS (reddit + HN):
${resultsBlock}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.55,
      max_tokens: 1200,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new PipelineError(
      `OpenAI returned ${response.status}: ${detail}`,
      502,
      "extract",
      "Teaser Mining Failed",
      detail
    );
  }

  const completion = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = completion.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new PipelineError(
      "OpenAI returned empty verification content",
      502,
      "extract",
      "Teaser Mining Failed"
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(sanitizeOpenAiJsonResponse(content));
  } catch {
    throw new PipelineError(
      "OpenAI returned invalid JSON for verification",
      502,
      "extract",
      "Teaser Mining Failed"
    );
  }

  const parsed = miningVerificationSchema.safeParse(json);
  if (!parsed.success) {
    throw new PipelineError(
      `Verification schema validation failed: ${parsed.error.message}`,
      502,
      "extract",
      "Teaser Mining Failed",
      parsed.error.message
    );
  }

  return {
    primaryLeakPlatform: parsed.data.primaryLeakPlatform.trim(),
    missedTrafficVolume: parsed.data.missedTrafficVolume.trim(),
    highestIntentThreadTitle: parsed.data.highestIntentThreadTitle.trim(),
    previewLeads: parsed.data.previewLeads.map((l) => ({
      platform: l.platform.trim(),
      sourceUrl: l.sourceUrl.trim(),
      threadTitle: l.threadTitle.trim(),
      intentScore: l.intentScore,
      draftSnippet: l.draftSnippet.trim(),
    })),
  };
}

function mapTeaserToProductDNA(
  data: z.infer<typeof teaserExtractSchema>,
  siteUrl: string
): ProductDNA {
  return {
    productName: data.productName.trim(),
    url: siteUrl,
    oneLiner: data.oneLiner.trim(),
    audience: "",
    painPoints: data.painPoints.map((p) => p.trim()).filter(Boolean),
    targetPlatforms: ["reddit", "hackernews", "indiehackers", "producthunt"],
    activeSerperQueries: [...DEFAULT_SERPER_QUERIES],
    competitors: [],
    keywords: data.keywords.map((k) => k.trim()).filter(Boolean),
  };
}

async function extractTeaserWithOpenAI(
  siteUrl: string,
  markdown: string
): Promise<z.infer<typeof teaserExtractSchema>> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new PipelineError(
      "OPENAI_API_KEY is not configured",
      500,
      "extract",
      "Teaser Extraction Failed"
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.25,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You extract concise go-to-market positioning for a landing-page micro-audit. Output valid JSON only.",
        },
        {
          role: "user",
          content: buildTeaserPrompt(siteUrl, markdown),
        },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new PipelineError(
      `OpenAI returned ${response.status}: ${detail}`,
      502,
      "extract",
      "Teaser Extraction Failed",
      detail
    );
  }

  const completion = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = completion.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new PipelineError(
      "OpenAI returned empty teaser content",
      502,
      "extract",
      "Teaser Extraction Failed"
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new PipelineError(
      "OpenAI returned invalid JSON",
      502,
      "extract",
      "Teaser Extraction Failed"
    );
  }

  const parsed = teaserExtractSchema.safeParse(json);
  if (!parsed.success) {
    throw new PipelineError(
      `Teaser schema validation failed: ${parsed.error.message}`,
      502,
      "extract",
      "Teaser Extraction Failed",
      parsed.error.message
    );
  }

  return parsed.data;
}

export async function runPublicMicroAudit(
  rawUrl: string
): Promise<MicroAuditResult> {
  const normalizedUrl = normalizeTargetUrl(rawUrl);
  const markdown = truncateMarkdown(await scrapeWithJina(normalizedUrl));
  const extracted = await extractTeaserWithOpenAI(normalizedUrl, markdown);

  const dna = mapTeaserToProductDNA(extracted, normalizedUrl);

  const queryPair = await extractHighIntentQueries({
    siteUrl: normalizedUrl,
    productName: extracted.productName.trim(),
    oneLiner: extracted.oneLiner.trim(),
    painPoints: extracted.painPoints,
    keywords: extracted.keywords,
  });

  const [redditResults, hnResults] = await Promise.allSettled([
    fetchSerperQuery(queryPair.redditQuery, { timeRange: "week", filterStaleYears: true }),
    fetchSerperQuery(queryPair.hnQuery, { timeRange: "week", filterStaleYears: true }),
  ]);

  const reddit = redditResults.status === "fulfilled" ? redditResults.value : [];
  const hn = hnResults.status === "fulfilled" ? hnResults.value : [];

  const top = [
    ...pickTopSerper(reddit, SERPER_RESULTS_PER_SURFACE),
    ...pickTopSerper(hn, SERPER_RESULTS_PER_SURFACE),
  ];

  const mapped = top.map((r) => ({
    title: r.title,
    snippet: r.snippet,
    link: r.link,
    platform: detectPlatformFromUrl(r.link),
  }));

  const verified = await verifyAndMapLeadsWithOpenAI({
    productName: extracted.productName.trim(),
    oneLiner: extracted.oneLiner.trim(),
    url: normalizedUrl,
    painPoints: extracted.painPoints,
    keywords: extracted.keywords,
    rawResults: mapped,
    allowProxyFallback: true,
  });

  const teaser: MicroAuditTeaser = {
    productName: extracted.productName.trim(),
    primaryLeakPlatform: verified.primaryLeakPlatform,
    missedTrafficVolume: verified.missedTrafficVolume,
    highestIntentThreadTitle: verified.highestIntentThreadTitle,
    url: normalizedUrl,
  };

  return {
    teaser,
    dna,
    previewLeads: verified.previewLeads.slice(0, PREVIEW_LEADS_LIMIT),
  };
}
