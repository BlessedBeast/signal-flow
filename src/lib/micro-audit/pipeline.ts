import { z } from "zod";

import type { MicroAuditResult, MicroAuditTeaser } from "@/lib/micro-audit/types";
import {
  normalizeTargetUrl,
  PipelineError,
  scrapeWithJina,
} from "@/lib/onboard-pipeline";
import type { ProductDNA } from "@/lib/signalflow-types";
import { DEFAULT_SERPER_QUERIES } from "@/lib/signalflow-types";

const TEASER_SCRAPE_MAX = 6_000;
const OPENAI_MODEL = "gpt-4o";

const teaserExtractSchema = z.object({
  productName: z.string().min(1),
  category: z.string().min(1),
  audience: z.string().min(1),
  oneLiner: z.string().min(1),
  painPoints: z.array(z.string()).min(2).max(6),
  competitors: z.array(z.string()).min(3).max(6),
  keywords: z.array(z.string()).min(3).max(8),
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
- category (string — short market category, e.g. "B2B lead intelligence" or "indie SaaS analytics")
- audience (string — primary ICP in plain language, e.g. "solo founders and lean growth teams")
- oneLiner (string — crisp value proposition)
- painPoints (string[] — 2-6 pains)
- competitors (string[] — 3-6 scale-matched direct competitors, real product names)
- keywords (string[] — 3-8 intent keywords)`;
}

function buildPreviewLeads(
  teaser: MicroAuditTeaser,
  keywords: string[]
): MicroAuditResult["previewLeads"] {
  const keyword = keywords[0] ?? "distribution";
  const templates = [
    {
      platform: "Reddit · r/SaaS",
      threadTitle: `Anyone struggling with ${keyword} for a micro-SaaS?`,
      intentScore: 92,
      draftSnippet:
        "We've been in the same loop — happy to share what finally moved the needle for us without sounding salesy…",
    },
    {
      platform: "Hacker News",
      threadTitle: `Ask HN: Best way to validate ${keyword} before launch?`,
      intentScore: 88,
      draftSnippet:
        "Shipped a small tool in this space — the constraint wasn't ideas, it was finding threads where buyers already vent…",
    },
    {
      platform: "X",
      threadTitle: `Hot take: ${keyword} is still a nightmare for indie hackers`,
      intentScore: 85,
      draftSnippet:
        "100% — we stopped spray-posting and started intercepting intent threads instead. Game changer for reply rate…",
    },
    {
      platform: "Indie Hackers",
      threadTitle: `How are you handling ${keyword} this quarter?`,
      intentScore: 81,
      draftSnippet:
        "We wired a daily drop of qualified conversations — takes 10 min to clear the queue vs 2h of doomscrolling…",
    },
    {
      platform: "Product Hunt",
      threadTitle: `Looking for tools that automate ${keyword}`,
      intentScore: 79,
      draftSnippet:
        "If you're pre-PMF, prioritize channels where people already complain in public — that's where we found signal…",
    },
    {
      platform: "Reddit · r/startups",
      threadTitle: `Alternative to manual ${keyword} workflows?`,
      intentScore: 76,
      draftSnippet:
        "We tried spreadsheets + alerts — fine at 0 users, breaks at scale. Now it's one cockpit for leads + replies…",
    },
  ];

  return templates.map((row) => ({
    ...row,
    threadTitle: row.threadTitle.replace(
      teaser.productName,
      teaser.productName.slice(0, 12)
    ),
  }));
}

function mapTeaserToProductDNA(
  data: z.infer<typeof teaserExtractSchema>,
  siteUrl: string
): ProductDNA {
  return {
    productName: data.productName.trim(),
    url: siteUrl,
    oneLiner: data.oneLiner.trim(),
    audience: data.audience.trim(),
    painPoints: data.painPoints.map((p) => p.trim()).filter(Boolean),
    targetPlatforms: ["reddit", "hackernews", "indiehackers", "producthunt"],
    activeSerperQueries: [...DEFAULT_SERPER_QUERIES],
    competitors: data.competitors.map((c) => c.trim()).filter(Boolean),
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

  const teaser: MicroAuditTeaser = {
    productName: extracted.productName.trim(),
    category: extracted.category.trim(),
    audience: extracted.audience.trim(),
    url: normalizedUrl,
  };

  const dna = mapTeaserToProductDNA(extracted, normalizedUrl);

  return {
    teaser,
    dna,
    competitors: dna.competitors,
    previewLeads: buildPreviewLeads(teaser, dna.keywords),
  };
}
