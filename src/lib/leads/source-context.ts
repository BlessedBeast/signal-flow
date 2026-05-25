import type { ConversationTurn, Platform } from "@/lib/signalflow-types";

export type SourceCommunityContext = {
  platform: Platform;
  subreddit: string | null;
  sourceUrl: string;
  operatorTurnCount: number;
};

export function normalizePlatform(
  platform: string | null,
  sourceUrl: string
): Platform {
  const url = sourceUrl.toLowerCase();
  if (url.includes("reddit.com")) return "reddit";
  if (url.includes("twitter.com") || url.includes("x.com")) return "x";
  if (url.includes("news.ycombinator.com") || url.includes("ycombinator.com")) {
    return "hackernews";
  }
  if (url.includes("indiehackers.com")) return "indiehackers";
  if (url.includes("producthunt.com")) return "producthunt";
  const p = String(platform ?? "").toLowerCase();
  if (
    p === "reddit" ||
    p === "x" ||
    p === "hackernews" ||
    p === "indiehackers" ||
    p === "producthunt"
  ) {
    return p;
  }
  return "reddit";
}

export function extractSubredditFromUrl(sourceUrl: string): string | null {
  try {
    const parsed = new URL(sourceUrl);
    if (!parsed.hostname.includes("reddit.com")) return null;
    const match = parsed.pathname.match(/\/r\/([^/]+)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function countOperatorTurns(history: ConversationTurn[]): number {
  return history.filter((t) => t.role === "user").length;
}

export function buildSourceCommunityContext(params: {
  sourceUrl: string;
  platform: string | null;
  conversationHistory: ConversationTurn[];
}): SourceCommunityContext {
  const sourceUrl = params.sourceUrl.trim();
  const platform = normalizePlatform(params.platform, sourceUrl);

  return {
    platform,
    subreddit: extractSubredditFromUrl(sourceUrl),
    sourceUrl,
    operatorTurnCount: countOperatorTurns(params.conversationHistory),
  };
}

/** Strict community formatting matrix keyed by `lead.platform`. */
export function buildPlatformCommunityGuidelinesBlock(platform: Platform): string {
  switch (platform) {
    case "reddit":
      return `PLATFORM MATRIX — REDDIT (mandatory):
- Persona: ultra-casual, helpful peer. You are a fellow builder in the thread, not a brand account.
- Opening: lead with direct assistance, a concrete tip, or shared pain context tied to their post.
- Voice: understated, peer-to-peer, subreddit-native. No hype, no corporate polish, no sales deck energy.
- Link rule: if conversation depth authorizes a product mention, place ONE optional reference link only at the very bottom as a casual aside (e.g. "fwiw we ship something similar here if useful"). Never open with a link. Never pitch aggressively.
- Banned: marketing idioms, bold text, bullet lists, sign-offs, "hope this helps" closers.`;

    case "hackernews":
      return `PLATFORM MATRIX — HACKER NEWS (mandatory):
- Persona: objective, analytical engineer. Write like a technical comment on an HN thread.
- Tone: engineering-focused, data- and mechanics-first. Discuss tradeoffs, constraints, and business logic frameworks.
- STRICT BANS: zero emojis, zero exclamation marks, zero shallow marketing praise, zero hype adjectives, zero "game-changing" language.
- Structure: tight prose, no fluff. Prefer observable facts, implementation detail, and honest skepticism over persuasion.
- Link rule: only when conversation depth explicitly allows — frame as a neutral tool mention, never a CTA.`;

    case "x":
      return `PLATFORM MATRIX — X / TWITTER (mandatory):
- Length: strictly one sentence OR two short sentences maximum. No paragraphs.
- Voice: raw lowercase, text shortcuts (idk, tbh, imo), high-velocity conversational hooks.
- Format: punchy, timeline-native micro-burst. Hook in the first few words.
- Banned: corporate tone, multi-line blocks, bullet points, formal greetings, exclamation spam.
- Link rule: at most one bare URL only if depth allows — keep it inline and low-key.`;

    case "indiehackers":
      return `PLATFORM MATRIX — INDIE HACKERS (mandatory):
- Persona: founder peer sharing lived experience. Helpful, transparent, builder-to-builder.
- Avoid hard sells; lead with tactical insight. Soft product mention only when depth allows.`;

    case "producthunt":
      return `PLATFORM MATRIX — PRODUCT HUNT (mandatory):
- Persona: helpful maker in a product discussion. Concise, friendly, community-first.
- No aggressive pitching. Value-first framing; optional product mention only when depth allows.`;

    default:
      return `PLATFORM MATRIX — COMMUNITY (mandatory):
- Match native thread tone. No corporate greetings, sign-offs, or bullet-point marketing lists.`;
  }
}

export function buildPlatformComplianceBlock(ctx: SourceCommunityContext): string {
  const subLine =
    ctx.platform === "reddit" && ctx.subreddit
      ? `\n- Target subreddit: r/${ctx.subreddit}`
      : "";

  return `${buildPlatformCommunityGuidelinesBlock(ctx.platform)}${subLine}

GLOBAL COMMUNITY GUARDRAILS:
- Obey conversation depth rules below before any product link or CTA.
- Never sound like an AI assistant, marketer, or support bot.`;
}

export function buildConversationalDepthBlock(operatorTurnCount: number): string {
  if (operatorTurnCount === 0) {
    return `CONVERSATION DEPTH (Turn 0 — initial outreach):
- Provide pure value and validate their pain point empathetically.
- Do NOT drop promotional app links or product pitches.
- Establish credibility as a helpful peer only.`;
  }

  if (operatorTurnCount >= 1 && operatorTurnCount <= 3) {
    return `CONVERSATION DEPTH (Turn ${operatorTurnCount} — active nurture):
- Reinforce value delivered so far; answer follow-up questions in context.
- Suggest simple workarounds or tactical tips — still no hard sell.
- Stay in community-compliant voice; deepen trust gradually.`;
  }

  return `CONVERSATION DEPTH (Turn ${operatorTurnCount} — authorized close):
- You may use a soft call-to-action: suggest checking out the tool or moving to DM.
- Keep tone casual and low-pressure — never a corporate close.
- Reference prior thread context so the close feels earned, not spammy.`;
}
