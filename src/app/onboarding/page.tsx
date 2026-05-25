"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Globe,
  Loader2,
  Pencil,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  initialDNA,
  type Platform,
  type ProductDNA,
} from "@/lib/signalflow-types";
import { getAuthHeaders } from "@/lib/api-auth";
import { normalizeVaultDnaPayload } from "@/lib/product-dna-schema";
import { useSignalFlow } from "@/lib/signalflow-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Phase = "input" | "processing" | "verify";

type StepState = "pending" | "running" | "done";

const PROCESSING_STEPS = [
  { id: "fetch", label: "Reading site with Jina AI" },
  { id: "extract", label: "Extracting Product DNA" },
  { id: "audience", label: "Profiling Ideal Customer (ICP)" },
  { id: "queries", label: "Compiling Platform Search Dorks" },
  { id: "vault", label: "Saving to Signal Vault" },
] as const;

const PLATFORM_LABELS: Record<Platform, string> = {
  reddit: "Reddit",
  x: "X",
  hackernews: "Hacker News",
  indiehackers: "Indie Hackers",
  producthunt: "Product Hunt",
};

function parseAudienceChips(audience: string): string[] {
  if (!audience.trim()) return [];
  return audience
    .split(/[,;]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinAudienceChips(chips: string[]): string {
  return chips.join(", ");
}

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, setDna, setProfile, refreshProfile } = useSignalFlow();
  const [phase, setPhase] = useState<Phase>("input");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDNA>(initialDNA);
  const [stepStates, setStepStates] = useState<StepState[]>(
    PROCESSING_STEPS.map(() => "pending")
  );
  const [progress, setProgress] = useState(0);
  const [platformInput, setPlatformInput] = useState("");
  const [audienceInput, setAudienceInput] = useState("");
  const [painPointInput, setPainPointInput] = useState("");
  const [competitorInput, setCompetitorInput] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [editingQueryIndex, setEditingQueryIndex] = useState<number | null>(null);
  const [queryEditValue, setQueryEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const runIdRef = useRef(0);

  useEffect(() => {
    if (profile.product_dna) {
      setDraft(profile.product_dna);
      setPhase("verify");
    }
  }, [profile.product_dna]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const runProcessing = useCallback(
    async (targetUrl: string) => {
      const runId = ++runIdRef.current;
      setPhase("processing");
      setStepStates(
        PROCESSING_STEPS.map((_, i) => (i === 0 ? "running" : "pending"))
      );
      setProgress(12);
      setError(null);

      try {
        const headers = await getAuthHeaders();
        if (!headers.Authorization) {
          throw new Error("Sign in to analyze and save your Product DNA.");
        }

        const res = await fetch("/api/onboard/analyze", {
          method: "POST",
          headers,
          body: JSON.stringify({ url: targetUrl }),
        });

        const data = (await res.json()) as {
          ok?: boolean;
          dna?: ProductDNA;
          productName?: string;
          error?: string;
          details?: string;
        };

        if (runIdRef.current !== runId) return;

        if (res.ok && data) {
          const extractedDna = data.dna
            ? data.dna
            : data.productName
              ? (data as ProductDNA)
              : null;

          if (extractedDna) {
            setStepStates(PROCESSING_STEPS.map(() => "done"));
            setProgress(100);
            setDraft(extractedDna);
            setPhase("verify");
            toast.success(
              "Product DNA extracted — review and edit before saving"
            );
          } else {
            console.error(
              "Payload structure did not match expected ProductDNA properties",
              data
            );
            toast.error(
              "Received an unrecognized data blueprint layout from the server."
            );
            setPhase("input");
          }
        } else {
          throw new Error(
            data?.error ||
              data?.details ||
              "Failed to analyze target website configuration."
          );
        }
      } catch (err) {
        if (runIdRef.current !== runId) return;
        const message =
          err instanceof Error ? err.message : "Analysis failed";
        setError(message);
        setPhase("input");
        toast.error(message);
      }
    },
    []
  );

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
    };
  }, []);

  function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Enter your product URL to continue.");
      return;
    }
    void runProcessing(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  }

  function togglePlatform(platform: Platform) {
    setDraft((prev) => {
      const has = prev.targetPlatforms.includes(platform);
      return {
        ...prev,
        targetPlatforms: has
          ? prev.targetPlatforms.filter((p) => p !== platform)
          : [...prev.targetPlatforms, platform],
      };
    });
  }

  function addPlatformChip() {
    const value = platformInput.trim().toLowerCase();
    if (!value) return;
    const map: Record<string, Platform> = {
      reddit: "reddit",
      x: "x",
      twitter: "x",
      hackernews: "hackernews",
      hn: "hackernews",
      indiehackers: "indiehackers",
      ih: "indiehackers",
      producthunt: "producthunt",
      ph: "producthunt",
    };
    const platform = map[value];
    if (platform && !draft.targetPlatforms.includes(platform)) {
      setDraft((prev) => ({
        ...prev,
        targetPlatforms: [...prev.targetPlatforms, platform],
      }));
    }
    setPlatformInput("");
  }

  function addQueryChip() {
    const value = queryInput.trim();
    if (!value) return;
    setDraft((prev) => ({
      ...prev,
      activeSerperQueries: [...prev.activeSerperQueries, value],
    }));
    setQueryInput("");
  }

  function addAudienceChip() {
    const value = audienceInput.trim();
    if (!value) return;
    const chips = parseAudienceChips(draft.audience);
    if (chips.includes(value)) {
      setAudienceInput("");
      return;
    }
    setDraft((prev) => ({
      ...prev,
      audience: joinAudienceChips([...chips, value]),
    }));
    setAudienceInput("");
  }

  function removeAudienceChip(index: number) {
    const chips = parseAudienceChips(draft.audience);
    chips.splice(index, 1);
    setDraft((prev) => ({ ...prev, audience: joinAudienceChips(chips) }));
  }

  function addPainPointChip() {
    const value = painPointInput.trim();
    if (!value) return;
    if (draft.painPoints.includes(value)) {
      setPainPointInput("");
      return;
    }
    setDraft((prev) => ({
      ...prev,
      painPoints: [...prev.painPoints, value],
    }));
    setPainPointInput("");
  }

  function removePainPoint(index: number) {
    setDraft((prev) => ({
      ...prev,
      painPoints: prev.painPoints.filter((_, i) => i !== index),
    }));
  }

  function addCompetitorChip() {
    const value = competitorInput.trim();
    if (!value) return;
    if (draft.competitors.includes(value)) {
      setCompetitorInput("");
      return;
    }
    setDraft((prev) => ({
      ...prev,
      competitors: [...prev.competitors, value],
    }));
    setCompetitorInput("");
  }

  function removeCompetitor(index: number) {
    setDraft((prev) => ({
      ...prev,
      competitors: prev.competitors.filter((_, i) => i !== index),
    }));
  }

  async function saveToVault() {
    setIsSaving(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) {
        toast.error("Sign in to save your Product DNA.");
        return;
      }

      const vaultDna = normalizeVaultDnaPayload(draft);

      let res: Response;
      try {
        res = await fetch("/api/onboard/vault", {
          method: "POST",
          headers,
          body: JSON.stringify({ dna: vaultDna, is_mining: false }),
        });
      } catch {
        toast.error("Failed to secure vault workspace configuration.");
        return;
      }

      let json: { ok?: boolean; error?: string };
      try {
        json = (await res.json()) as { ok?: boolean; error?: string };
      } catch {
        toast.error("Failed to secure vault workspace configuration.");
        return;
      }

      if (!res.ok || !json.ok) {
        toast.error("Failed to secure vault workspace configuration.");
        return;
      }

      setDna(vaultDna);
      setProfile({ product_dna: vaultDna, is_mining: false });
      await refreshProfile();
      toast.success("Product DNA secured. Vault initialized.");
      router.push("/stream/dashboard");
    } catch {
      toast.error("Failed to secure vault workspace configuration.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-0 bg-transparent">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <Zap size={16} className="text-primary-foreground" aria-hidden />
            </span>
            SignalFlow
          </Link>
          <Link
            href="/stream/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Skip to pipeline
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-4">
        {phase === "input" && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Map your Product DNA
              </h1>
              <p className="text-muted-foreground">
                Paste your site URL — we will debrief positioning, ICP, and
                search operators.
              </p>
            </div>

            <form onSubmit={handleAnalyze} className="glass rounded-2xl p-6 sm:p-8">
              <Label htmlFor="product-url" className="text-xs uppercase tracking-widest text-muted-foreground">
                Product URL
              </Label>
              <div className="mt-3 flex gap-3">
                <div className="glass-soft flex size-11 shrink-0 items-center justify-center rounded-xl">
                  <Globe className="size-5 text-primary" aria-hidden />
                </div>
                <Input
                  id="product-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourstartup.com"
                  className="h-11 flex-1 glass-soft border-0"
                  disabled={phase !== "input"}
                />
              </div>
              {error && (
                <p className="mt-3 text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="mt-6 w-full" size="lg">
                <Sparkles className="size-4" aria-hidden />
                Analyze site
              </Button>
            </form>
          </div>
        )}

        {phase === "processing" && (
          <div className="glass rounded-2xl p-6 sm:p-8 space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Building your signal profile
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sequential AI debrief in progress…
              </p>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>

            <ul className="space-y-3">
              {PROCESSING_STEPS.map((step, index) => {
                const state = stepStates[index];
                return (
                  <li
                    key={step.id}
                    className={cn(
                      "glass-soft flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors",
                      state === "running" && "ring-1 ring-primary/30",
                      state === "done" && "opacity-90"
                    )}
                  >
                    {state === "done" ? (
                      <CheckCircle2
                        className="size-4 shrink-0 text-primary animate-in fade-in zoom-in-50 duration-300"
                        aria-hidden
                      />
                    ) : state === "running" ? (
                      <Loader2
                        className="size-4 shrink-0 animate-spin text-primary"
                        aria-hidden
                      />
                    ) : (
                      <span
                        className="size-4 shrink-0 rounded-full border border-border"
                        aria-hidden
                      />
                    )}
                    <span
                      className={cn(
                        state === "pending"
                          ? "text-muted-foreground"
                          : "text-foreground font-medium"
                      )}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {phase === "verify" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">
                Verify Product DNA
              </h2>
              <p className="text-sm text-muted-foreground">
                Tune identity metadata and operators before saving to your vault.
              </p>
            </div>

            <section className="glass rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Identity
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="productName">Product name</Label>
                  <Input
                    id="productName"
                    value={draft.productName}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, productName: e.target.value }))
                    }
                    className="glass-soft"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="dna-url">Website URL</Label>
                  <Input
                    id="dna-url"
                    value={draft.url}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, url: e.target.value }))
                    }
                    className="glass-soft"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="oneLiner">One-liner</Label>
                  <Textarea
                    id="oneLiner"
                    value={draft.oneLiner}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, oneLiner: e.target.value }))
                    }
                    className="min-h-[72px] glass-soft resize-none"
                  />
                </div>
              </div>
            </section>

            <section className="glass rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Target audience
              </h3>
              <div className="flex flex-wrap gap-2">
                {parseAudienceChips(draft.audience).map((chip, index) => (
                  <span
                    key={`${chip}-${index}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {chip}
                    <button
                      type="button"
                      onClick={() => removeAudienceChip(index)}
                      className="rounded-full hover:bg-primary/20"
                      aria-label={`Remove ${chip}`}
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={audienceInput}
                  onChange={(e) => setAudienceInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addAudienceChip())
                  }
                  placeholder="e.g. B2B SaaS founders"
                  className="glass-soft h-9"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="glass-soft shrink-0"
                  onClick={addAudienceChip}
                >
                  Add
                </Button>
              </div>
            </section>

            <section className="glass rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Pain points
              </h3>
              <div className="flex flex-wrap gap-2">
                {draft.painPoints.map((point, index) => (
                  <span
                    key={`${point}-${index}`}
                    className="inline-flex items-center gap-1.5 rounded-full glass-soft px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {point}
                    <button
                      type="button"
                      onClick={() => removePainPoint(index)}
                      className="rounded-full hover:bg-accent"
                      aria-label={`Remove pain point`}
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={painPointInput}
                  onChange={(e) => setPainPointInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && (e.preventDefault(), addPainPointChip())
                  }
                  placeholder="Add a target pain point"
                  className="glass-soft h-9"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="glass-soft shrink-0"
                  onClick={addPainPointChip}
                >
                  Add
                </Button>
              </div>
            </section>

            <section className="glass rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Competitors Identified
              </h3>
              <div className="flex flex-wrap gap-2">
                {draft.competitors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No competitors yet — add brands your prospects compare against.
                  </p>
                ) : (
                  draft.competitors.map((name, index) => (
                    <span
                      key={`${name}-${index}`}
                      className="inline-flex items-center gap-1.5 rounded-full glass-soft px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => removeCompetitor(index)}
                        className="rounded-full hover:bg-accent"
                        aria-label={`Remove ${name}`}
                      >
                        <X className="size-3" aria-hidden />
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={competitorInput}
                  onChange={(e) => setCompetitorInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    (e.preventDefault(), addCompetitorChip())
                  }
                  placeholder="e.g. Linear"
                  className="glass-soft h-9"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="glass-soft shrink-0"
                  onClick={addCompetitorChip}
                >
                  Add
                </Button>
              </div>
            </section>

            <section className="glass rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Target platforms
              </h3>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PLATFORM_LABELS) as Platform[]).map((platform) => {
                  const active = draft.targetPlatforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => togglePlatform(platform)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "glass-soft text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {PLATFORM_LABELS[platform]}
                      {active && <X className="size-3" aria-hidden />}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={platformInput}
                  onChange={(e) => setPlatformInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPlatformChip())}
                  placeholder="Add platform (reddit, x, hn)"
                  className="glass-soft h-9"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="glass-soft shrink-0"
                  onClick={addPlatformChip}
                >
                  Add
                </Button>
              </div>
            </section>

            <section className="glass rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Serper query operators
              </h3>
              <ul className="space-y-2">
                {draft.activeSerperQueries.map((query, index) => (
                  <li
                    key={`${index}-${query.slice(0, 12)}`}
                    className="glass-soft group flex items-start gap-2 rounded-xl px-3 py-2.5"
                  >
                    {editingQueryIndex === index ? (
                      <Input
                        value={queryEditValue}
                        onChange={(e) => setQueryEditValue(e.target.value)}
                        className="h-8 flex-1 font-mono text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setDraft((p) => ({
                              ...p,
                              activeSerperQueries: p.activeSerperQueries.map((q, i) =>
                                i === index ? queryEditValue : q
                              ),
                            }));
                            setEditingQueryIndex(null);
                          }
                        }}
                      />
                    ) : (
                      <code className="flex-1 font-mono text-xs text-foreground leading-relaxed">
                        {query}
                      </code>
                    )}
                    <div className="flex shrink-0 gap-1 opacity-70 group-hover:opacity-100">
                      <button
                        type="button"
                        className="rounded-md p-1 hover:bg-accent"
                        onClick={() => {
                          setEditingQueryIndex(index);
                          setQueryEditValue(query);
                        }}
                        aria-label="Edit query"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1 hover:bg-accent"
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            activeSerperQueries: p.activeSerperQueries.filter(
                              (_, i) => i !== index
                            ),
                          }))
                        }
                        aria-label="Remove query"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addQueryChip())}
                  placeholder="site:reddit.com (validate OR validation) (startup OR idea)"
                  className="glass-soft h-9 font-mono text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="glass-soft shrink-0"
                  onClick={addQueryChip}
                >
                  Add
                </Button>
              </div>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="glass-soft flex-1"
                onClick={() => setPhase("input")}
              >
                Back
              </Button>
              <Button
                type="button"
                className="flex-1 gap-2"
                disabled={isSaving}
                onClick={() => void saveToVault()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  "Save & start mining"
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
