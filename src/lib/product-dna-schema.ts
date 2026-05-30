import { z } from "zod";

import {
  resolveActiveSerperQueryLimit,
  type SubscriptionTierId,
} from "@/lib/billing/tiers";
import type { Platform, ProductDNA } from "@/lib/signalflow-types";
import { DEFAULT_SERPER_QUERIES } from "@/lib/signalflow-types";

const PLATFORMS = [
  "reddit",
  "x",
  "hackernews",
  "indiehackers",
  "producthunt",
] as const;

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function coercePlatforms(value: unknown): Platform[] {
  const raw = coerceStringArray(value);
  const map: Record<string, Platform> = {
    reddit: "reddit",
    x: "x",
    twitter: "x",
    hackernews: "hackernews",
    hn: "hackernews",
    "hacker news": "hackernews",
    indiehackers: "indiehackers",
    ih: "indiehackers",
    "indie hackers": "indiehackers",
    producthunt: "producthunt",
    ph: "producthunt",
    "product hunt": "producthunt",
  };
  const out = new Set<Platform>();
  for (const item of raw) {
    const platform = map[item.toLowerCase()];
    if (platform) out.add(platform);
  }
  if (out.size === 0) {
    return ["reddit", "hackernews", "indiehackers", "producthunt"];
  }
  return [...out];
}

function createClientDnaSchema(maxSerperQueries: number) {
  return z.object({
    productName: z.string().min(1),
    url: z.string().min(1),
    oneLiner: z.string().min(1),
    audience: z.string().default(""),
    painPoints: z.array(z.string()).default([]),
    targetPlatforms: z
      .array(z.enum(PLATFORMS))
      .min(1)
      .default(["reddit", "x", "hackernews"]),
    activeSerperQueries: z
      .array(z.string())
      .min(1)
      .max(maxSerperQueries, {
        message: `Maximum of ${maxSerperQueries} active lead tracking quer${maxSerperQueries === 1 ? "y" : "ies"} allowed on your plan.`,
      }),
    competitors: z
      .array(z.string())
      .max(3, { message: "Maximum of 3 tracking competitors allowed." })
      .optional()
      .default([]),
    keywords: z.preprocess(
      (val) => coerceStringArray(val).slice(0, 3),
      z.array(z.string()).optional().default([])
    ),
  });
}

/** Aligns client draft payloads with vault API expectations before POST. */
export function normalizeVaultDnaPayload(
  dna: ProductDNA,
  tier: SubscriptionTierId = "free"
): ProductDNA {
  const queryCap = resolveActiveSerperQueryLimit(tier);
  const serper = coerceStringArray(dna.activeSerperQueries).slice(0, queryCap);
  return {
    productName: dna.productName.trim(),
    url: dna.url.trim(),
    oneLiner: dna.oneLiner.trim(),
    audience: typeof dna.audience === "string" ? dna.audience.trim() : "",
    painPoints: coerceStringArray(dna.painPoints),
    targetPlatforms: coercePlatforms(dna.targetPlatforms),
    activeSerperQueries:
      serper.length > 0 ? serper : [...DEFAULT_SERPER_QUERIES].slice(0, queryCap),
    competitors: coerceStringArray(dna.competitors),
    keywords: coerceStringArray(dna.keywords).slice(0, 3),
  };
}

function preprocessVaultDnaInput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return raw;
  }

  const input = raw as Record<string, unknown>;

  return {
    productName: input.productName,
    url: input.url,
    oneLiner: input.oneLiner,
    audience: input.audience ?? "",
    painPoints: input.painPoints ?? [],
    targetPlatforms: input.targetPlatforms ?? ["reddit", "x", "hackernews"],
    activeSerperQueries: input.activeSerperQueries ?? [...DEFAULT_SERPER_QUERIES],
    competitors: input.competitors ?? [],
    keywords: input.keywords ?? [],
  };
}

export function parseClientProductDna(
  raw: unknown,
  tier: SubscriptionTierId = "free"
): ProductDNA {
  const maxSerperQueries = resolveActiveSerperQueryLimit(tier);
  const prepped = preprocessVaultDnaInput(raw);
  const parsed = createClientDnaSchema(maxSerperQueries).safeParse(prepped);
  if (!parsed.success) {
    throw new Error(
      `Invalid product DNA payload: ${parsed.error.issues
        .map((issue) => issue.message)
        .join("; ")}`
    );
  }

  return normalizeVaultDnaPayload(parsed.data, tier);
}

export function safeParseProductDna(raw: unknown): ProductDNA | null {
  const prepped = preprocessVaultDnaInput(raw);
  const parsed = createClientDnaSchema(10).safeParse(prepped);
  return parsed.success ? parsed.data : null;
}
