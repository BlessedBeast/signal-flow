import { z } from "zod";

import { fetchUserSubscriptionTier } from "@/lib/billing/user-billing";
import {
  reflectionTaskPromptLine,
  resolveDailyReflectionTaskLimit,
  type SubscriptionTierId,
} from "@/lib/billing/tiers";
import {
  fetchCoreFrameworkCatalog,
  fetchUserBlueprint,
} from "@/lib/onboard/blueprint-engine";
import { buildMasterBlueprintPromptBlock } from "@/lib/onboard/blueprint-utils";
import type { UserBlueprint } from "@/lib/onboard/blueprint-types";
import type { CoreFrameworkRow } from "@/lib/onboard/blueprint-types";
import { DISCOVERY_LEADS_TABLE } from "@/lib/discovery/constants";
import { safeParseProductDna } from "@/lib/product-dna-schema";
import { PLUG_ALERTS_TABLE } from "@/lib/velocity/alerts-pipeline";
import type { Platform, ProductDNA } from "@/lib/signalflow-types";
import { parsePlatform } from "@/lib/signalflow-types";
import { supabaseServer } from "@/lib/supabase-server";

const OPENAI_MODEL = "gpt-4o";
const TASK_HISTORY_LIMIT = 5;
const LIVE_STREAM_LIMIT = 5;
const CONTENT_MODES = ["plug", "hype", "deflect"] as const;

const reflectionTaskSchema = z.object({
  action_type: z.enum(CONTENT_MODES),
  target_community: z.string().min(1),
  instruction_to_user: z.string().min(1),
  draft_text: z.string().min(1),
  media_directives: z.array(z.string().min(1)).min(1).max(2),
});

function createReflectionTasksSchema(taskCount: number) {
  return z.array(reflectionTaskSchema).length(taskCount);
}

export type ReflectionTask = z.infer<typeof reflectionTaskSchema>;

export type ReflectionUserResult = {
  userId: string;
  ok: boolean;
  inserted?: number;
  error?: string;
};

export type ReflectionCronResult = {
  processed: number;
  results: ReflectionUserResult[];
};

type TaskHistoryRow = {
  instruction_to_user: string | null;
  task_status: string | null;
  action_type: string | null;
};

type LiveScraperLead = {
  source: "discovery_leads" | "plug_alerts";
  platform: Platform;
  threadTitle: string;
  subreddit: string | null;
  source_url: string;
  score: number;
  tierLabel: string;
};

type DiscoveryLeadStreamRow = {
  platform: string | null;
  source_url: string;
  content: string | null;
  intent_score: number | null;
  status: string;
};

type PlugAlertStreamRow = {
  platform: string;
  source_url: string;
  subreddit: string | null;
  post_snippet: string;
  content: string;
  velocity_score: number | string | null;
  velocity_tier: string | null;
};

function sanitizeOpenAiJsonResponse(rawResponse: string): string {
  let clean = rawResponse.trim();

  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
  }

  return clean;
}

function buildProductDnaBlock(dna: ProductDNA): string {
  const painPoints =
    dna.painPoints.length > 0
      ? dna.painPoints.map((p) => `- ${p}`).join("\n")
      : "- (none listed)";

  return `APP DNA (authoritative):
- productName: ${dna.productName}
- url: ${dna.url}
- oneLiner: ${dna.oneLiner}
- audience: ${dna.audience}
- painPoints:
${painPoints}
- keywords: ${dna.keywords.length > 0 ? dna.keywords.join(", ") : "(none)"}
- targetPlatforms: ${dna.targetPlatforms.join(", ")}
- competitors: ${dna.competitors.length > 0 ? dna.competitors.join(", ") : "(none)"}`;
}

function buildFrameworksBlock(frameworks: Record<string, unknown>[]): string {
  if (frameworks.length === 0) {
    return "(no core frameworks loaded)";
  }

  return frameworks
    .map((row, index) => {
      const label =
        typeof row.name === "string"
          ? row.name
          : typeof row.title === "string"
            ? row.title
            : `Framework ${index + 1}`;
      return `[${index + 1}] ${label}`;
    })
    .join("\n");
}

function extractSubredditFromUrl(sourceUrl: string): string | null {
  try {
    const match = sourceUrl.match(/reddit\.com\/r\/([^/]+)/i);
    return match?.[1] ? `r/${match[1]}` : null;
  } catch {
    return null;
  }
}

function threadTitleFromText(text: string, max = 160): string {
  const line = text.replace(/\s+/g, " ").trim().split(/[.!?\n]/)[0]?.trim();
  const title = line || "Active thread";
  return title.length <= max ? title : `${title.slice(0, max)}…`;
}

function parseStreamScore(raw: number | string | null | undefined): number {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function mapDiscoveryLeadRow(row: DiscoveryLeadStreamRow): LiveScraperLead | null {
  const platform = parsePlatform(row.platform);
  const content = row.content?.trim() ?? "";
  if (!row.source_url?.trim()) return null;

  return {
    source: "discovery_leads",
    platform,
    threadTitle: threadTitleFromText(content || "Discovery lead thread"),
    subreddit: extractSubredditFromUrl(row.source_url),
    source_url: row.source_url.trim(),
    score: parseStreamScore(row.intent_score),
    tierLabel: `intent ${parseStreamScore(row.intent_score)} · ${row.status}`,
  };
}

function mapPlugAlertRow(row: PlugAlertStreamRow): LiveScraperLead | null {
  const platform = parsePlatform(row.platform);
  if (!row.source_url?.trim()) return null;

  const snippet = row.post_snippet?.trim() || row.content?.trim() || "";
  const tier =
    row.velocity_tier === "HOT" ||
    row.velocity_tier === "WARM" ||
    row.velocity_tier === "COLD"
      ? row.velocity_tier
      : "WARM";

  return {
    source: "plug_alerts",
    platform,
    threadTitle: threadTitleFromText(snippet || "Velocity radar thread"),
    subreddit: row.subreddit?.trim()
      ? row.subreddit.startsWith("r/")
        ? row.subreddit
        : `r/${row.subreddit}`
      : extractSubredditFromUrl(row.source_url),
    source_url: row.source_url.trim(),
    score: parseStreamScore(row.velocity_score),
    tierLabel: `${tier} · velocity ${parseStreamScore(row.velocity_score)}`,
  };
}

async function fetchLiveScraperStream(
  userId: string,
  targetPlatforms: Platform[]
): Promise<LiveScraperLead[]> {
  const platformSet = new Set<Platform>(targetPlatforms);

  const [leadsResult, alertsResult] = await Promise.all([
    supabaseServer
      .from(DISCOVERY_LEADS_TABLE)
      .select("platform, source_url, content, intent_score, status")
      .eq("user_id", userId)
      .in("status", ["active", "drafted"])
      .order("intent_score", { ascending: false })
      .limit(12),
    supabaseServer
      .from(PLUG_ALERTS_TABLE)
      .select(
        "platform, source_url, subreddit, post_snippet, content, velocity_score, velocity_tier"
      )
      .eq("user_id", userId)
      .order("velocity_score", { ascending: false })
      .limit(12),
  ]);

  if (leadsResult.error) {
    console.warn(
      `[REFLECTION] discovery_leads stream fetch failed: ${leadsResult.error.message}`
    );
  }
  if (alertsResult.error) {
    console.warn(
      `[REFLECTION] plug_alerts stream fetch failed: ${alertsResult.error.message}`
    );
  }

  const merged: LiveScraperLead[] = [];

  for (const row of (leadsResult.data ?? []) as DiscoveryLeadStreamRow[]) {
    const mapped = mapDiscoveryLeadRow(row);
    if (mapped && platformSet.has(mapped.platform)) {
      merged.push(mapped);
    }
  }

  for (const row of (alertsResult.data ?? []) as PlugAlertStreamRow[]) {
    const mapped = mapPlugAlertRow(row);
    if (mapped && platformSet.has(mapped.platform)) {
      merged.push(mapped);
    }
  }

  merged.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const deduped: LiveScraperLead[] = [];
  for (const lead of merged) {
    if (seen.has(lead.source_url)) continue;
    seen.add(lead.source_url);
    deduped.push(lead);
    if (deduped.length >= LIVE_STREAM_LIMIT) break;
  }

  return deduped;
}

function buildLiveStreamBlock(leads: LiveScraperLead[]): string {
  if (leads.length === 0) {
    return `LIVE SCRAPER DATA STREAM: (no active discovery_leads or plug_alerts yet for this workspace)

FALLBACK MODE (mandatory when stream is empty):
- Output 2 foundational, platform-building tasks only (e.g. optimize pinned X post, draft a short case-study asset, refine Reddit profile bio).
- Do NOT reference specific thread URLs.
- Do NOT use placeholders like [insert link here] or [paste URL].`;
  }

  const rows = leads
    .map((lead, index) => {
      const community =
        lead.subreddit ??
        (lead.platform === "hackernews"
          ? "Hacker News"
          : lead.platform === "x"
            ? "X"
            : lead.platform);
      return `[${index + 1}] ${lead.tierLabel} · ${lead.platform} · ${community}
Thread title: ${lead.threadTitle}
source_url: ${lead.source_url}
Table: ${lead.source}`;
    })
    .join("\n\n");

  return `LIVE SCRAPER DATA STREAM (${leads.length} rows — highest intent first, real URLs only):
${rows}`;
}

function buildHistorySummary(rows: TaskHistoryRow[]): string {
  if (rows.length === 0) {
    return "(no prior daily execution tasks — day one queue)";
  }

  return rows
    .map((row) => {
      const description =
        row.instruction_to_user?.trim() ||
        row.action_type?.trim() ||
        "Untitled task";
      const status = row.task_status?.trim() || "unknown";
      return `- Task: ${description} -> STATUS: ${status}`;
    })
    .join("\n");
}

function buildSystemPrompt(
  frameworks: Record<string, unknown>[],
  hasLiveStream: boolean,
  masterBlueprintBlock: string | null,
  personaContextBlock: string,
  taskCount: number,
  tier: SubscriptionTierId
): string {
  const taskInstruction = reflectionTaskPromptLine(tier);
  const blueprintSection = masterBlueprintBlock
    ? `\n\n${masterBlueprintBlock}\n`
    : "";

  return `You are a fractional CMO for indie SaaS founders running a Live Reflection Engine.

You receive: App DNA, the user's Master Strategy Blueprint (when present), internal growth playbooks (core frameworks), yesterday's execution history, and a live scraper data stream from discovery_leads and plug_alerts.
${blueprintSection}
FOUNDER PERSONA CONTEXT (mandatory):
${personaContextBlock}

PERSONA INJECTION RULE (mandatory):
- Adopt the specific background, tone, and historical details provided in this founder persona context.
- Integrate these facts seamlessly in each task draft.
- Do not invent generic backstories.

Your job: ${taskInstruction} Output exactly ${taskCount} fresh, logical marketing tasks for TODAY.

${
  masterBlueprintBlock
    ? "BLUEPRINT ALIGNMENT (mandatory): Daily tasks must execute ONLY within the chosen growth pillars and allowed channels in the Master Strategy Blueprint. Reject any channel or tactic that conflicts with the blueprint."
    : ""
}

LIVE LEAD RULES (mandatory):
- Do NOT output generic placeholders like [insert link here], [paste URL], or [link].
${
  hasLiveStream
    ? `- When live scraper rows are provided: pick the highest-intent thread(s) from that stream.
- Each task tied to a live thread MUST cite the exact source_url from the stream in instruction_to_user and weave that thread into ai_generated_draft.
- Write ai_generated_draft as a ready-to-post reply script tailored to that specific thread title and community — not a generic template.`
    : `- When the live stream is empty: produce foundational platform-building work only (pinned post, case study, bio refresh). No fake thread URLs.`
}

ADAPTATION RULES (mandatory):
- Read execution history before proposing work.
- If the user completed a heavy narrative post yesterday, shift today toward low-friction work: reply tracking, short comments, keyword analysis, or community listening.
- If they skipped high-effort tasks, downshift friction or change channel — do not repeat the same ask.
- Alternate action types and communities when possible.
- Tasks must be specific, executable in under 45 minutes each, and aligned with their App DNA platforms.

3-MODE CONTENT SELECTOR (mandatory):
- action_type must be exactly one of: plug, hype, deflect.
- plug: practical value-first comment that introduces product only when naturally relevant.
- hype: amplify signal by celebrating outcomes, social proof, or momentum.
- deflect: calm, credible reframing when objections or skepticism appear.

FOUNDATION PLAYBOOK LABELS (core_frameworks):
${buildFrameworksBlock(frameworks)}

OUTPUT FORMAT — raw JSON array only, no markdown fences, no wrapper object:
[
  {
    "action_type": "plug | hype | deflect",
    "target_community": "platform + community e.g. r/SaaS on Reddit",
    "instruction_to_user": "clear imperative instruction for the founder",
    "draft_text": "ready-to-use draft copy or bullet outline they can paste",
    "media_directives": ["required proof asset 1", "required proof asset 2"]
  }
]

NATIVE PROOF PROTOCOL (mandatory):
- Based on the framework's proof requirements, output 1-2 explicit directives for visual proof assets (screenshot, video, analytics chart).
- These assets are attached directly on the target platform by the founder.
- Never suggest uploading media inside this app.

Return exactly ${taskCount} objects in the array.`;
}

async function fetchTaskHistory(userId: string): Promise<TaskHistoryRow[]> {
  const { data, error } = await supabaseServer
    .from("daily_execution_tasks")
    .select("instruction_to_user, task_status, action_type")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(TASK_HISTORY_LIMIT);

  if (error) {
    throw new Error(`Task history fetch failed: ${error.message}`);
  }

  return (data ?? []) as TaskHistoryRow[];
}

async function fetchCoreFrameworks(): Promise<Record<string, unknown>[]> {
  const catalog = await fetchCoreFrameworkCatalog(supabaseServer);
  return catalog as unknown as Record<string, unknown>[];
}

async function loadMasterBlueprintContext(userId: string): Promise<{
  blueprint: UserBlueprint | null;
  catalog: CoreFrameworkRow[];
  promptBlock: string | null;
}> {
  const [blueprint, catalog] = await Promise.all([
    fetchUserBlueprint(userId, supabaseServer),
    fetchCoreFrameworkCatalog(supabaseServer),
  ]);

  const promptBlock = blueprint
    ? buildMasterBlueprintPromptBlock(blueprint, catalog)
    : null;

  return { blueprint, catalog, promptBlock };
}

async function generateTasksWithOpenAI(params: {
  dna: ProductDNA;
  frameworks: Record<string, unknown>[];
  historySummary: string;
  liveStreamBlock: string;
  hasLiveStream: boolean;
  masterBlueprintBlock: string | null;
  personaContextBlock: string;
  taskCount: number;
  tier: SubscriptionTierId;
}): Promise<ReflectionTask[]> {
  const { taskCount, tier } = params;
  const reflectionTasksSchema = createReflectionTasksSchema(taskCount);
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const userPrompt = `${buildProductDnaBlock(params.dna)}

${params.liveStreamBlock}

YESTERDAY / RECENT EXECUTION HISTORY (newest tasks first in list):
${params.historySummary}

${reflectionTaskPromptLine(tier)}`;

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
        temperature: 0.72,
        max_tokens: 1800,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(
              params.frameworks,
              params.hasLiveStream,
              params.masterBlueprintBlock,
              params.personaContextBlock,
              taskCount,
              tier
            ),
          },
          { role: "user", content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : "OpenAI request failed";
    throw new Error(`Reflection generation failed: ${msg}`);
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 400);
    throw new Error(`OpenAI returned ${response.status}: ${detail}`);
  }

  const completion = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const rawContent = completion.choices?.[0]?.message?.content?.trim();
  if (!rawContent) {
    throw new Error("OpenAI returned empty task content");
  }

  const cleaned = sanitizeOpenAiJsonResponse(rawContent);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(cleaned);
  } catch {
    throw new Error("OpenAI returned invalid JSON for reflection tasks");
  }

  if (
    parsedJson &&
    typeof parsedJson === "object" &&
    !Array.isArray(parsedJson)
  ) {
    const wrapper = parsedJson as Record<string, unknown>;
    if (Array.isArray(wrapper.tasks)) {
      parsedJson = wrapper.tasks;
    } else if (Array.isArray(wrapper.daily_execution_tasks)) {
      parsedJson = wrapper.daily_execution_tasks;
    }
  }

  const validated = reflectionTasksSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new Error(
      `OpenAI response did not match task schema: ${validated.error.message}`
    );
  }

  return validated.data;
}

async function insertReflectionTasks(
  userId: string,
  tasks: ReflectionTask[]
): Promise<number> {
  const rows = tasks.map((task) => ({
    user_id: userId,
    action_type: task.action_type.trim(),
    target_community: task.target_community.trim(),
    instruction_to_user: task.instruction_to_user.trim(),
    ai_generated_draft: `${task.draft_text.trim()}

⚠️ REQUIRED PROOF
${task.media_directives.map((directive) => `- ${directive.trim()}`).join("\n")}

Attach these files directly to your post on the target platform. Do not upload them here.`,
    task_status: "pending" as const,
  }));

  const { error } = await supabaseServer
    .from("daily_execution_tasks")
    .insert(rows);

  if (error) {
    throw new Error(`Task insert failed: ${error.message}`);
  }

  return rows.length;
}

export async function processUserReflection(params: {
  userId: string;
  productDna: unknown;
  frameworks: Record<string, unknown>[];
}): Promise<ReflectionUserResult> {
  const { userId, productDna, frameworks } = params;

  const dna = safeParseProductDna(productDna);
  if (!dna) {
    return {
      userId,
      ok: false,
      error: "Invalid or unparsable product_dna on profile",
    };
  }

  const [history, liveStream, blueprintContext, tier] = await Promise.all([
    fetchTaskHistory(userId),
    fetchLiveScraperStream(userId, dna.targetPlatforms),
    loadMasterBlueprintContext(userId),
    fetchUserSubscriptionTier(supabaseServer, userId),
  ]);
  const { data: profileData } = await supabaseServer
    .from("profiles")
    .select("persona_context")
    .eq("id", userId)
    .maybeSingle();
  const personaContextBlock = JSON.stringify(
    profileData?.persona_context &&
      typeof profileData.persona_context === "object" &&
      !Array.isArray(profileData.persona_context)
      ? profileData.persona_context
      : { note: "No founder persona context captured yet." },
    null,
    2
  );

  const taskCount = resolveDailyReflectionTaskLimit(tier);
  const historySummary = buildHistorySummary(history);
  const liveStreamBlock = buildLiveStreamBlock(liveStream);
  const tasks = await generateTasksWithOpenAI({
    dna,
    frameworks,
    historySummary,
    liveStreamBlock,
    hasLiveStream: liveStream.length > 0,
    masterBlueprintBlock: blueprintContext.promptBlock,
    personaContextBlock,
    taskCount,
    tier,
  });
  const inserted = await insertReflectionTasks(userId, tasks);

  return { userId, ok: true, inserted };
}

async function userHasExecutionTasks(userId: string): Promise<boolean> {
  const { count, error } = await supabaseServer
    .from("daily_execution_tasks")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.warn(
      `[REFLECTION] Could not check existing tasks for ${userId}: ${error.message}`
    );
    return false;
  }

  return (count ?? 0) > 0;
}

/** Day-1 seed after vault save — skips if tasks already exist. */
export async function generateInitialReflectionTasksForUser(
  userId: string,
  productDna: unknown
): Promise<ReflectionUserResult> {
  if (await userHasExecutionTasks(userId)) {
    return {
      userId,
      ok: true,
      inserted: 0,
    };
  }

  const frameworks = await fetchCoreFrameworks();
  return processUserReflection({ userId, productDna, frameworks });
}

export async function runReflectionCron(): Promise<ReflectionCronResult> {
  const [profilesResult, frameworks] = await Promise.all([
    supabaseServer
      .from("profiles")
      .select("id, product_dna")
      .not("product_dna", "is", null),
    fetchCoreFrameworks(),
  ]);

  if (profilesResult.error) {
    throw new Error(`Profiles fetch failed: ${profilesResult.error.message}`);
  }
  const results: ReflectionUserResult[] = [];

  for (const profile of profilesResult.data ?? []) {
    const userId = profile.id as string;

    try {
      const result = await processUserReflection({
        userId,
        productDna: profile.product_dna,
        frameworks,
      });
      results.push(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Reflection processing failed";
      console.error(`[REFLECTION CRON] Failed for ${userId}:`, message);
      results.push({ userId, ok: false, error: message });
    }
  }

  return { processed: results.length, results };
}
