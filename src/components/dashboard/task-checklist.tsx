"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Copy,
  ListChecks,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  formatFrameworkSlugLabel as toFrameworkLabel,
  resolveFrameworkSlugsFromPersonaContext,
} from "@/lib/bip/persona-frameworks";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { getAuthHeaders } from "@/lib/api-auth";
import { useSignalFlow } from "@/lib/signalflow-store";
import { cn } from "@/lib/utils";

type DailyExecutionTask = {
  id: string;
  target_community: string;
  instruction_to_user: string;
  ai_generated_draft: string;
  action_type: string | null;
  task_status: string;
  created_at: string;
  is_fallback?: boolean;
};

function resolveTaskChecklistFrameworkSlugs(
  context: Record<string, unknown> | null
): string[] {
  return resolveFrameworkSlugsFromPersonaContext(context).slice(0, 2);
}

function buildFallbackTasksFromFrameworks(frameworkSlugs: string[]): DailyExecutionTask[] {
  if (frameworkSlugs.length === 0) return [];
  const now = new Date().toISOString();

  return frameworkSlugs.map((slug, index) => {
    const frameworkName = toFrameworkLabel(slug);
    const targetCommunity = slug.includes("x")
      ? "X distribution thread"
      : slug.includes("reddit")
        ? "Reddit intent thread"
        : "Build-in-public channel";
    return {
      id: `fallback-${slug}-${index}`,
      target_community: targetCommunity,
      instruction_to_user: `Draft your initial 4-3-2-1 Content Matrix post using the ${frameworkName} framework.`,
      ai_generated_draft: `Today's structural milestone is framework activation.

Framework: ${frameworkName}
Action:
1) Publish one founder-proof post tied to a concrete customer friction signal.
2) Add one evidence asset (screenshot, chart, or clip) directly on the target platform.
3) End with one clear CTA that maps to your current onboarding persona context.

Attach these files directly to your post on the target platform. Do not upload them here.`,
      action_type: "plug",
      task_status: "pending",
      created_at: now,
      is_fallback: true,
    };
  });
}

function TaskCard({
  task,
  completing,
  onComplete,
}: {
  task: DailyExecutionTask;
  completing: boolean;
  onComplete: (taskId: string) => void;
}) {
  const [draftOpen, setDraftOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyDraft = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(task.ai_generated_draft.trim());
      setCopied(true);
      toast.success("AI copy template copied to clipboard");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — check browser permissions");
    }
  }, [task.ai_generated_draft]);

  return (
    <article className="glass-soft space-y-3 rounded-xl p-4 shadow-sm transition-colors hover:border-primary/20">
      <div className="flex items-start gap-3">
        <button
          type="button"
          disabled={completing}
          onClick={() => onComplete(task.id)}
          className={cn(
            "mt-0.5 shrink-0 rounded-full transition-colors",
            "text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            completing && "pointer-events-none opacity-50"
          )}
          aria-label="Mark task complete"
        >
          {completing ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <Circle className="size-5" aria-hidden />
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <Badge
            variant="outline"
            className="max-w-full border-primary/25 bg-primary/10 text-xs font-medium text-foreground"
          >
            {task.target_community}
          </Badge>

          <p className="text-sm leading-relaxed text-foreground">
            {task.instruction_to_user}
          </p>

          <Collapsible open={draftOpen} onOpenChange={setDraftOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <span>View AI Copy Template</span>
                <ChevronDown
                  className={cn(
                    "size-3.5 shrink-0 transition-transform",
                    draftOpen && "rotate-180"
                  )}
                  aria-hidden
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2 rounded-lg border border-border/50 bg-muted/25 p-3">
                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 glass-soft text-xs"
                    onClick={() => void copyDraft()}
                  >
                    {copied ? (
                      <CheckCircle2 className="size-3.5 text-primary" aria-hidden />
                    ) : (
                      <Copy className="size-3.5" aria-hidden />
                    )}
                    {copied ? "Copied" : "Copy to Clipboard"}
                  </Button>
                </div>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
                  {task.ai_generated_draft}
                </pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </article>
  );
}

export function TaskChecklist() {
  const [tasks, setTasks] = useState<DailyExecutionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const { profile, setProfile } = useSignalFlow();

  const fetchPendingTasks = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createBrowserSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setTasks([]);
        return;
      }

      const { data, error } = await supabase
        .from("daily_execution_tasks")
        .select(
          "id, target_community, instruction_to_user, ai_generated_draft, action_type, task_status, created_at"
        )
        .eq("user_id", session.user.id)
        .eq("task_status", "pending")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[TaskChecklist] fetch:", error.message);
        setTasks(
          buildFallbackTasksFromFrameworks(
            resolveTaskChecklistFrameworkSlugs(profile.persona_context)
          )
        );
        return;
      }

      const pendingTasks = (data ?? []) as DailyExecutionTask[];
      if (pendingTasks.length === 0) {
        setTasks(
          buildFallbackTasksFromFrameworks(
            resolveTaskChecklistFrameworkSlugs(profile.persona_context)
          )
        );
        return;
      }
      setTasks(pendingTasks);
    } catch (err) {
      console.error("[TaskChecklist] fetch:", err);
      setTasks(
        buildFallbackTasksFromFrameworks(
          resolveTaskChecklistFrameworkSlugs(profile.persona_context)
        )
      );
    } finally {
      setLoading(false);
    }
  }, [profile.persona_context]);

  useEffect(() => {
    void fetchPendingTasks();
  }, [fetchPendingTasks]);

  const handleComplete = useCallback(
    async (taskId: string) => {
      if (completingId) return;

      setCompletingId(taskId);
      try {
        const supabase = createBrowserSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          toast.error("Sign in to update task status.");
          return;
        }

        if (tasks.find((task) => task.id === taskId)?.is_fallback) {
          setTasks((prev) => prev.filter((task) => task.id !== taskId));
          toast.success("Milestone task checked off");
          return;
        }

        const { error } = await supabase
          .from("daily_execution_tasks")
          .update({
            task_status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", taskId)
          .eq("user_id", session.user.id);

        if (error) {
          toast.error("Could not mark task complete");
          return;
        }

        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        const headers = await getAuthHeaders();
        const streakRes = await fetch("/api/user/streak", {
          method: "POST",
          headers,
        });
        const streakBody = (await streakRes.json()) as {
          ok?: boolean;
          data?: {
            current_streak: number;
            longest_streak: number;
            last_action_at: string | null;
          };
          error?: string;
        };

        if (streakRes.ok && streakBody.ok && streakBody.data) {
          setProfile({
            current_streak: streakBody.data.current_streak,
            longest_streak: streakBody.data.longest_streak,
            last_action_at: streakBody.data.last_action_at,
          });
          toast.success(
            `Task marked complete · ${streakBody.data.current_streak} day streak`
          );
        } else {
          toast.success("Task marked complete");
        }
      } catch {
        toast.error("Could not mark task complete");
      } finally {
        setCompletingId(null);
      }
    },
    [completingId, setProfile, tasks]
  );

  return (
    <div className="space-y-4 lg:sticky lg:top-6">
      <div className="flex items-center gap-2">
        <ListChecks className="size-4 text-primary" aria-hidden />
        <h2 className="text-sm font-semibold text-foreground">
          Today&apos;s marketing tasks
        </h2>
      </div>
      <div className="glass-soft flex items-center justify-between rounded-xl px-3 py-2">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Daily retention streak
        </p>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 font-mono text-xs text-foreground"
          >
            {profile.current_streak} day{profile.current_streak === 1 ? "" : "s"}
          </Badge>
          <span className="font-mono text-[10px] text-muted-foreground">
            best {profile.longest_streak}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="glass-soft flex min-h-[160px] items-center justify-center rounded-2xl">
          <Loader2
            className="size-5 animate-spin text-muted-foreground"
            aria-hidden
          />
          <span className="sr-only">Loading tasks</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="glass-soft rounded-2xl px-5 py-10 text-center">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your marketing queue is clear for today. Live Reflection Engine recalculating at dawn.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              completing={completingId === task.id}
              onComplete={(id) => void handleComplete(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
