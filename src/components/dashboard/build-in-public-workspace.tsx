"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Loader2,
  Megaphone,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { MarkdownDraftCanvas } from "@/components/dashboard/markdown-draft-canvas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/api-auth";
import type { BipGeneratePostResponse } from "@/lib/bip/generate-post-types";
import {
  rowsToDraftDictionary,
  type GeneratedDraftRow,
} from "@/lib/bip/generated-drafts-cache";
import {
  formatFrameworkSlugLabel,
  resolveFrameworkSlugsFromPersonaContext,
} from "@/lib/bip/persona-frameworks";
import {
  getPlaybookStep,
  parseFrameworkStepTracking,
} from "@/lib/frameworks/framework-step-tracking";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import type { FrameworkStepTracking } from "@/lib/signalflow-types";
import { useSignalFlow } from "@/lib/signalflow-store";
import { cn } from "@/lib/utils";

type CoreFrameworkMeta = {
  slug: string;
  title: string;
  name: string;
  description: string;
};

type FrameworkPlaybook = CoreFrameworkMeta & {
  currentStep: number;
};

function CanvasSkeleton() {
  return (
    <div className="space-y-4 p-6" aria-busy="true" aria-label="Generating draft">
      <div className="h-4 w-2/5 animate-pulse rounded-md bg-muted/80" />
      <div className="h-3 w-full animate-pulse rounded-md bg-muted/60" />
      <div className="h-3 w-full animate-pulse rounded-md bg-muted/60" />
      <div className="h-3 w-11/12 animate-pulse rounded-md bg-muted/60" />
      <div className="h-3 w-4/5 animate-pulse rounded-md bg-muted/50" />
      <div className="mt-6 h-3 w-full animate-pulse rounded-md bg-muted/60" />
      <div className="h-3 w-10/12 animate-pulse rounded-md bg-muted/50" />
    </div>
  );
}

function GenerateDraftPlaceholder({
  playbookStep,
  onGenerate,
  disabled,
}: {
  playbookStep: number;
  onGenerate: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-5 px-8 py-10 text-center">
      <div className="glass-soft max-w-md space-y-3 rounded-2xl border border-primary/20 px-6 py-8">
        <h3 className="text-base font-semibold text-foreground">
          📋 Framework Blueprint Ready
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Click below to compile your strategic sequence draft for this playbook
          framework using your live custom onboarding metrics.
        </p>
        <Button
          type="button"
          size="lg"
          className="mt-2 w-full gap-2 sm:w-auto"
          disabled={disabled}
          onClick={onGenerate}
        >
          {disabled ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}
          🚀 Generate Step {playbookStep} Content Draft
        </Button>
      </div>
    </div>
  );
}

function ProofDirectiveItem({
  directive,
  checked,
  onToggle,
}: {
  directive: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3 transition-colors hover:border-primary/25 hover:bg-primary/5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary"
      />
      <span className="text-sm leading-relaxed text-foreground/90">{directive}</span>
    </label>
  );
}

export function BuildInPublicWorkspace() {
  const { profile, setProfile } = useSignalFlow();

  const [playbooks, setPlaybooks] = useState<FrameworkPlaybook[]>([]);
  const [frameworkStepTracking, setFrameworkStepTracking] =
    useState<FrameworkStepTracking>(profile.framework_step_tracking);
  const [loadingPlaybooks, setLoadingPlaybooks] = useState(true);
  const [activeTabSlug, setActiveTabSlug] = useState<string | null>(null);
  const [generatingSlug, setGeneratingSlug] = useState<string | null>(null);
  const [cachedDrafts, setCachedDrafts] = useState<
    Record<
      string,
      {
        draft_text: string;
        media_directives: string[];
        compiled_step: number;
      }
    >
  >({});
  const [checkedDirectives, setCheckedDirectives] = useState<
    Record<string, boolean[]>
  >({});
  const [copied, setCopied] = useState(false);
  const [isRestoringDrafts, setIsRestoringDrafts] = useState(true);
  const draftsRestoredRef = useRef(false);

  useEffect(() => {
    if (draftsRestoredRef.current) return;
    draftsRestoredRef.current = true;

    async function restorePersistedDrafts() {
      try {
        const supabase = createBrowserSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          return;
        }

        const { data, error } = await supabase
          .from("generated_drafts_cache")
          .select("framework_slug, draft_text, media_directives, compiled_step")
          .eq("user_id", session.user.id);

        if (error) {
          console.error("[BIP workspace] restore drafts:", error.message);
          return;
        }

        const restored = rowsToDraftDictionary(
          (data ?? []) as GeneratedDraftRow[]
        );

        if (Object.keys(restored).length === 0) {
          return;
        }

        setCachedDrafts(restored);
        setCheckedDirectives((prev) => {
          const next = { ...prev };
          for (const [slug, draft] of Object.entries(restored)) {
            next[slug] = draft.media_directives.map(() => false);
          }
          return next;
        });
      } catch (err) {
        console.error("[BIP workspace] restore drafts:", err);
      } finally {
        setIsRestoringDrafts(false);
      }
    }

    void restorePersistedDrafts();
  }, []);

  const loadPlaybooks = useCallback(async () => {
    setLoadingPlaybooks(true);
    try {
      const supabase = createBrowserSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setPlaybooks([]);
        return;
      }

      const [profileResult, frameworksResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("persona_context, framework_step_tracking")
          .eq("id", session.user.id)
          .maybeSingle(),
        supabase
          .from("core_frameworks")
          .select("slug, title, name, description, is_active"),
      ]);

      const personaContext =
        profileResult.data?.persona_context &&
        typeof profileResult.data.persona_context === "object" &&
        !Array.isArray(profileResult.data.persona_context)
          ? (profileResult.data.persona_context as Record<string, unknown>)
          : null;

      // Source of truth: profiles.persona_context.selected_frameworks only.
      const slugs = resolveFrameworkSlugsFromPersonaContext(personaContext);

      const catalog = (frameworksResult.data ?? []) as Array<{
        slug: string;
        title: string;
        name: string;
        description: string;
        is_active: boolean | null;
      }>;

      const bySlug = new Map(
        catalog
          .filter((row) => row.is_active !== false)
          .map((row) => [
            row.slug,
            {
              slug: row.slug,
              title: row.title?.trim() || formatFrameworkSlugLabel(row.slug),
              name: row.name?.trim() || formatFrameworkSlugLabel(row.slug),
              description: row.description?.trim() ?? "",
            } satisfies CoreFrameworkMeta,
          ])
      );

      const tracking = parseFrameworkStepTracking(
        profileResult.data?.framework_step_tracking
      );
      setFrameworkStepTracking(tracking);
      setProfile({
        framework_step_tracking: tracking,
        persona_context: personaContext,
      });

      const resolved: FrameworkPlaybook[] = slugs.map((slug) => {
        const meta = bySlug.get(slug) ?? {
          slug,
          title: formatFrameworkSlugLabel(slug),
          name: formatFrameworkSlugLabel(slug),
          description: "",
        };
        return {
          ...meta,
          currentStep: getPlaybookStep(tracking, slug),
        };
      });

      setPlaybooks(resolved);
      setActiveTabSlug((current) => {
        if (current && resolved.some((p) => p.slug === current)) return current;
        return resolved[0]?.slug ?? null;
      });
    } catch (err) {
      console.error("[BIP workspace] load playbooks:", err);
      toast.error("Could not load playbook frameworks");
      setPlaybooks([]);
    } finally {
      setLoadingPlaybooks(false);
    }
  }, [setProfile]);

  useEffect(() => {
    void loadPlaybooks();
  }, [loadPlaybooks]);

  const handleTriggerGeneration = useCallback(
    async (frameworkSlug: string, advancePlaybookStep = true) => {
      if (generatingSlug) return;

      setGeneratingSlug(frameworkSlug);
      try {
        const headers = await getAuthHeaders();
        if (!headers.Authorization) {
          toast.error("Sign in to generate playbook drafts.");
          return;
        }

        const res = await fetch("/api/bip/generate-post", {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ frameworkSlug, advancePlaybookStep }),
        });

        const json = (await res.json()) as BipGeneratePostResponse;

        if (!res.ok || !json.ok) {
          toast.error(
            !json.ok ? json.error : "Failed to generate proactive post"
          );
          return;
        }

        setCachedDrafts((prev) => ({
          ...prev,
          [frameworkSlug]: {
            draft_text: json.draft_text,
            media_directives: json.media_directives,
            compiled_step: json.playbook_step,
          },
        }));

        setCheckedDirectives((prev) => ({
          ...prev,
          [frameworkSlug]: json.media_directives.map(() => false),
        }));

        setFrameworkStepTracking(json.framework_step_tracking);
        setProfile({ framework_step_tracking: json.framework_step_tracking });
        setPlaybooks((prev) =>
          prev.map((playbook) =>
            playbook.slug === frameworkSlug
              ? {
                  ...playbook,
                  currentStep: json.next_playbook_step,
                }
              : playbook
          )
        );

        toast.success(
          `Step ${json.playbook_step} draft ready — ${json.framework_title}`
        );
      } catch (err) {
        console.error("[BIP workspace] generate:", err);
        toast.error("Generation request failed");
      } finally {
        setGeneratingSlug(null);
      }
    },
    [generatingSlug, setProfile]
  );

  const activePlaybookStep = activeTabSlug
    ? getPlaybookStep(frameworkStepTracking, activeTabSlug)
    : 1;

  const currentSavedDraft = activeTabSlug
    ? cachedDrafts[activeTabSlug]
    : undefined;

  const hasValidCurrentDraft = Boolean(
    currentSavedDraft?.draft_text?.trim() &&
      currentSavedDraft.compiled_step === activePlaybookStep
  );

  const activeDirectives = hasValidCurrentDraft
    ? (currentSavedDraft?.media_directives ?? [])
    : [];

  const activeChecks = activeTabSlug
    ? (checkedDirectives[activeTabSlug] ?? [])
    : [];

  const activePlaybook = useMemo(
    () => playbooks.find((p) => p.slug === activeTabSlug) ?? null,
    [playbooks, activeTabSlug]
  );

  const copyDraft = useCallback(async () => {
    if (!currentSavedDraft?.draft_text) return;
    try {
      await navigator.clipboard.writeText(currentSavedDraft.draft_text.trim());
      setCopied(true);
      toast.success("Draft copied to clipboard");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — check browser permissions");
    }
  }, [currentSavedDraft?.draft_text]);

  const isGenerating = Boolean(
    activeTabSlug && generatingSlug === activeTabSlug
  );

  const isWorkspaceLoading = loadingPlaybooks || isRestoringDrafts;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="size-5 text-primary" aria-hidden />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Build In Public
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Select an active growth playbook, generate a long-form founder draft,
            and track native proof attachments before publishing on-platform.
          </p>
        </div>
        {activeTabSlug && hasValidCurrentDraft && currentSavedDraft ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-2"
            disabled={Boolean(generatingSlug)}
            onClick={() =>
              void handleTriggerGeneration(activeTabSlug, false)
            }
          >
            {generatingSlug === activeTabSlug ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="size-4" aria-hidden />
            )}
            Regenerate Step {currentSavedDraft.compiled_step} draft
          </Button>
        ) : null}
      </div>

      {isWorkspaceLoading ? (
        <div className="glass-soft flex min-h-[88px] items-center justify-center rounded-2xl">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="sr-only">Loading workspace</span>
        </div>
      ) : playbooks.length === 0 ? (
        <div className="glass-strong rounded-2xl px-6 py-12 text-center">
          <Sparkles className="mx-auto size-8 text-primary/80" aria-hidden />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            No active playbooks found on your profile. Complete onboarding and
            select frameworks in your vault blueprint to unlock this workspace.
          </p>
          <Button asChild className="mt-6" variant="default">
            <Link href="/stream/vault">Open Product DNA Vault</Link>
          </Button>
        </div>
      ) : (
        <>
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label="Active growth playbooks"
          >
            {playbooks.map((playbook) => {
              const isActive = playbook.slug === activeTabSlug;
              const stepNumber = getPlaybookStep(
                frameworkStepTracking,
                playbook.slug
              );
              const badgeLabel = `Step ${stepNumber}`;

              return (
                <button
                  key={playbook.slug}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTabSlug(playbook.slug)}
                  className={cn(
                    "glass-soft min-w-[200px] shrink-0 rounded-xl border px-4 py-3 text-left transition-all",
                    isActive
                      ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30"
                      : "border-transparent hover:border-primary/20 hover:bg-primary/5"
                  )}
                >
                  <p className="text-sm font-semibold leading-snug text-foreground">
                    {playbook.title}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {playbook.name}
                  </p>
                  <Badge
                    variant={isActive ? "default" : "secondary"}
                    className="mt-2 font-mono text-[10px]"
                  >
                    {badgeLabel}
                  </Badge>
                </button>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="glass-strong relative flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border/50">
              <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Generation canvas
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {activePlaybook?.title ?? "Select a playbook"}
                    {hasValidCurrentDraft && currentSavedDraft ? (
                      <span className="ml-2 font-mono text-[10px] font-normal text-muted-foreground">
                        · Step {currentSavedDraft.compiled_step} Draft
                      </span>
                    ) : null}
                  </p>
                </div>
                {hasValidCurrentDraft ? (
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2 shrink-0"
                    onClick={() => void copyDraft()}
                  >
                    {copied ? (
                      <CheckCircle2 className="size-4" aria-hidden />
                    ) : (
                      <Copy className="size-4" aria-hidden />
                    )}
                    {copied ? "Copied" : "Click to Copy"}
                  </Button>
                ) : null}
              </div>

              <div className="flex-1 overflow-y-auto">
                {isGenerating ? (
                  <CanvasSkeleton />
                ) : hasValidCurrentDraft && currentSavedDraft ? (
                  <div className="p-6">
                    <MarkdownDraftCanvas content={currentSavedDraft.draft_text} />
                  </div>
                ) : activeTabSlug ? (
                  <GenerateDraftPlaceholder
                    playbookStep={activePlaybookStep}
                    disabled={Boolean(generatingSlug)}
                    onGenerate={() =>
                      void handleTriggerGeneration(activeTabSlug, true)
                    }
                  />
                ) : (
                  <div className="flex min-h-[320px] items-center justify-center px-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Select a playbook tab to begin.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <aside className="glass-strong flex flex-col rounded-2xl border border-border/50 lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)]">
              <div className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-3">
                <p className="text-xs font-medium leading-relaxed text-amber-100/95">
                  🔒 Proof Verification: Capture and link these native
                  screenshots/media attachments directly on the destination
                  platform. Our client-safe application requires no file
                  hosting uploads.
                </p>
              </div>

              <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
                <CheckCircle2 className="size-4 text-primary" aria-hidden />
                <h2 className="text-sm font-semibold text-foreground">
                  Proof protocol checklist
                </h2>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {isGenerating ? (
                  <div className="space-y-2">
                    <div className="h-12 animate-pulse rounded-lg bg-muted/60" />
                    <div className="h-12 animate-pulse rounded-lg bg-muted/50" />
                  </div>
                ) : activeDirectives.length > 0 ? (
                  activeDirectives.map((directive, index) => (
                    <ProofDirectiveItem
                      key={`${activeTabSlug}-${index}`}
                      directive={directive}
                      checked={activeChecks[index] ?? false}
                      onToggle={() => {
                        if (!activeTabSlug) return;
                        setCheckedDirectives((prev) => {
                          const current = [...(prev[activeTabSlug] ?? [])];
                          current[index] = !current[index];
                          return { ...prev, [activeTabSlug]: current };
                        });
                      }}
                    />
                  ))
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Media directives appear here after generation. Each item is
                    a text-only reminder for what to attach natively on X,
                    Reddit, LinkedIn, or your target channel.
                  </p>
                )}
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
