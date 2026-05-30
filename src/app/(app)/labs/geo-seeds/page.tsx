"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Copy,
  Globe,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { TierGatedTool } from "@/components/billing/tier-gated-tool";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { getAuthHeaders } from "@/lib/api-auth";
import type { GeoSeed } from "@/lib/labs/geo-seeds-pipeline";
import { useSignalFlow } from "@/lib/signalflow-store";
import { cn } from "@/lib/utils";

type SeedDraft = GeoSeed & { id: string };

type CopyKind = "narrative" | "schema";

function FootprintCard({
  index,
  draft,
  copiedKind,
  disabled,
  onCopyNarrative,
  onCopySchema,
  onNarrativeChange,
}: {
  index: number;
  draft: SeedDraft;
  copiedKind: { index: number; kind: CopyKind } | null;
  disabled: boolean;
  onCopyNarrative: (index: number, text: string) => void;
  onCopySchema: (index: number, text: string) => void;
  onNarrativeChange: (index: number, text: string) => void;
}) {
  const narrativeCopied =
    copiedKind?.index === index && copiedKind.kind === "narrative";
  const schemaCopied =
    copiedKind?.index === index && copiedKind.kind === "schema";

  return (
    <article className="glass-strong space-y-4 rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Badge
          variant="outline"
          className="border-primary/25 bg-primary/10 text-foreground"
        >
          {draft.distributionTarget}
        </Badge>
      </div>

      <code className="block rounded-lg border border-border/50 bg-muted/30 px-3 py-2 font-mono text-xs text-primary">
        {draft.keywordAnchor}
      </code>

      <Tabs defaultValue="human" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted/40 p-1">
          <TabsTrigger value="human" className="text-xs sm:text-sm">
            Human Semantic Layer
          </TabsTrigger>
          <TabsTrigger value="machine" className="text-xs sm:text-sm">
            Machine Indexing Layer
          </TabsTrigger>
        </TabsList>

        <TabsContent value="human" className="mt-4 space-y-3">
          <Textarea
            value={draft.seedNarrative}
            onChange={(e) => onNarrativeChange(index, e.target.value)}
            disabled={disabled}
            className="min-h-[180px] resize-y leading-relaxed"
            aria-label={`Seed narrative ${index + 1}`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="glass w-full gap-1.5 sm:w-auto"
            disabled={disabled}
            onClick={() => onCopyNarrative(index, draft.seedNarrative)}
          >
            {narrativeCopied ? (
              <CheckCircle2 className="size-3.5 text-primary" aria-hidden />
            ) : (
              <Copy className="size-3.5" aria-hidden />
            )}
            {narrativeCopied ? "Copied!" : "Copy narrative"}
          </Button>
        </TabsContent>

        <TabsContent value="machine" className="mt-4 space-y-3">
          <div
            className={cn(
              "max-h-[280px] overflow-auto rounded-xl border border-white/[0.08]",
              "bg-white/[0.02] p-4 backdrop-blur-md"
            )}
          >
            <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
              {draft.jsonLdSchema}
            </pre>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full gap-1.5 border-primary/25 bg-primary/5 sm:w-auto"
            disabled={disabled}
            onClick={() => onCopySchema(index, draft.jsonLdSchema)}
          >
            {schemaCopied ? (
              <CheckCircle2 className="size-3.5 text-primary" aria-hidden />
            ) : (
              <span aria-hidden>💻</span>
            )}
            {schemaCopied
              ? "Copied!"
              : "Copy JSON-LD Schema"}
          </Button>
        </TabsContent>
      </Tabs>
    </article>
  );
}

export default function GeoSeedsPage() {
  const { profile } = useSignalFlow();
  const dna = profile.product_dna;

  const [seeds, setSeeds] = useState<SeedDraft[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKind, setCopiedKind] = useState<{
    index: number;
    kind: CopyKind;
  } | null>(null);

  const dnaSummary = useMemo(() => {
    if (!dna) return null;
    return {
      keywords: dna.keywords,
      painPoints: dna.painPoints,
      productName: dna.productName,
      url: dna.url,
    };
  }, [dna]);

  const updateNarrative = useCallback((index: number, text: string) => {
    setSeeds((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, seedNarrative: text } : item
      )
    );
  }, []);

  const copyNarrative = useCallback(async (index: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text.trim());
      setCopiedKind({ index, kind: "narrative" });
      toast.success("Seed narrative copied to clipboard");
      window.setTimeout(() => setCopiedKind(null), 2000);
    } catch {
      toast.error("Could not copy narrative — check browser permissions");
    }
  }, []);

  const copySchema = useCallback(async (index: number, text: string) => {
    try {
      await navigator.clipboard.writeText(text.trim());
      setCopiedKind({ index, kind: "schema" });
      toast.success(
        "Schema asset loaded to clipboard. Embed this code in your target landing page header."
      );
      window.setTimeout(() => setCopiedKind(null), 2000);
    } catch {
      toast.error("Could not copy schema — check browser permissions");
    }
  }, []);

  async function handleSynthesize() {
    if (isGenerating) return;

    if (!dna) {
      toast.error(
        "Complete Product DNA onboarding before synthesizing footprints."
      );
      return;
    }

    setIsGenerating(true);
    toast.info("Simulating LLM embedding indexing...");

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/labs/geo-seeds", {
        method: "POST",
        headers,
      });

      const json = (await res.json()) as {
        ok?: boolean;
        data?: GeoSeed[];
        error?: string;
        step?: string;
      };

      if (json.step === "onboarding-required") {
        toast.error(
          json.error ?? "Product DNA required — complete onboarding first."
        );
        return;
      }

      if (!res.ok || !json.ok || !json.data?.length) {
        toast.error(json.error ?? "Failed to synthesize search footprints");
        return;
      }

      setSeeds(
        json.data.map((seed, index) => ({
          ...seed,
          id: `geo-seed-${index}-${Date.now()}`,
        }))
      );
      toast.success(
        `Synthesized ${json.data.length} dual-asset GEO footprint${json.data.length === 1 ? "" : "s"}`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected synthesis error";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <TierGatedTool minimumTier="founder" moduleLabel="GEO Seed Engine">
      <div className="space-y-6">
        <div className="mb-6 rounded-xl glass p-5">
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            <Globe className="size-3.5 text-primary" aria-hidden />
            Growth Labs · GEO Engine
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            GEO Seed Engine
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Dual-asset blueprints: human-readable narratives plus machine-readable
            JSON-LD schema blocks for Answer Engine indexing.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <section className="rounded-xl glass p-6">
            <h2 className="font-semibold tracking-tight text-foreground">
              Engine Core Validation
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Active Product DNA keywords and pain anchors feeding the synthesis
              pipeline.
            </p>

            {!dnaSummary ? (
              <div className="mt-6 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center">
                <p className="font-mono text-xs text-muted-foreground">
                  No Product DNA in vault.
                </p>
                <Button
                  asChild
                  className="mt-4"
                  size="sm"
                  disabled={isGenerating}
                >
                  <Link href="/onboarding">Initialize vault</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Product
                  </p>
                  <p className="mt-1 font-mono text-xs text-foreground">
                    {dnaSummary.productName}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {dnaSummary.url}
                  </p>
                </div>

                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Keywords
                  </p>
                  <ul className="mt-2 space-y-1">
                    {dnaSummary.keywords.length > 0 ? (
                      dnaSummary.keywords.map((keyword) => (
                        <li
                          key={keyword}
                          className="font-mono text-xs text-muted-foreground"
                        >
                          · {keyword}
                        </li>
                      ))
                    ) : (
                      <li className="font-mono text-xs text-muted-foreground">
                        · (none indexed)
                      </li>
                    )}
                  </ul>
                </div>

                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Pain anchors
                  </p>
                  <ul className="mt-2 space-y-1">
                    {dnaSummary.painPoints.length > 0 ? (
                      dnaSummary.painPoints.map((point) => (
                        <li
                          key={point}
                          className="font-mono text-xs text-muted-foreground"
                        >
                          · {point}
                        </li>
                      ))
                    ) : (
                      <li className="font-mono text-xs text-muted-foreground">
                        · (none indexed)
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            <Button
              type="button"
              className="mt-6 w-full gap-2"
              disabled={isGenerating || !dna}
              onClick={() => void handleSynthesize()}
            >
              <Sparkles
                className={cn("size-4 shrink-0", isGenerating && "animate-spin")}
                aria-hidden
              />
              {isGenerating
                ? "Synthesizing footprints..."
                : "Synthesize Search Footprints"}
            </Button>
          </section>

          <section className="relative rounded-xl glass p-6">
            <h2 className="font-semibold tracking-tight text-foreground">
              Live Footprint Ledger
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Dual-asset seeds: semantic copy and JSON-LD markup per footprint.
            </p>

            <div className="relative mt-6 min-h-[360px]">
              {isGenerating ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg glass-strong backdrop-blur-sm">
                  <Loader2
                    className="size-8 animate-spin text-primary"
                    aria-hidden
                  />
                  <p className="text-sm font-medium text-foreground">
                    Simulating LLM embedding indexing...
                  </p>
                </div>
              ) : null}

              {seeds.length === 0 && !isGenerating ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
                  <Activity
                    className="size-10 text-muted-foreground/60"
                    aria-hidden
                  />
                  <p className="mt-4 text-sm font-medium text-foreground">
                    Footprint Ledger Empty
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    Run synthesis from the operator console to populate GEO
                    footprint cards here.
                  </p>
                </div>
              ) : (
                <div className="max-h-[640px] space-y-4 overflow-y-auto pr-1">
                  {seeds.map((draft, index) => (
                    <FootprintCard
                      key={draft.id}
                      index={index}
                      draft={draft}
                      copiedKind={copiedKind}
                      disabled={isGenerating}
                      onCopyNarrative={(i, text) => void copyNarrative(i, text)}
                      onCopySchema={(i, text) => void copySchema(i, text)}
                      onNarrativeChange={updateNarrative}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </TierGatedTool>
  );
}
