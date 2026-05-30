"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  HookCompetitorBattlecard,
  HookGoldenLead,
  HookRecommendedPlaybook,
  HookResult,
} from "@/lib/onboard/hook-types";
import { markHookAuditUsed } from "@/lib/onboard/hook-types";
import { cn } from "@/lib/utils";

export type ForensicAuditModalProps = {
  open: boolean;
  url: string | null;
  onClose: () => void;
};

function buildForensicSignupHref(
  scannedUrl: string,
  tier?: "free" | "bootstrapper"
): string {
  const params = new URLSearchParams();
  if (tier) {
    params.set("tier", tier);
  }
  params.set("url", scannedUrl);
  return `/signup?${params.toString()}`;
}

function platformLabel(platform: string): string {
  const p = platform.toLowerCase();
  if (p === "hackernews") return "Hacker News";
  if (p === "reddit") return "Reddit";
  return platform;
}

/** Opaque data surfaces — readable over the modal backdrop. */
const SOLID_SECTION =
  "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5";
const SOLID_CARD =
  "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";
const SOLID_NESTED =
  "rounded-xl border border-slate-200 bg-slate-50 shadow-sm dark:border-zinc-700 dark:bg-zinc-950";
const SOLID_PLAYBOOK =
  "rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-sm dark:border-amber-500/40 dark:bg-zinc-900";

function GoldenLeadCard({ lead }: { lead: HookGoldenLead }) {
  return (
    <article className={cn(SOLID_CARD, "border-primary/25 p-4")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="outline" className="border-primary/30 bg-primary/10">
          {platformLabel(lead.platform)}
        </Badge>
        <span className="font-mono text-xs font-semibold text-primary">
          {lead.intentScore}
        </span>
      </div>

      <p className="mt-2 text-sm font-medium leading-snug text-foreground">
        {lead.title}
      </p>

      <div
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-slate-100 px-3 py-2 text-xs text-muted-foreground dark:border-zinc-600 dark:bg-zinc-950"
        role="status"
        aria-label="URL and 1-click reply locked until signup"
      >
        <Lock className="size-3 shrink-0 opacity-70" aria-hidden />
        <span>🔒 URL & 1-Click Reply Locked</span>
      </div>
    </article>
  );
}

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
      {children}
    </p>
  );
}

function MirrorField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(SOLID_NESTED, "p-3", className)}>
      <p className="font-mono text-[10px] text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm text-foreground">{children}</div>
    </div>
  );
}

function CompetitorOverviewSection({
  battlecards,
}: {
  battlecards: HookCompetitorBattlecard[];
}) {
  return (
    <section className={SOLID_SECTION}>
      <SectionEyebrow>Section 2 · Competitor overview</SectionEyebrow>
      {battlecards.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          No direct competitors surfaced from this scrape. Add rivals during
          vault setup to unlock battlecard positioning.
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {battlecards.map((competitor) => (
            <article
              key={competitor.name}
              className={cn(SOLID_CARD, "grid gap-3 p-3 sm:grid-cols-3")}
            >
              <MirrorField label="Competitor">
                <p className="font-semibold">{competitor.name}</p>
              </MirrorField>
              <MirrorField label="Positioning angle" className="sm:col-span-2">
                <p className="leading-relaxed">{competitor.positioningAngle}</p>
              </MirrorField>
              <MirrorField label="Win theme" className="sm:col-span-3">
                <p className="leading-relaxed">
                  {competitor.winTheme?.trim() ||
                    "Differentiate on speed-to-reply and founder voice."}
                </p>
              </MirrorField>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function RecommendedPlaybooksSection({
  playbooks,
  scannedUrl,
}: {
  playbooks: HookRecommendedPlaybook[];
  scannedUrl: string;
}) {
  return (
    <section className={cn(SOLID_SECTION, "space-y-3")}>
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Section 4 · Recommended playbooks
      </p>
      {playbooks.length === 0 ? (
        <article className={cn(SOLID_CARD, "p-4")}>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Playbook matching is calibrating for this URL. Sign up to unlock the
            full framework library and personalized sequence map.
          </p>
          <Button asChild className="mt-4 w-full gap-2">
            <Link href={buildForensicSignupHref(scannedUrl, "bootstrapper")}>
              Unlock the Framework Library
              <Sparkles className="size-4" aria-hidden />
            </Link>
          </Button>
        </article>
      ) : (
        <>
          <div className="space-y-3">
            {playbooks.map((playbook) => (
              <article key={playbook.slug} className={SOLID_PLAYBOOK}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-amber-700 dark:text-amber-300">
                      {playbook.slug}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-foreground">
                      {playbook.title}
                    </h3>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-amber-500/35 bg-white font-mono text-[10px] text-amber-700 dark:bg-zinc-900 dark:text-amber-300"
                  >
                    {playbook.matchScore}% match
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  {playbook.description}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className={cn(SOLID_NESTED, "px-3 py-2")}>
                    <p className="font-mono text-[10px] text-amber-700 dark:text-amber-300">
                      Projected impact
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {playbook.projectedImpact}
                    </p>
                  </div>
                  <div className={cn(SOLID_NESTED, "px-3 py-2")}>
                    <p className="font-mono text-[10px] text-amber-700 dark:text-amber-300">
                      Execution window
                    </p>
                    <p className="mt-1 text-sm text-foreground">
                      {playbook.executionWindow}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <Button asChild className="w-full gap-2">
            <Link href={buildForensicSignupHref(scannedUrl, "bootstrapper")}>
              Unlock the Full Framework Library
              <Sparkles className="size-4" aria-hidden />
            </Link>
          </Button>
        </>
      )}
    </section>
  );
}

function AuditResultsBody({
  result,
  scannedUrl,
}: {
  result: HookResult;
  scannedUrl: string;
}) {
  const brandSuffix = result.mirror.brandName.trim();
  const playbooks = result.recommendedPlaybooks ?? [];
  const battlecards = result.competitorBattlecards ?? [];

  return (
    <div className="space-y-8">
      <section className={SOLID_SECTION}>
        <SectionEyebrow>Section 1 · The mirror</SectionEyebrow>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MirrorField label="Brand">
            <p className="font-semibold">{result.mirror.brandName}</p>
          </MirrorField>
          <MirrorField label="Target persona" className="sm:col-span-2">
            <p>{result.mirror.targetPersona}</p>
          </MirrorField>
          <MirrorField label="Core friction" className="sm:col-span-3">
            <p className="font-medium">{result.mirror.coreFriction}</p>
          </MirrorField>
        </div>
      </section>

      <CompetitorOverviewSection battlecards={battlecards} />

      <section className={cn(SOLID_SECTION, "space-y-3")}>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Section 3 · Unblurred golden leads
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          We surfaced high-intent threads matching your product DNA — titles only
          in this public audit. Source URLs and the 1-click reply sequence stay
          locked until you claim your free dashboard below.
        </p>
        <div className="space-y-3">
          {result.goldenLeads.map((lead, i) => (
            <GoldenLeadCard key={`${lead.platform}-${i}`} lead={lead} />
          ))}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Continue to your free workspace to unlock thread URLs, run the AI reply
          pipeline, and release leads into your daily stream — use the signup
          options at the bottom of this audit.
        </p>
      </section>

      <RecommendedPlaybooksSection
        playbooks={playbooks}
        scannedUrl={scannedUrl}
      />

      <section className={cn(SOLID_SECTION, "space-y-3")}>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Section 5 · Blurred intent ledger
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={cn(SOLID_NESTED, "px-4 py-3")}>
            <p className="font-mono text-[10px] text-muted-foreground">
              Active threads found
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {result.fomoMetrics.totalThreadsFound}
            </p>
          </div>
          <div className={cn(SOLID_NESTED, "px-4 py-3")}>
            <p className="font-mono text-[10px] text-muted-foreground">
              Est. missed impressions
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-primary">
              {result.fomoMetrics.missedImpressionsEst.toLocaleString()}+
            </p>
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(SOLID_NESTED, "h-14 blur-md")}
              aria-hidden
            />
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 dark:border-zinc-800 sm:flex-row">
        <Button asChild className="flex-1 gap-2">
          <Link href={buildForensicSignupHref(scannedUrl, "bootstrapper")}>
            Unlock Premium Cockpit
            <Sparkles className="size-4" aria-hidden />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="flex-1 border-white/[0.12]"
        >
          <Link href={buildForensicSignupHref(scannedUrl, "free")}>
            Continue with Basic Free Version
          </Link>
        </Button>
      </div>

      {brandSuffix ? (
        <p className="sr-only">Audit complete for {brandSuffix}</p>
      ) : null}
    </div>
  );
}

export function ForensicAuditModal({
  open,
  url,
  onClose,
}: ForensicAuditModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HookResult | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runAudit = useCallback(async (targetUrl: string) => {
    setLoading(true);
    setResult(null);
    setRateLimited(false);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/onboard/hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        data?: HookResult;
        error?: string;
      };

      if (res.status === 429) {
        setRateLimited(true);
        return;
      }

      if (!res.ok || !json.ok || !json.data) {
        setErrorMessage(json.error ?? "Failed to run forensic audit");
        return;
      }

      markHookAuditUsed();
      setResult(json.data);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unexpected audit error"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !url) return;
    void runAudit(url);
  }, [open, url, runAudit]);

  function handleClose() {
    setResult(null);
    setRateLimited(false);
    setErrorMessage(null);
    onClose();
  }

  const headerTitle = loading
    ? "Running forensic distribution audit…"
    : rateLimited
      ? "Free scan limit reached"
      : result
        ? `Forensic Distribution Audit Complete${
            result.mirror.brandName.trim()
              ? ` · ${result.mirror.brandName.trim()}`
              : ""
          }`
        : errorMessage
          ? "Audit could not complete"
          : "Forensic Distribution Audit";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="forensic-audit-title"
        >
          <motion.button
            type="button"
            className="absolute inset-0 -z-10 bg-background/70 backdrop-blur-md"
            onClick={handleClose}
            aria-label="Close audit results"
          />

          <motion.div
            className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="relative z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                  SignalFlow · Public audit
                </p>
                <h2
                  id="forensic-audit-title"
                  className="mt-1 text-lg font-semibold tracking-tight text-foreground sm:text-xl"
                >
                  {headerTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="relative z-10 flex-1 overflow-y-auto bg-white px-6 py-6 dark:bg-zinc-900">
              {loading ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-3">
                  <Loader2
                    className="size-8 animate-spin text-primary"
                    aria-hidden
                  />
                  <p className="text-sm text-muted-foreground">
                    Jina scrape → Serper probes → context lock…
                  </p>
                </div>
              ) : rateLimited ? (
                <div className="space-y-6 text-center">
                  <p className="text-sm leading-relaxed text-foreground">
                    Free Scan Limit Reached. You have already run your free
                    public audit. Unlock the Premium Cockpit to run unlimited
                    scans.
                  </p>
                  <Button asChild size="lg" className="gap-2">
                    <Link
                      href={
                        url
                          ? buildForensicSignupHref(url, "bootstrapper")
                          : "/signup?tier=bootstrapper"
                      }
                    >
                      Unlock Premium Cockpit
                      <Sparkles className="size-4" aria-hidden />
                    </Link>
                  </Button>
                </div>
              ) : errorMessage ? (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-destructive">{errorMessage}</p>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Close
                  </Button>
                </div>
              ) : result && url ? (
                <AuditResultsBody result={result} scannedUrl={url} />
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
