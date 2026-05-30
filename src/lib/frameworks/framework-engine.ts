import { z } from "zod";

import { getPlatformConstraints } from "@/lib/moderation/rule-cache-service";
import {
  buildPlatformComplianceGuardrailsBlock,
  PROACTIVE_SYNTAX_RULES,
} from "@/lib/moderation/prompt-blocks";
import {
  emptyPlatformConstraints,
  type PlatformConstraints,
} from "@/lib/moderation/types";
import {
  isFrameworkSlugInPersonaContext,
  resolveFrameworkSlugsFromPersonaContext,
} from "@/lib/bip/persona-frameworks";
import {
  parseSubscriptionTier,
  resolveActiveFrameworkSequenceLimit,
} from "@/lib/billing/tiers";
import { DISCOVERY_LEADS_TABLE } from "@/lib/discovery/lead-bank";
import { extractSubredditFromUrl } from "@/lib/leads/source-context";
import {
  getPlaybookStep,
  incrementPlaybookStep,
  parseFrameworkStepTracking,
  type FrameworkStepTracking,
} from "@/lib/frameworks/framework-step-tracking";
import { safeParseProductDna } from "@/lib/product-dna-schema";
import { supabaseServer } from "@/lib/supabase-server";

const OPENAI_MODEL = "gpt-4o";

const proactivePostSchema = z.object({
  draft_text: z.string().min(1),
  media_directives: z.array(z.string().min(1)).min(1).max(2),
});

type FrameworkRow = {
  slug: string;
  name: string;
  title: string;
  description: string;
  primary_channels: string[] | null;
  category: string | null;
  is_active: boolean | null;
};

export type ProactivePostResult = z.infer<typeof proactivePostSchema> & {
  framework_slug: string;
  framework_title: string;
  playbook_step: number;
  next_playbook_step: number;
  framework_step_tracking: FrameworkStepTracking;
};

export class FrameworkEngineError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly step?: string
  ) {
    super(message);
    this.name = "FrameworkEngineError";
  }
}

function sanitizeOpenAiJsonResponse(rawResponse: string): string {
  let clean = rawResponse.trim();
  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
  }
  return clean;
}

const GLOBAL_DESTINATION_BY_PLATFORM: Record<string, string> = {
  reddit: "global_reddit",
  x: "global_x",
  twitter: "global_x",
  hackernews: "global_hackernews",
  hn: "global_hackernews",
  indiehackers: "global_indiehackers",
  producthunt: "global_producthunt",
  linkedin: "global_linkedin",
};

function resolveFrameworkPlatform(framework: FrameworkRow): string {
  const channel = framework.primary_channels?.[0]?.trim().toLowerCase();
  if (channel) {
    if (channel === "twitter") return "x";
    if (channel === "hn") return "hackernews";
    return channel;
  }
  if (framework.slug.includes("reddit")) return "reddit";
  if (framework.slug.includes("hn") || framework.slug.includes("hacker")) {
    return "hackernews";
  }
  if (framework.slug.includes("linkedin")) return "linkedin";
  return "x";
}

function extractSubredditFromSerperQueries(queries: string[]): string | null {
  for (const query of queries) {
    const match = query.match(/reddit\.com\/r\/([a-z0-9_]+)/i);
    if (match?.[1]) return match[1].toLowerCase();
  }
  return null;
}

function extractSubredditFromTargetCommunity(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/r\/([a-z0-9_]+)/i);
  if (match?.[1]) return match[1].toLowerCase();
  if (/^[a-z0-9_]+$/i.test(trimmed)) return trimmed.toLowerCase();
  return null;
}

function pickSubredditFromPersona(
  personaContext: Record<string, unknown> | null
): string | null {
  if (!personaContext) return null;

  const candidates = [
    personaContext.target_subreddit,
    personaContext.subreddit,
    personaContext.reddit_subreddit,
    personaContext.target_community,
    personaContext.primary_subreddit,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate.trim()) continue;
    const sub = extractSubredditFromTargetCommunity(candidate);
    if (sub) return sub;
  }

  return null;
}

function pickSubredditFromTaskHistory(
  tasks: Array<{
    target_community?: string | null;
    instruction_to_user?: string | null;
  }>
): string | null {
  for (const task of tasks) {
    if (typeof task.target_community === "string") {
      const sub = extractSubredditFromTargetCommunity(task.target_community);
      if (sub) return sub;
    }
    if (typeof task.instruction_to_user === "string") {
      const sub = extractSubredditFromTargetCommunity(task.instruction_to_user);
      if (sub) return sub;
    }
  }
  return null;
}

async function fetchRecentRedditSubreddit(userId: string): Promise<string | null> {
  const { data, error } = await supabaseServer
    .from(DISCOVERY_LEADS_TABLE)
    .select("source_url")
    .eq("user_id", userId)
    .eq("platform", "reddit")
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) {
    console.error(
      "[FRAMEWORK ENGINE] Recent reddit lead lookup failed:",
      error.message
    );
    return null;
  }

  for (const row of data ?? []) {
    const url = typeof row.source_url === "string" ? row.source_url : "";
    const sub = extractSubredditFromUrl(url);
    if (sub) return sub.toLowerCase();
  }

  return null;
}

/**
 * Resolve the active destination channel for compliance cache lookup.
 * Never use framework template slugs as cache keys.
 */
export async function resolveProactiveTargetLocation(params: {
  platform: string;
  userId: string;
  productDna: unknown;
  personaContext: Record<string, unknown> | null;
  recentTasks: Array<{
    target_community?: string | null;
    instruction_to_user?: string | null;
  }>;
}): Promise<string> {
  const platform = params.platform.trim().toLowerCase();

  if (platform === "reddit") {
    const dna = safeParseProductDna(params.productDna);
    const fromSerper = dna
      ? extractSubredditFromSerperQueries(dna.activeSerperQueries)
      : null;
    if (fromSerper) return fromSerper;

    const fromPersona = pickSubredditFromPersona(params.personaContext);
    if (fromPersona) return fromPersona;

    const fromTasks = pickSubredditFromTaskHistory(params.recentTasks);
    if (fromTasks) return fromTasks;

    const fromLeads = await fetchRecentRedditSubreddit(params.userId);
    if (fromLeads) return fromLeads;

    return GLOBAL_DESTINATION_BY_PLATFORM.reddit;
  }

  return (
    GLOBAL_DESTINATION_BY_PLATFORM[platform] ?? `global_${platform.replace(/\s+/g, "_")}`
  );
}

function buildPrompt(params: {
  framework: FrameworkRow;
  personaContext: Record<string, unknown> | null;
  productDna: unknown;
  frameworkExecutionHistory: string[];
  constraints: PlatformConstraints;
  playbookStep: number;
}): { system: string; user: string } {
  const dna = safeParseProductDna(params.productDna);
  const frameworkBlock = JSON.stringify(
    {
      slug: params.framework.slug,
      name: params.framework.name,
      title: params.framework.title,
      description: params.framework.description,
      primary_channels: params.framework.primary_channels ?? [],
      category: params.framework.category,
    },
    null,
    2
  );
  const personaBlock = JSON.stringify(
    params.personaContext ?? { note: "No persona context captured yet." },
    null,
    2
  );
  const dnaBlock = JSON.stringify(
    dna ?? { note: "No product_dna available for this profile." },
    null,
    2
  );
  const historyBlock =
    params.frameworkExecutionHistory.length > 0
      ? params.frameworkExecutionHistory
          .map((entry, index) => `[${index + 1}] ${entry}`)
          .join("\n\n")
      : "(no completed framework execution tasks found yet)";

  const platform = resolveFrameworkPlatform(params.framework);
  const guardrailsBlock = buildPlatformComplianceGuardrailsBlock(
    params.constraints
  );

  return {
    system: `You are an elite founder ghostwriter generating long-form Build In Public content.

ACTIVE PLATFORM: ${platform}

PLAYBOOK PROGRESSION (mandatory):
- You are compiling exactly Step ${params.playbookStep} of this multi-part distribution playbook framework sequence.
- Reference the attached historical execution record to deliver a progressive, seamless sequel.
- Do not restart the narrative from Step 1 unless this is explicitly Step 1.

MANDATORY OUTPUT
- Return strict JSON only with:
{
  "draft_text": "long-form post draft",
  "media_directives": ["directive 1", "directive 2"]
}

${guardrailsBlock}

${PROACTIVE_SYNTAX_RULES}

PLATFORM + ANTI-SPAM PROTOCOL (strict)
- No external URLs in the post body unless link policy above explicitly allows it.
- For LinkedIn-oriented structure, include a short "first comment plan" instruction inside the post body (without URL).
- For X-oriented structure, include thread-link sequencing rules in text form (no URL).
- Keep media_directives as text-only instructions.
- media_directives must specify native proof attachments (screenshots, analytics charts, short clips).
- Never ask the user to upload files in-app.

SEQUENTIAL CONTEXT RULE (mandatory):
- Review the historical execution record provided for this framework.
- Identify what part or milestone was last drafted.
- Generate the next logical sequel or step in this strategy sequence.
- Do not repeat previous copy or start over from the beginning.`,
    user: `Synthesize a long-form, highly authentic post draft for PLAYBOOK STEP ${params.playbookStep} using the specific layout structure blocks defined in this framework data.
Incorporate founder-specific background, constraints, and metrics from persona_context into each framework block (not as a standalone bio section).

FRAMEWORK DATA
${frameworkBlock}

FOUNDER PERSONA CONTEXT
${personaBlock}

PRODUCT DNA
${dnaBlock}

FRAMEWORK EXECUTION HISTORY (last 3 completed tasks for this framework)
${historyBlock}`,
  };
}

export async function generateProactivePost(
  userId: string,
  frameworkSlug: string,
  options?: { advancePlaybookStep?: boolean }
): Promise<ProactivePostResult> {
  const advancePlaybookStep = options?.advancePlaybookStep !== false;
  const normalizedSlug = frameworkSlug.trim();
  if (!normalizedSlug) {
    throw new FrameworkEngineError("frameworkSlug is required", 400, "input");
  }

  const frameworkSlugToken = normalizedSlug.replace(/-/g, " ");
  const [
    { data: frameworkData, error: frameworkError },
    { data: profileData, error: profileError },
    { data: taskHistoryData, error: taskHistoryError },
  ] = await Promise.all([
      supabaseServer
        .from("core_frameworks")
        .select(
          "slug, name, title, description, primary_channels, category, is_active"
        )
        .eq("slug", normalizedSlug)
        .maybeSingle(),
      supabaseServer
        .from("profiles")
        .select(
          "persona_context, product_dna, current_streak, longest_streak, framework_step_tracking, subscription_tier"
        )
        .eq("id", userId)
        .maybeSingle(),
      supabaseServer
        .from("daily_execution_tasks")
        .select(
          "instruction_to_user, ai_generated_draft, created_at, target_community"
        )
        .eq("user_id", userId)
        .eq("task_status", "completed")
        .or(
          `instruction_to_user.ilike.%${normalizedSlug}%,instruction_to_user.ilike.%${frameworkSlugToken}%,ai_generated_draft.ilike.%${normalizedSlug}%,ai_generated_draft.ilike.%${frameworkSlugToken}%`
        )
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

  if (frameworkError) {
    throw new FrameworkEngineError(
      `Failed to load framework: ${frameworkError.message}`,
      500,
      "framework"
    );
  }
  if (!frameworkData) {
    throw new FrameworkEngineError("Framework not found", 404, "framework");
  }
  if (frameworkData.is_active === false) {
    throw new FrameworkEngineError("Framework is not active", 400, "framework");
  }

  if (profileError) {
    throw new FrameworkEngineError(
      `Failed to load profile context: ${profileError.message}`,
      500,
      "profile"
    );
  }
  if (taskHistoryError) {
    throw new FrameworkEngineError(
      `Failed to load framework execution history: ${taskHistoryError.message}`,
      500,
      "history"
    );
  }

  const personaContext =
    profileData?.persona_context &&
    typeof profileData.persona_context === "object" &&
    !Array.isArray(profileData.persona_context)
      ? (profileData.persona_context as Record<string, unknown>)
      : null;

  if (!isFrameworkSlugInPersonaContext(personaContext, normalizedSlug)) {
    throw new FrameworkEngineError(
      "frameworkSlug is not in persona_context.selected_frameworks",
      403,
      "persona"
    );
  }

  const tier = parseSubscriptionTier(profileData?.subscription_tier);
  const selectedSlugs = resolveFrameworkSlugsFromPersonaContext(personaContext);
  const sequenceLimit = resolveActiveFrameworkSequenceLimit(tier);
  const allowedSlugs = selectedSlugs.slice(0, sequenceLimit);
  if (!allowedSlugs.includes(normalizedSlug)) {
    throw new FrameworkEngineError(
      `Your plan allows ${sequenceLimit} active framework sequence${sequenceLimit === 1 ? "" : "s"}. Upgrade to unlock additional playbooks.`,
      403,
      "tier"
    );
  }

  const framework = frameworkData as FrameworkRow;
  const stepTracking = parseFrameworkStepTracking(
    profileData?.framework_step_tracking
  );
  const playbookStep = getPlaybookStep(stepTracking, normalizedSlug);
  const platform = resolveFrameworkPlatform(framework);
  const userStats = {
    current_streak: Number(profileData?.current_streak ?? 0),
    longest_streak: Number(profileData?.longest_streak ?? 0),
    persona_context: personaContext,
    framework_slug: framework.slug,
  };

  const recentTasks = (taskHistoryData ?? []) as Array<{
    target_community?: string | null;
    instruction_to_user?: string | null;
  }>;

  const targetLocation = await resolveProactiveTargetLocation({
    platform,
    userId,
    productDna: profileData?.product_dna,
    personaContext,
    recentTasks,
  });

  let constraints: PlatformConstraints = emptyPlatformConstraints();
  try {
    console.log(
      "[FRAMEWORK ENGINE] Platform constraints cache — platform:",
      platform,
      "| destination:",
      targetLocation
    );
    constraints = await getPlatformConstraints(
      platform,
      targetLocation,
      userStats
    );
  } catch (err) {
    console.error(
      "[FRAMEWORK ENGINE] Platform constraints cache failed, using defaults:",
      err instanceof Error ? err.message : err
    );
  }

  const { system, user } = buildPrompt({
    framework,
    personaContext,
    productDna: profileData?.product_dna,
    frameworkExecutionHistory: (taskHistoryData ?? []).map((task) =>
      `${String(task.created_at)} · ${String(task.instruction_to_user ?? "")}
${String(task.ai_generated_draft ?? "").slice(0, 500)}`
    ),
    constraints,
    playbookStep,
  });

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new FrameworkEngineError("OPENAI_API_KEY is not configured", 500, "openai");
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
        temperature: 0.7,
        max_tokens: 1800,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (cause) {
    const msg = cause instanceof Error ? cause.message : "OpenAI request failed";
    throw new FrameworkEngineError(`Generation failed: ${msg}`, 502, "openai");
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 350);
    throw new FrameworkEngineError(
      `OpenAI returned ${response.status}: ${detail}`,
      502,
      "openai"
    );
  }

  const completion = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = completion.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    throw new FrameworkEngineError("OpenAI returned empty content", 502, "openai");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(sanitizeOpenAiJsonResponse(raw));
  } catch {
    throw new FrameworkEngineError("OpenAI returned invalid JSON", 502, "openai");
  }

  const validated = proactivePostSchema.safeParse(parsed);
  if (!validated.success) {
    throw new FrameworkEngineError(
      `Response schema mismatch: ${validated.error.message}`,
      502,
      "openai"
    );
  }

  const draftText = validated.data.draft_text.trim();
  const mediaDirectives = validated.data.media_directives.map((d) => d.trim());

  const { error: draftCacheError } = await supabaseServer
    .from("generated_drafts_cache")
    .upsert(
      {
        user_id: userId,
        framework_slug: normalizedSlug,
        draft_text: draftText,
        media_directives: mediaDirectives,
        compiled_step: playbookStep,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,framework_slug" }
    );

  if (draftCacheError) {
    throw new FrameworkEngineError(
      `Failed to persist generated draft cache: ${draftCacheError.message}`,
      500,
      "draft-cache"
    );
  }

  let nextTracking = stepTracking;
  let nextPlaybookStep = playbookStep;

  if (advancePlaybookStep) {
    nextTracking = incrementPlaybookStep(stepTracking, normalizedSlug);
    nextPlaybookStep = getPlaybookStep(nextTracking, normalizedSlug);

    const { error: trackingError } = await supabaseServer
      .from("profiles")
      .update({ framework_step_tracking: nextTracking })
      .eq("id", userId);

    if (trackingError) {
      throw new FrameworkEngineError(
        `Failed to persist playbook step tracking: ${trackingError.message}`,
        500,
        "profile"
      );
    }
  }

  return {
    framework_slug: frameworkData.slug,
    framework_title: frameworkData.title,
    draft_text: draftText,
    media_directives: mediaDirectives,
    playbook_step: playbookStep,
    next_playbook_step: nextPlaybookStep,
    framework_step_tracking: nextTracking,
  };
}

