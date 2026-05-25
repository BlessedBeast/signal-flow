"use client";

import { useCallback, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Inbox,
  Linkedin,
  Twitter,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAuthHeaders } from "@/lib/api-auth";
import type {
  InboundPlatform,
  InboundPosture,
  InboundReplyItem,
} from "@/lib/velocity/inbound-pipeline";
import { cn } from "@/lib/utils";

type ReplyDraft = InboundReplyItem & { id: string };

const PLATFORM_OPTIONS: {
  value: InboundPlatform;
  label: string;
  icon: typeof Twitter;
}[] = [
  { value: "x", label: "X", icon: Twitter },
  { value: "linkedin", label: "LinkedIn", icon: Linkedin },
];

const POSTURE_OPTIONS: { value: InboundPosture; label: string }[] = [
  { value: "plug", label: "🤝 The Plug" },
  { value: "hype", label: "⚡ Hype Multiplier" },
  { value: "deflector", label: "🛡️ Hater Deflector" },
];

function ReplyCard({
  index,
  draft,
  copiedIndex,
  onCopy,
  onReplyChange,
}: {
  index: number;
  draft: ReplyDraft;
  copiedIndex: number | null;
  onCopy: (index: number, text: string) => void;
  onReplyChange: (index: number, text: string) => void;
}) {
  const isCopied = copiedIndex === index;

  return (
    <article className="glass-strong space-y-4 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Reply {index + 1}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="glass shrink-0 gap-1.5"
          onClick={() => void onCopy(index, draft.suggestedReply)}
        >
          {isCopied ? (
            <CheckCircle2 className="size-3.5 text-primary" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          {isCopied ? "Copied!" : "Copy reply"}
        </Button>
      </div>

      <blockquote className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
        {draft.commentSnippet}
      </blockquote>

      <Textarea
        value={draft.suggestedReply}
        onChange={(e) => onReplyChange(index, e.target.value)}
        className="min-h-[120px] resize-y leading-relaxed"
        aria-label={`Suggested reply ${index + 1}`}
      />
    </article>
  );
}

function SegmentedToggle<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: { value: T; label: string; icon?: typeof Twitter }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </Label>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const Icon = option.icon;
          const selected = value === option.value;

          return (
            <Button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              variant={selected ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              className={cn("gap-1.5", !selected && "glass-soft border-border/60")}
              onClick={() => onChange(option.value)}
            >
              {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
              {option.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function InboundWorkspace() {
  const [platform, setPlatform] = useState<InboundPlatform>("x");
  const [posture, setPosture] = useState<InboundPosture>("plug");
  const [originalThread, setOriginalThread] = useState("");
  const [replies, setReplies] = useState<ReplyDraft[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const updateReply = useCallback((index: number, text: string) => {
    setReplies((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, suggestedReply: text } : item
      )
    );
  }, []);

  const copyReply = useCallback(async (index: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text.trim());
      setCopiedIndex(index);
      toast.success("Reply copied to clipboard");
      window.setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      toast.error("Could not copy reply — check browser permissions");
    }
  }, []);

  async function handleGenerate() {
    const trimmed = originalThread.trim();
    if (!trimmed) {
      toast.error("Paste a comment block before generating replies.");
      return;
    }

    setIsProcessing(true);
    toast.info("De-constructing thread dynamics...");

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/velocity/inbound", {
        method: "POST",
        headers,
        body: JSON.stringify({
          platform,
          originalThread: trimmed,
          posture,
        }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        data?: InboundReplyItem[];
        error?: string;
      };

      if (!res.ok || !json.ok || !json.data?.length) {
        toast.error(json.error ?? "Failed to generate reply stream");
        return;
      }

      setReplies(
        json.data.map((item, index) => ({
          ...item,
          id: `reply-${index}-${Date.now()}`,
        }))
      );
      toast.success(`Generated ${json.data.length} reply draft${json.data.length === 1 ? "" : "s"}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected generation error";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Velocity Hub
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          1-Click Comment Replier
        </h1>
        <p className="text-xs text-muted-foreground">
          Paste raw notification blocks, pick your posture, and stream contextual
          replies ready to post.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className="rounded-xl glass p-6">
          <h2 className="font-semibold tracking-tight text-foreground">
            Inbound Capture Feed
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Configure platform, posture, and paste your social thread block.
          </p>

          <div className="mt-6 space-y-5">
            <SegmentedToggle
              label="Platform target"
              options={PLATFORM_OPTIONS}
              value={platform}
              onChange={setPlatform}
              disabled={isProcessing}
            />

            <SegmentedToggle
              label="Growth posture"
              options={POSTURE_OPTIONS}
              value={posture}
              onChange={setPosture}
              disabled={isProcessing}
            />

            <div className="space-y-2">
              <Label htmlFor="inbound-thread">Raw comment block</Label>
              <Textarea
                id="inbound-thread"
                value={originalThread}
                onChange={(e) => setOriginalThread(e.target.value)}
                disabled={isProcessing}
                placeholder="Paste the raw comment block or individual notifications here directly from your social notifications panel..."
                className="min-h-[280px] resize-y leading-relaxed"
              />
            </div>

            <Button
              type="button"
              className="w-full gap-2"
              disabled={isProcessing}
              onClick={() => void handleGenerate()}
            >
              <Zap
                className={cn("size-4 shrink-0", isProcessing && "animate-spin")}
                aria-hidden
              />
              {isProcessing ? "Generating reply stream..." : "Generate Replies Stream"}
            </Button>
          </div>
        </section>

        <section className="relative rounded-xl glass p-6">
          <h2 className="font-semibold tracking-tight text-foreground">
            Live Response Terminal
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Review, edit, and copy each suggested reply before posting.
          </p>

          <div className="relative mt-6 min-h-[360px]">
            {isProcessing ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/60 backdrop-blur-sm">
                <Zap className="size-8 animate-spin text-primary" aria-hidden />
                <p className="text-sm font-medium text-foreground">
                  De-constructing thread dynamics...
                </p>
              </div>
            ) : null}

            {replies.length === 0 && !isProcessing ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
                <Inbox className="size-10 text-muted-foreground/60" aria-hidden />
                <p className="mt-4 text-sm font-medium text-foreground">
                  No reply stream yet
                </p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Paste a thread on the left and generate to populate response
                  cards here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {replies.map((draft, index) => (
                  <ReplyCard
                    key={draft.id}
                    index={index}
                    draft={draft}
                    copiedIndex={copiedIndex}
                    onCopy={copyReply}
                    onReplyChange={updateReply}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
