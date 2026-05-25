import type { Platform } from "@/lib/signalflow-types";

export const SERPER_RESULTS_PER_QUERY = 10;

export type SerperTimeRange = "week" | "month";

export type SerperFetchOptions = {
  timeRange?: SerperTimeRange;
  /** When false, skip stale-year snippet filtering (historical pass). */
  filterStaleYears?: boolean;
};

export type SerperCandidate = {
  link: string;
  title: string;
  snippet: string;
  platform: Platform;
  query: string;
};

const SERPER_TBS: Record<SerperTimeRange, string> = {
  week: "qdr:w",
  month: "qdr:m",
};

/** Assign platform from result URL; defaults to reddit for unknown hosts. */
export function detectPlatformFromUrl(link: string): Platform {
  try {
    const href = link.toLowerCase();
    const host = new URL(link).hostname.toLowerCase();

    if (href.includes("news.ycombinator.com")) {
      return "hackernews";
    }
    if (host.includes("indiehackers.com")) {
      return "indiehackers";
    }
    if (host.includes("producthunt.com")) {
      return "producthunt";
    }
    if (host.includes("reddit.com")) {
      return "reddit";
    }
    if (host.includes("twitter.com") || host.includes("x.com")) {
      return "x";
    }
    if (host.includes("ycombinator.com")) {
      return "hackernews";
    }
  } catch {
    return "reddit";
  }

  return "reddit";
}

/** Skip archived threads that surface stale year markers in Serper snippets. */
export function snippetContainsStaleYear(text: string): boolean {
  return /\b2022\b|\b2023\b|\b2024\b/.test(text);
}

export async function fetchSerperQuery(
  query: string,
  options?: SerperFetchOptions
): Promise<SerperCandidate[]> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error("SERPER_API_KEY is not configured");
  }

  const timeRange = options?.timeRange ?? "week";
  const filterStaleYears = options?.filterStaleYears ?? true;

  let response: Response;
  try {
    response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: SERPER_RESULTS_PER_QUERY,
        tbs: SERPER_TBS[timeRange],
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : "Serper request failed";
    throw new Error(`Serper fetch failed: ${msg}`);
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Serper returned ${response.status}: ${detail}`);
  }

  const json = (await response.json()) as {
    organic?: { link?: string; title?: string; snippet?: string }[];
  };

  const organic = json.organic ?? [];
  const candidates: SerperCandidate[] = [];

  for (const item of organic) {
    const link = item.link?.trim();
    if (!link) continue;

    const title = item.title?.trim() || "Untitled thread";
    const snippet = item.snippet?.trim() || "";
    const combinedText = `${title} ${snippet}`;

    if (filterStaleYears && snippetContainsStaleYear(combinedText)) {
      continue;
    }

    const platform = detectPlatformFromUrl(link);
    candidates.push({
      link,
      title,
      snippet,
      platform,
      query,
    });
  }

  return candidates;
}

export async function fetchAllSerperCandidates(
  queries: string[],
  options?: SerperFetchOptions
): Promise<SerperCandidate[]> {
  const batch = queries.slice(0, 5);
  const settled = await Promise.allSettled(
    batch.map((q) => fetchSerperQuery(q, options))
  );

  const merged: SerperCandidate[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      merged.push(...result.value);
    } else {
      console.error("[search-pipeline] Serper query failed:", result.reason);
    }
  }
  return merged;
}
