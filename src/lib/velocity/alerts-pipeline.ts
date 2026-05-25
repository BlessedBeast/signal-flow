import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { intentTierFromScore } from "@/lib/mining/hunt-pipeline";
import { safeParseProductDna } from "@/lib/product-dna-schema";
import type { IntentTier, Platform, ProductDNA } from "@/lib/signalflow-types";

const OPENAI_MODEL = "gpt-4o";

export type PlugAlertEngagement = {
  likes: number;
  shares: number;
  comments: number;
  minutesSincePost: number;
};

export type PlugAlert = {
  id: string;
  platform: Platform;
  postSnippet: string;
  velocityScore: number;
  tier: IntentTier;
  statusIndicator: string;
  plugText: string | null;
  engagement: PlugAlertEngagement;
  trackedUrl: string;
  source_url: string;
  author: string;
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

type SimulatedPost = {
  id: string;
  platform: Platform;
  postSnippet: string;
  engagement: PlugAlertEngagement;
  recentWindowLikes: number;
  recentWindowComments: number;
};

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index * 9999) * 10000;
  return x - Math.floor(x);
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

function buildAlertSourceUrl(platform: Platform, alertId: string): string {
  const slug = alertId.replace(/^alert-/, "thread");
  switch (platform) {
    case "reddit":
      return `https://www.reddit.com/r/SaaS/comments/${slug}/plug_radar`;
    case "x":
      return `https://x.com/i/status/${slug}`;
    case "hackernews":
      return `https://news.ycombinator.com/item?id=${slug}`;
    case "indiehackers":
      return `https://www.indiehackers.com/post/${slug}`;
    case "producthunt":
      return `https://www.producthunt.com/posts/${slug}`;
    default:
      return `https://signalflow.app/plug-radar/${slug}`;
  }
}

function buildStatusIndicator(tier: IntentTier, score: number): string {
  switch (tier) {
    case "HOT":
      return "Peak Velocity Reached — Deploy Link";
    case "WARM":
      return score >= 55
        ? "Momentum Surging — Link Window Opening"
        : "Click to open workspace and forge custom stealth reply";
    case "COLD":
      return "Click to open workspace and forge custom stealth reply";
  }
}

export function calculateVelocityScore(
  engagement: PlugAlertEngagement,
  recentWindow?: { likes: number; comments: number }
): number {
  const { likes, shares, comments, minutesSincePost } = engagement;
  const elapsed = Math.max(minutesSincePost, 1);

  const totalEngagement = likes + shares * 2.5 + comments * 3;
  const rate = totalEngagement / elapsed;
  const rateScore = Math.min(60, Math.log10(rate + 1) * 25);

  const recentLikes = recentWindow?.likes ?? likes * 0.35;
  const recentComments = recentWindow?.comments ?? comments * 0.4;
  const recentBurst = recentLikes + recentComments * 3;
  const baseline = totalEngagement / Math.max(elapsed / 15, 1);
  const acceleration =
    recentBurst > baseline
      ? Math.min(25, (recentBurst / Math.max(baseline, 1)) * 8)
      : 0;

  const recencyBonus =
    elapsed <= 90 && rate > 0.4 ? Math.min(15, (90 - elapsed) / 6) : 0;

  return Math.min(100, Math.round(rateScore + acceleration + recencyBonus));
}

function pickPlatforms(dna: ProductDNA): Platform[] {
  const platforms =
    dna.targetPlatforms.length > 0 ? dna.targetPlatforms : (["x", "reddit"] as Platform[]);
  return platforms.slice(0, 3);
}

function buildSimulatedPosts(dna: ProductDNA, userId: string): SimulatedPost[] {
  const seed = hashSeed(`${userId}:${dna.productName}:${dna.url}`);
  const platforms = pickPlatforms(dna);
  const keyword = dna.keywords[0] ?? dna.productName.toLowerCase();
  const pain = dna.painPoints[0] ?? "finding the right tool";
  const competitor = dna.competitors[0] ?? "the usual suspects";

  const templates: { platform: Platform; snippet: string }[] = [
    {
      platform: platforms[0] ?? "x",
      snippet: `anyone else struggling with ${pain}? tried a few things but nothing sticks. curious what solo founders are actually using for ${keyword} rn`,
    },
    {
      platform: platforms[1] ?? platforms[0] ?? "reddit",
      snippet: `hot take: most ${keyword} tools are overbuilt. i just want something dead simple that surfaces intent without another dashboard. what am i missing`,
    },
    {
      platform: platforms[2] ?? platforms[0] ?? "hackernews",
      snippet: `Ask HN: alternatives to ${competitor} for a tiny team? we outgrew spreadsheets but dont need enterprise bloat. ${keyword} use case`,
    },
    {
      platform: platforms[0] ?? "x",
      snippet: `posted about our launch 47 min ago. engagement feels weirdly high for zero links in the thread. when do you drop the url without killing reach`,
    },
    {
      platform: platforms[1] ?? "reddit",
      snippet: `weekly thread: what are you building? im working on something around ${keyword}. not pitching yet just looking for honest feedback on ${pain}`,
    },
    {
      platform: platforms[0] ?? "indiehackers",
      snippet: `update: hit 200 impressions in an hour on a text-only post. no link, no CTA. feels like the algo reward window before external urls get suppressed`,
    },
  ];

  return templates.map((template, index) => {
    const rand = (offset: number) => seededRandom(seed, index * 10 + offset);
    const minutesSincePost = Math.round(8 + rand(1) * 180);
    const likes = Math.round(12 + rand(2) * 420 * (index === 3 || index === 5 ? 2.2 : 1));
    const shares = Math.round(2 + rand(3) * 85 * (index === 3 ? 1.8 : 1));
    const comments = Math.round(3 + rand(4) * 95 * (index === 0 || index === 3 ? 1.6 : 1));

    const recentWindowLikes = Math.round(likes * (0.25 + rand(5) * 0.55));
    const recentWindowComments = Math.round(comments * (0.2 + rand(6) * 0.5));

    return {
      id: `alert-${seed}-${index}`,
      platform: template.platform,
      postSnippet: template.snippet,
      engagement: { likes, shares, comments, minutesSincePost },
      recentWindowLikes,
      recentWindowComments,
    };
  });
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
  postSnippet: string;
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
${params.postSnippet}

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
  const hotAlerts = alerts.filter((alert) => alert.tier === "HOT");
  if (hotAlerts.length === 0) return alerts;

  const plugTexts = await Promise.all(
    hotAlerts.map((alert) =>
      generatePlugText({
        dna,
        postSnippet: alert.postSnippet,
        platform: alert.platform,
      })
    )
  );

  const plugById = new Map(
    hotAlerts.map((alert, index) => [alert.id, plugTexts[index] ?? null])
  );

  return alerts.map((alert) =>
    alert.tier === "HOT"
      ? { ...alert, plugText: plugById.get(alert.id) ?? null }
      : alert
  );
}

export async function executePlugAlertsScan(
  userId: string,
  supabase: SupabaseClient
): Promise<PlugAlertsResult> {
  const dna = await loadRequiredProductDna(supabase, userId);
  const simulated = buildSimulatedPosts(dna, userId);

  const alerts: PlugAlert[] = simulated.map((post) => {
    const velocityScore = calculateVelocityScore(post.engagement, {
      likes: post.recentWindowLikes,
      comments: post.recentWindowComments,
    });
    const tier = intentTierFromScore(velocityScore);

    return {
      id: post.id,
      platform: post.platform,
      postSnippet: post.postSnippet,
      velocityScore,
      tier,
      statusIndicator: buildStatusIndicator(tier, velocityScore),
      plugText: null,
      engagement: post.engagement,
      trackedUrl: dna.url,
      source_url: buildAlertSourceUrl(post.platform, post.id),
      author: authorFromPlatform(post.platform),
    };
  });

  alerts.sort((a, b) => b.velocityScore - a.velocityScore);

  const enriched = await enrichHotAlerts(alerts, dna);

  return {
    alerts: enriched,
    scannedAt: new Date().toISOString(),
    productName: dna.productName,
    productUrl: dna.url,
  };
}
