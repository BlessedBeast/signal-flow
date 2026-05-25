"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Lightbulb,
  Loader2,
  Megaphone,
  Package,
  Rocket,
  Sparkles,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAuthHeaders } from "@/lib/api-auth";
import {
  BIP_POST_TYPE_LABELS,
  BIP_POST_TYPES,
  type BipLedgerEntry,
  type BipPostType,
} from "@/lib/bip/types";
import { useSignalFlow } from "@/lib/signalflow-store";
import { cn } from "@/lib/utils";

const POST_TYPE_ICONS: Record<
  BipPostType,
  typeof Trophy
> = {
  milestone: Trophy,
  friction: AlertTriangle,
  insight: Lightbulb,
  ship: Rocket,
};

function TimelineCard({ entry }: { entry: BipLedgerEntry }) {
  const Icon = POST_TYPE_ICONS[entry.post_type];

  return (
    <article className="glass-strong relative pl-6">
      <span
        className="absolute left-2 top-6 size-2 rounded-full bg-primary"
        aria-hidden
      />
      <div className="space-y-3 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="size-3.5 text-primary" aria-hidden />
            <Badge variant="secondary" className="font-medium">
              {BIP_POST_TYPE_LABELS[entry.post_type]}
            </Badge>
          </div>
          <time
            dateTime={entry.created_at}
            className="text-xs text-muted-foreground"
          >
            {formatDistanceToNow(new Date(entry.created_at), {
              addSuffix: true,
            })}
          </time>
        </div>
        {entry.current_focus ? (
          <p className="text-xs text-muted-foreground">
            Focus: {entry.current_focus}
          </p>
        ) : null}
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {entry.post_content}
        </p>
        <p className="text-xs text-muted-foreground">
          {entry.post_content.length}/280
        </p>
      </div>
    </article>
  );
}

export function BipWorkspace() {
  const { profile } = useSignalFlow();
  const productDna = profile.product_dna;

  const [postType, setPostType] = useState<BipPostType>("ship");
  const [currentFocus, setCurrentFocus] = useState("");
  const [generatedPost, setGeneratedPost] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<BipLedgerEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadTimeline = useCallback(async () => {
    setTimelineLoading(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) {
        setTimeline([]);
        return;
      }

      const res = await fetch("/api/velocity/bip", {
        method: "GET",
        headers,
        cache: "no-store",
      });

      const json = (await res.json()) as {
        ok?: boolean;
        posts?: BipLedgerEntry[];
        error?: string;
      };

      if (!res.ok || !json.ok) {
        console.error("[bip] timeline:", json.error);
        return;
      }

      setTimeline(json.posts ?? []);
    } catch (err) {
      console.error("[bip] timeline load failed:", err);
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  async function handleGenerate() {
    if (!currentFocus.trim()) {
      toast.error("Describe what you worked on today first.");
      return;
    }

    setIsGenerating(true);
    setCopied(false);
    toast.info("Analyzing timeline and drafting update...");

    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) {
        toast.error("Sign in to generate Build in Public posts.");
        return;
      }

      const res = await fetch("/api/velocity/bip", {
        method: "POST",
        headers,
        body: JSON.stringify({
          postType,
          currentFocus: currentFocus.trim(),
        }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        postContent?: string;
        entry?: BipLedgerEntry;
        error?: string;
      };

      if (!res.ok || !json.ok || !json.postContent) {
        toast.error(json.error ?? "Failed to generate post");
        return;
      }

      setGeneratedPost(json.postContent);
      if (json.entry) {
        setTimeline((prev) => [json.entry!, ...prev]);
      } else {
        await loadTimeline();
      }
      toast.success("Today's update drafted — review and copy to X");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Generation failed";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    if (!generatedPost) return;
    try {
      await navigator.clipboard.writeText(generatedPost);
      setCopied(true);
      toast.success("Copied to clipboard");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl glass p-5">
        <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <Megaphone className="size-3.5 text-primary" aria-hidden />
          Velocity Hub · Build In Public
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Narrative BIP Engine
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Every post reads your last three ledger entries so the storyline never
          repeats{productDna ? ` · ${productDna.productName}` : ""}.
        </p>
      </div>

      {!productDna ? (
        <div className="rounded-xl glass p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Complete Product DNA onboarding to unlock Build in Public generation.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <section className="relative rounded-xl glass p-6">
            {isGenerating ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl glass-strong backdrop-blur-sm">
                <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
                <p className="text-sm font-medium text-foreground">
                  Analyzing timeline and drafting update...
                </p>
              </div>
            ) : null}

            <h2 className="font-semibold tracking-tight text-foreground">
              Draft today&apos;s post
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Pick an angle and describe what happened in the build today.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Post type</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {BIP_POST_TYPES.map((type) => {
                    const Icon = POST_TYPE_ICONS[type];
                    const active = postType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        disabled={isGenerating}
                        onClick={() => setPostType(type)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          active
                            ? "border-primary/30 bg-primary/10 text-foreground"
                            : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <Icon className="size-3 shrink-0" aria-hidden />
                        {BIP_POST_TYPE_LABELS[type]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="bip-current-focus"
                  className="text-xs text-muted-foreground"
                >
                  What did you do today?
                </Label>
                <Textarea
                  id="bip-current-focus"
                  value={currentFocus}
                  onChange={(e) => setCurrentFocus(e.target.value)}
                  placeholder="e.g. cut api latency from 400ms to 90ms on the lead miner, mrr still $420"
                  className="min-h-[100px] resize-y text-sm leading-relaxed"
                  disabled={isGenerating}
                />
              </div>

              <Button
                type="button"
                className="w-full gap-2"
                disabled={isGenerating || !currentFocus.trim()}
                onClick={() => void handleGenerate()}
              >
                {isGenerating ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="size-4" aria-hidden />
                )}
                {isGenerating ? "Generating…" : "Draft narrative update"}
              </Button>

              {generatedPost ? (
                <div className="glass-strong space-y-3 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                      Generated draft
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => void handleCopy()}
                    >
                      {copied ? (
                        <CheckCircle2 className="size-3.5 text-primary" aria-hidden />
                      ) : (
                        <Copy className="size-3.5" aria-hidden />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    {generatedPost}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {generatedPost.length}/280 characters
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl glass p-6">
            <h2 className="font-semibold tracking-tight text-foreground">
              Build timeline
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Narrative memory — last {timeline.length} ledger entries.
            </p>

            <div className="relative mt-6 space-y-4">
              <span
                className="absolute bottom-2 left-2.5 top-2 w-px bg-border"
                aria-hidden
              />

              {timelineLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
                </div>
              ) : timeline.length === 0 ? (
                <div className="glass-strong rounded-xl px-6 py-12 text-center">
                  <Package className="mx-auto size-8 text-muted-foreground/50" aria-hidden />
                  <p className="mt-3 text-sm font-medium text-foreground">
                    Timeline empty
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Your first post seeds tomorrow&apos;s narrative memory.
                  </p>
                </div>
              ) : (
                timeline.map((entry) => (
                  <TimelineCard key={entry.id} entry={entry} />
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
