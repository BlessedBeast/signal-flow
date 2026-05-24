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
  const p = String(platform ?? "").toLowerCase();
  if (p === "reddit" || p === "x" || p === "hackernews") return p;
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

export function buildPlatformComplianceBlock(ctx: SourceCommunityContext): string {
  const lines: string[] = ["PLATFORM COMPLIANCE RULES (mandatory):"];

  if (ctx.platform === "reddit") {
    const sub = ctx.subreddit ? `r/${ctx.subreddit}` : "this subreddit";
    lines.push(
      `- Community: Reddit (${sub}). Write as a genuine community member — never as a brand account.`,
      "- Do NOT include raw URLs or promotional links in the reply.",
      "- Avoid loud marketing language, hype, or salesy phrasing.",
      "- Match subreddit norms: helpful, understated, peer-to-peer tone."
    );
  } else if (ctx.platform === "hackernews") {
    lines.push(
      "- Community: Hacker News. Use an intellectual, objective, data-backed voice.",
      "- Zero sales jargon, zero hype, zero call-to-action unless turn depth explicitly allows.",
      "- Prefer concrete observations, tradeoffs, and honest technical perspective."
    );
  } else if (ctx.platform === "x") {
    lines.push(
      "- Community: X (Twitter). Be highly concise and punchy — fit tight character constraints.",
      "- Hook fast. No paragraphs. Fragmented, conversational micro-bursts only.",
      "- Avoid corporate tone; sound like a real person scrolling the timeline."
    );
  } else {
    lines.push(
      "- Match the native community tone of the source thread.",
      "- No corporate greetings, sign-offs, or bullet-point marketing lists."
    );
  }

  return lines.join("\n");
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
