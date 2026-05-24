import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(__dirname, "..", "src", "components", "bip", "bip-workspace.tsx");

const content = `"use client";

import { useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  Copy,
  Hammer,
  Loader2,
  Megaphone,
  Sparkles,
  Swords,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/api-auth";
import type { BipOptionType, BipPostOption } from "@/lib/bip/types";
import { useSignalFlow } from "@/lib/signalflow-store";
import { cn } from "@/lib/utils";

const OPTION_STYLES: Record<
  BipOptionType,
  { icon: typeof BarChart3; accent: string; ring: string }
> = {
  "data-drop": {
    icon: BarChart3,
    accent: "text-sky-700 dark:text-sky-400",
    ring: "ring-sky-500/20",
  },
  "raw-build": {
    icon: Hammer,
    accent: "text-amber-700 dark:text-amber-400",
    ring: "ring-amber-500/20",
  },
  "competitor-flank": {
    icon: Swords,
    accent: "text-violet-700 dark:text-violet-400",
    ring: "ring-violet-500/20",
  },
};

function BipCardSkeleton() {
  return (
    <div
      className="glass-soft animate-pulse space-y-4 rounded-2xl border border-border/50 p-5"
      aria-hidden
    >
      <div className="h-4 w-32 rounded-md bg-muted/80" />
      <div className="h-3 w-full rounded-md bg-muted/60" />
      <div className="h-3 w-10/12 rounded-md bg-muted/70" />
      <div className="h-3 w-2/3 rounded-md bg-muted/50" />
    </div>
  );
}

function BipPostCard({
  option,
  copiedType,
  onCopy,
}: {
  option: BipPostOption;
  copiedType: BipOptionType | null;
  onCopy: (option: BipPostOption) => void;
}) {
  const style = OPTION_STYLES[option.type];
  const Icon = style.icon;
  const isCopied = copiedType === option.type;

  return (
    <article
      className={cn(
        "glass-soft group flex flex-col gap-4 rounded-2xl border border-border/50 p-5 shadow-sm transition-shadow hover:shadow-md",
        "ring-1 ring-inset",
        style.ring
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div
            className={cn(
              "flex items-center gap-2 text-sm font-semibold",
              style.accent
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {option.label}
          </div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            X · {option.text.length}/280
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="glass shrink-0 gap-1.5"
          onClick={() => onCopy(option)}
        >
          {isCopied ? (
            <CheckCircle2 className="size-3.5 text-primary" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          {isCopied ? "Copied!" : "Copy"}
        </Button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {option.text}
      </p>
    </article>
  );
}

export function BipWorkspace() {
  const { profile, leads } = useSignalFlow();
  const productDna = profile.product_dna;

  const [options, setOptions] = useState<BipPostOption[]>([]);
  const [generating, setGenerating] = useState(false);
  const [copiedType, setCopiedType] = useState<BipOptionType | null>(null);
  const [meta, setMeta] = useState<{ activeLeadCount: number } | null>(null);

  const activeLeadCount = leads.filter((l) => l.status !== "archived").length;

  async function handleGenerate() {
    setGenerating(true);
    setCopiedType(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) {
        toast.error("Sign in to generate Build in Public posts.");
        return;
      }

      const res = await fetch("/api/bip/generate", {
        method: "POST",
        headers,
      });

      const json = (await res.json()) as {
        ok?: boolean;
        options?: BipPostOption[];
        meta?: { activeLeadCount: number };
        error?: string;
      };

      if (!res.ok || !json.ok || !json.options?.length) {
        toast.error(json.error ?? "Failed to generate posts");
        return;
      }

      setOptions(json.options);
      setMeta(json.meta ?? null);
      toast.success("Today's updates are ready");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Generation failed";
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy(option: BipPostOption) {
    try {
      await navigator.clipboard.writeText(option.text);
      setCopiedType(option.type);
      toast.success("Copied!", {
        description: \`\${option.label} copied to clipboard.\`,
      });
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Megaphone className="size-6 text-primary" aria-hidden />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Build In Public Workspace
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Daily X-ready updates from your Product DNA
            {productDna ? \` · \${productDna.productName}\` : ""}.
            {activeLeadCount > 0
              ? \` \${activeLeadCount} active lead\${activeLeadCount === 1 ? "" : "s"} in pipeline.\`
              : ""}
          </p>
        </div>
        <Button
          type="button"
          size="lg"
          className="shrink-0 gap-2 shadow-md"
          disabled={generating || !productDna}
          onClick={() => void handleGenerate()}
        >
          {generating ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Sparkles className="size-4" aria-hidden />
          )}
          Generate Today&apos;s Updates
        </Button>
      </div>

      {!productDna ? (
        <div className="glass rounded-2xl border border-dashed border-border/60 px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Complete Product DNA onboarding to unlock Build in Public generation.
          </p>
        </div>
      ) : (
        <section className="glass-strong space-y-5 rounded-3xl border border-border/60 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Daily post alternatives
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Three distinct angles — copy the one that fits today&apos;s vibe.
              </p>
            </div>
            {meta ? (
              <span className="glass-soft rounded-full px-3 py-1 text-xs text-muted-foreground">
                {meta.activeLeadCount} tracked lead
                {meta.activeLeadCount === 1 ? "" : "s"} · fresh batch
              </span>
            ) : null}
          </div>

          {generating ? (
            <div className="grid gap-4 lg:grid-cols-3">
              <BipCardSkeleton />
              <BipCardSkeleton />
              <BipCardSkeleton />
            </div>
          ) : options.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {options.map((option) => (
                <BipPostCard
                  key={option.type}
                  option={option}
                  copiedType={copiedType}
                  onCopy={(item) => void handleCopy(item)}
                />
              ))}
            </div>
          ) : (
            <div className="glass-soft rounded-2xl border border-dashed border-border/50 px-6 py-16 text-center">
              <Megaphone
                className="mx-auto size-10 text-muted-foreground/50"
                aria-hidden
              />
              <p className="mt-4 text-sm font-medium text-foreground">
                No posts generated yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Hit &ldquo;Generate Today&apos;s Updates&rdquo; to draft three
                indie-hacker X posts tailored to your vault.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
`;

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, content, "utf8");
console.log("Wrote", target);
