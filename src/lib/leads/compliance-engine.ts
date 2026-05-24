import { z } from "zod";

import type { Platform } from "@/lib/signalflow-types";
import { supabaseServer } from "@/lib/supabase-server";

import {
  extractSubredditFromUrl,
  normalizePlatform,
} from "./source-context";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const OPENAI_MINI = "gpt-4o-mini";
const MAX_SCRAPE_CHARS = 14_000;

type PlatformRulesRow = {
  community_key: string;
  platform: string;
  compliance_flags: unknown;
  last_scraped_at: string;
};

export type CommunityKeyResolution = {
  communityKey: string;
  platform: Platform;
};

export function resolveCommunityKey(
  sourceUrl: string,
  platform: string | null
): CommunityKeyResolution {
  const url = sourceUrl.trim();
  const resolved = normalizePlatform(platform, url);

  if (resolved === "reddit") {
    const sub = extractSubredditFromUrl(url);
    if (sub) {
      return { communityKey: `r/${sub}`, platform: "reddit" };
    }
    return { communityKey: "r/_global", platform: "reddit" };
  }

  if (resolved === "hackernews") {
    return { communityKey: "global_hn", platform: "hackernews" };
  }

  if (resolved === "x") {
    return { communityKey: "global_x", platform: "x" };
  }

  if (resolved === "indiehackers") {
    return { communityKey: "global_indiehackers", platform: "indiehackers" };
  }

  if (resolved === "producthunt") {
    return { communityKey: "global_producthunt", platform: "producthunt" };
  }

  return { communityKey: "global_unknown", platform: resolved };
}

export function getDefaultComplianceFlags(platform: Platform): string[] {
  switch (platform) {
    case "reddit":
      return [
        "Write as a genuine community member, not a brand or marketer.",
        "Do not include raw URLs or promotional links in replies.",
        "Avoid loud marketing language, hype, or salesy phrasing.",
        "Keep tone helpful, understated, and peer-to-peer.",
      ];
    case "hackernews":
      return [
        "Use an intellectual, objective, data-backed voice.",
        "Avoid sales jargon, hype, and unsolicited product pitches.",
        "Prefer concrete observations, tradeoffs, and honest technical perspective.",
      ];
    case "x":
      return [
        "Stay highly concise — fit tight character constraints.",
        "Use punchy, fragmented conversational hooks.",
        "Avoid corporate tone; sound like a real person on the timeline.",
      ];
    case "indiehackers":
      return [
        "Write as a builder sharing honest lessons, not a vendor pitching.",
        "Avoid hype and generic startup platitudes.",
        "Keep tone peer-to-peer with other founders.",
      ];
    case "producthunt":
      return [
        "Sound like a maker commenting on a launch thread, not marketing.",
        "No hard sells or feature dumps in replies.",
        "Be concise and specific about the problem space.",
      ];
    default:
      return [
        "Match the native tone of the source community.",
        "No corporate greetings, sign-offs, or bullet-point marketing lists.",
      ];
  }
}

function isCacheFresh(lastScrapedAt: string): boolean {
  const scraped = new Date(lastScrapedAt).getTime();
  if (Number.isNaN(scraped)) return false;
  return Date.now() - scraped < CACHE_TTL_MS;
}

function parseComplianceFlags(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((item): item is string => typeof item === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function buildJinaScrapeTarget(communityKey: string): string | null {
  if (communityKey.startsWith("r/")) {
    const sub = communityKey.slice(2);
    if (!sub || sub === "_global") {
      return "https://www.reddit.com/r/startups/about/rules";
    }
    return `https://www.reddit.com/${communityKey}/about/rules`;
  }

  if (communityKey === "global_hn") {
    return "https://news.ycombinator.com/newsguidelines.html";
  }

  if (communityKey === "global_x") {
    return "https://help.x.com/en/rules-and-policies/x-rules";
  }

  if (communityKey === "global_indiehackers") {
    return "https://www.indiehackers.com/";
  }

  if (communityKey === "global_producthunt") {
    return "https://www.producthunt.com/";
  }

  return null;
}

async function scrapeWithJina(targetUrl: string): Promise<string> {
  const jinaKey = process.env.JINA_API_KEY;
  if (!jinaKey) {
    throw new Error("JINA_API_KEY is not configured");
  }

  const jinaUrl = `https://r.jina.ai/${targetUrl}`;

  const response = await fetch(jinaUrl, {
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
    throw new Error("Jina returned empty content");
  }

  return text.length > MAX_SCRAPE_CHARS
    ? `${text.slice(0, MAX_SCRAPE_CHARS)}\n\n[Truncated…]`
    : text;
}

const extractedFlagsSchema = z.union([
  z.array(z.string()),
  z.object({ flags: z.array(z.string()) }),
  z.object({ compliance_flags: z.array(z.string()) }),
]);

function sanitizeOpenAiJsonResponse(rawResponse: string): string {
  let cleanJsonString = rawResponse.trim();

  if (cleanJsonString.startsWith("```json")) {
    cleanJsonString = cleanJsonString
      .replace(/^```json/, "")
      .replace(/```$/, "")
      .trim();
  } else if (cleanJsonString.startsWith("```")) {
    cleanJsonString = cleanJsonString
      .replace(/^```/, "")
      .replace(/```$/, "")
      .trim();
  }

  return cleanJsonString;
}

async function extractComplianceFlagsWithOpenAI(
  markdown: string,
  communityKey: string
): Promise<string[]> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

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
        {
          role: "system",
          content:
            'Extract only the absolute core formatting constraints, posting boundaries, and moderation rules against self-promotion or links from community guidelines text. Respond with JSON only: { "flags": string[] } where each flag is one concise rule sentence. No markdown code fences.',
        },
        {
          role: "user",
          content: `Community: ${communityKey}\n\nGuidelines text:\n---\n${markdown.slice(0, 12000)}\n---`,
        },
      ],
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`OpenAI extraction returned ${response.status}: ${detail}`);
  }

  const completion = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = completion.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI returned empty extraction");
  }

  const cleanJsonString = sanitizeOpenAiJsonResponse(content);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanJsonString) as unknown;
  } catch {
    throw new Error("OpenAI returned invalid extraction JSON");
  }

  const validated = extractedFlagsSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("OpenAI extraction JSON shape invalid");
  }

  const data = validated.data;
  const flags = Array.isArray(data)
    ? data
    : "flags" in data
      ? data.flags
      : data.compliance_flags;

  const cleaned = flags.map((s) => s.trim()).filter(Boolean).slice(0, 12);
  if (cleaned.length === 0) {
    throw new Error("OpenAI extraction produced no flags");
  }

  return cleaned;
}

async function upsertPlatformRules(params: {
  communityKey: string;
  platform: Platform;
  flags: string[];
}): Promise<void> {
  const { error } = await supabaseServer.from("platform_rules").upsert(
    {
      community_key: params.communityKey,
      platform: params.platform,
      compliance_flags: params.flags,
      last_scraped_at: new Date().toISOString(),
    },
    { onConflict: "community_key" }
  );

  if (error) {
    throw new Error(`platform_rules upsert failed: ${error.message}`);
  }
}

export function buildCommunityComplianceProtocolBlock(
  flags: string[]
): string {
  const bullets = flags.map((f) => `- ${f}`).join("\n");
  return `COMMUNITY COMPLIANCE PROTOCOLS: You must strictly adhere to the following community posting constraints:\n${bullets}`;
}

/**
 * Lazy-load community rules from `platform_rules` cache or Jina + OpenAI scrape.
 */
export async function fetchAndCacheCommunityRules(
  sourceUrl: string,
  platform: string | null
): Promise<string[]> {
  const { communityKey, platform: resolvedPlatform } = resolveCommunityKey(
    sourceUrl,
    platform
  );

  const { data, error } = await supabaseServer
    .from("platform_rules")
    .select("community_key, platform, compliance_flags, last_scraped_at")
    .eq("community_key", communityKey)
    .maybeSingle();

  if (error) {
    throw new Error(`platform_rules lookup failed: ${error.message}`);
  }

  const row = data as PlatformRulesRow | null;

  if (row && isCacheFresh(row.last_scraped_at)) {
    const cached = parseComplianceFlags(row.compliance_flags);
    if (cached.length > 0) {
      return cached;
    }
  }

  const scrapeTarget = buildJinaScrapeTarget(communityKey);
  if (!scrapeTarget) {
    return getDefaultComplianceFlags(resolvedPlatform);
  }

  const markdown = await scrapeWithJina(scrapeTarget);
  const flags = await extractComplianceFlagsWithOpenAI(markdown, communityKey);
  await upsertPlatformRules({
    communityKey,
    platform: resolvedPlatform,
    flags,
  });

  return flags;
}
