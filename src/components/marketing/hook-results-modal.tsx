"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Loader2, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HookResult } from "@/lib/onboard/hook-types";
import { markHookAuditUsed } from "@/lib/onboard/hook-types";

type HookResultsModalProps = {
  open: boolean;
  url: string | null;
  onClose: () => void;
};

function platformLabel(platform: string): string {
  const p = platform.toLowerCase();
  if (p === "hackernews") return "Hacker News";
  if (p === "reddit") return "Reddit";
  return platform;
}

export function HookResultsModal({ open, url, onClose }: HookResultsModalProps) {
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
          aria-labelledby="hook-results-title"
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-background/70 backdrop-blur-md"
            onClick={handleClose}
            aria-label="Close audit results"
          />

          <motion.div
            className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] shadow-2xl backdrop-blur-md"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] px-6 py-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                  Forensic organic audit
                </p>
                <h2
                  id="hook-results-title"
                  className="mt-1 text-lg font-semibold tracking-tight text-foreground sm:text-xl"
                >
                  {loading
                    ? "Scanning your distribution surface…"
                    : rateLimited
                      ? "Free scan limit reached"
                      : "Your traffic leak report"}
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

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {loading ? (
                <div className="flex min-h-[280px] flex-col items-center justify-center gap-3">
                  <Loader2
                    className="size-8 animate-spin text-primary"
                    aria-hidden
                  />
                  <p className="text-sm text-muted-foreground">
                    Running Jina scrape, Serper probes, and context lock…
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
                    <Link href="/signup">
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
              ) : result ? (
                <div className="space-y-8">
                  <section className="space-y-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                      AI context lock achieved
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                        <p className="font-mono text-[10px] text-muted-foreground">
                          Brand
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {result.mirror.brandName}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 sm:col-span-2">
                        <p className="font-mono text-[10px] text-muted-foreground">
                          Target persona
                        </p>
                        <p className="mt-1 text-sm text-foreground">
                          {result.mirror.targetPersona}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 sm:col-span-3">
                        <p className="font-mono text-[10px] text-muted-foreground">
                          Core friction
                        </p>
                        <p className="mt-1 text-sm font-medium text-foreground">
                          {result.mirror.coreFriction}
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      Proof of life · unblurred
                    </p>
                    <div className="space-y-3">
                      {result.goldenLeads.map((lead, i) => (
                        <article
                          key={`${lead.platform}-${i}`}
                          className="rounded-xl border border-primary/25 bg-primary/5 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Badge
                              variant="outline"
                              className="border-primary/30 bg-primary/10"
                            >
                              {platformLabel(lead.platform)}
                            </Badge>
                            <span className="font-mono text-xs font-semibold text-primary">
                              {lead.intentScore}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-medium leading-snug text-foreground">
                            {lead.title}
                          </p>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">
                        We found {result.fomoMetrics.totalThreadsFound} other
                        active conversations.
                      </p>
                      <p className="mt-1 text-sm text-primary">
                        Est. Missed Impressions:{" "}
                        {result.fomoMetrics.missedImpressionsEst.toLocaleString()}
                        +
                      </p>
                    </div>
                    <div className="space-y-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-14 rounded-xl border border-white/[0.06] bg-white/[0.02] blur-md"
                          aria-hidden
                        />
                      ))}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <p className="text-sm leading-relaxed text-foreground">
                        {result.strategyTeaser.unblurredDiagnosis}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
                      <Lock className="size-4 shrink-0 text-muted-foreground" />
                      <p className="select-none text-sm text-muted-foreground blur-sm">
                        {result.strategyTeaser.blurredPlaybookName}
                      </p>
                    </div>
                  </section>

                  <div className="flex flex-col gap-3 border-t border-white/[0.08] pt-6 sm:flex-row">
                    <Button asChild className="flex-1 gap-2">
                      <Link href="/signup">
                        Unlock Master Blueprint & Draft 1st Reply
                        <Sparkles className="size-4" aria-hidden />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="flex-1 border-white/[0.12]"
                    >
                      <Link href="/signup?tier=hobbyist">
                        Continue with Basic Free Version
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
