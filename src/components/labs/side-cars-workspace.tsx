"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Box,
  CheckCircle2,
  Construction,
  Copy,
  Cpu,
  Loader2,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/api-auth";
import type { SideCarBlueprint } from "@/lib/labs/side-cars-pipeline";
import { useSignalFlow } from "@/lib/signalflow-store";
import { cn } from "@/lib/utils";

export function SideCarsWorkspace() {
  const { profile } = useSignalFlow();
  const dna = profile.product_dna;

  const [blueprint, setBlueprint] = useState<SideCarBlueprint | null>(null);
  const [isForging, setIsForging] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  const copyMasterPrompt = useCallback(async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt.trim());
      setPromptCopied(true);
      toast.success("Master prompt copied — paste into Lovable.dev");
      window.setTimeout(() => setPromptCopied(false), 2500);
    } catch {
      toast.error("Could not copy prompt — check browser permissions");
    }
  }, []);

  async function handleForge() {
    if (isForging) return;

    if (!dna) {
      toast.error(
        "Complete Product DNA onboarding before forging a lead magnet blueprint."
      );
      return;
    }

    setIsForging(true);
    toast.info("Architecting lead magnet blueprint...");

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/labs/side-cars", {
        method: "POST",
        headers,
      });

      const json = (await res.json()) as {
        ok?: boolean;
        data?: SideCarBlueprint;
        error?: string;
        step?: string;
      };

      if (json.step === "onboarding-required") {
        toast.error(
          json.error ?? "Product DNA required — complete onboarding first."
        );
        return;
      }

      if (!res.ok || !json.ok || !json.data) {
        toast.error(json.error ?? "Failed to forge lead magnet blueprint");
        return;
      }

      setBlueprint(json.data);
      toast.success(
        `Blueprint ready: "${json.data.toolName}" — copy the Lovable prompt to ship`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected forge error";
      toast.error(message);
    } finally {
      setIsForging(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-6 rounded-xl glass p-5">
        <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <Box className="size-3.5 text-primary" aria-hidden />
          Growth Labs · Side-Car Factory
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Lead Magnet Blueprint Generator
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          The Side-Car Factory architects viral micro-tool blueprints and
          Lovable.dev master prompts — not raw HTML. Ship a free lead magnet
          funnel in minutes, then capture signups with programmatic SEO.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className="rounded-xl glass p-6">
          <h2 className="font-semibold tracking-tight text-foreground">
            Growth Blueprint Deck
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Active funnel metadata minted from your Product DNA vault.
          </p>

          {!dna ? (
            <div className="mt-6 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center">
              <p className="text-xs text-muted-foreground">
                Product DNA required to engineer a lead magnet blueprint.
              </p>
              <Button asChild className="mt-4" size="sm" disabled={isForging}>
                <Link href="/onboarding">Initialize vault</Link>
              </Button>
            </div>
          ) : blueprint ? (
            <article className="glass-soft mt-6 space-y-4 rounded-xl border border-border/50 p-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Tool codename
                </p>
                <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
                  {blueprint.toolName}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Vault product
                </p>
                <p className="mt-1 text-sm text-foreground">{dna.productName}</p>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  {dna.url}
                </p>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {blueprint.conceptPitch}
                </p>
              </div>
            </article>
          ) : (
            <div className="mt-6 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center">
              <Sparkles className="mx-auto size-8 text-muted-foreground/60" aria-hidden />
              <p className="mt-3 text-sm font-medium text-foreground">
                No blueprint forged yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Generate your first viral micro-tool growth spec.
              </p>
            </div>
          )}

          <Button
            type="button"
            className="mt-6 w-full gap-2"
            disabled={isForging || !dna}
            onClick={() => void handleForge()}
          >
            <Cpu
              className={cn("size-4 shrink-0", isForging && "animate-spin")}
              aria-hidden
            />
            {isForging ? "Forging blueprint..." : "Forge New Lead Magnet"}
          </Button>
        </section>

        <section className="relative rounded-xl glass p-6">
          <h2 className="font-semibold tracking-tight text-foreground">
            Lead Magnet Terminal Spec Sheet
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Strategic overview and Lovable prompt engine output.
          </p>

          <div className="relative mt-6 min-h-[420px]">
            {isForging ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg glass-strong backdrop-blur-sm">
                <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
                <p className="text-sm font-medium text-foreground">
                  Architecting lead magnet blueprint...
                </p>
              </div>
            ) : null}

            {!blueprint && !isForging ? (
              <div className="flex min-h-[380px] flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
                <Construction className="size-10 text-muted-foreground/60" aria-hidden />
                <p className="mt-4 text-sm font-medium text-foreground">
                  Factory Core Dormant
                </p>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  Forge a blueprint to populate the spec sheet with SEO strategy
                  and your Lovable master prompt.
                </p>
              </div>
            ) : blueprint ? (
              <div className="max-h-[560px] space-y-4 overflow-y-auto pr-1">
                <article className="glass-strong space-y-4 rounded-xl p-5">
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-primary" aria-hidden />
                    <h3 className="text-sm font-semibold tracking-tight text-foreground">
                      Strategic Overview
                    </h3>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Viral concept pitch
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {blueprint.conceptPitch}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      Programmatic SEO & email-gate strategy
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {blueprint.seoKeywordsAndCaptureStrategy}
                    </p>
                  </div>
                </article>

                <article className="glass-strong relative space-y-4 rounded-xl p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Wand2 className="size-4 text-primary" aria-hidden />
                      <h3 className="text-sm font-semibold tracking-tight text-foreground">
                        Lovable Prompt Engine
                      </h3>
                    </div>
                    <Button
                      type="button"
                      className="gap-2"
                      disabled={isForging}
                      onClick={() =>
                        void copyMasterPrompt(blueprint.lovableMasterPrompt)
                      }
                    >
                      {promptCopied ? (
                        <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                      ) : (
                        <Copy className="size-4 shrink-0" aria-hidden />
                      )}
                      {promptCopied
                        ? "Copied!"
                        : "Copy Master Prompt for Lovable"}
                    </Button>
                  </div>
                  <pre className="max-h-[320px] overflow-auto rounded-lg border border-border/50 bg-muted/30 p-4">
                    <code className="block whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">
                      {blueprint.lovableMasterPrompt}
                    </code>
                  </pre>
                </article>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
