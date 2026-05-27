"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Sparkles, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { MicroAuditResult } from "@/lib/micro-audit/types";
import {
  buildMicroAuditSignupHref,
  persistMicroAuditHandoff,
} from "@/lib/micro-audit/storage";
type MicroAuditModalProps = {
  open: boolean;
  result: MicroAuditResult | null;
  onClose: () => void;
};

function BlurredCell({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block max-w-full select-none blur-md">{children}</span>
  );
}

export function MicroAuditModal({ open, result, onClose }: MicroAuditModalProps) {
  const teaser = result?.teaser;
  const headlineText =
    teaser?.highestIntentThreadTitle?.trim() || "Distribution leak report";
  const primaryLeakPlatform =
    teaser?.primaryLeakPlatform?.trim() || "—";
  const missedTrafficVolume =
    teaser?.missedTrafficVolume?.trim() || "—";
  const highestIntentThreadTitle =
    teaser?.highestIntentThreadTitle?.trim() || "—";

  function intentLabel(score: number): "HOT" | "WARM" | "COLD" {
    if (score >= 80) return "HOT";
    if (score >= 50) return "WARM";
    return "COLD";
  }

  function persistHandoff(signupTier?: "hobbyist") {
    if (!result) return;
    persistMicroAuditHandoff(
      {
        url: result.teaser.url,
        teaser: result.teaser,
        dna: result.dna,
        savedAt: new Date().toISOString(),
      },
      signupTier ? { signupTier } : undefined
    );
  }

  return (
    <AnimatePresence>
      {open && result ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="micro-audit-title"
        >
          <motion.button
            type="button"
            className="absolute inset-0 bg-background/70 backdrop-blur-md"
            onClick={onClose}
            aria-label="Close micro-audit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative z-10 flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border/60 glass-strong shadow-2xl"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border/50 px-6 py-5">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                  Micro-Audit · Preview
                </p>
                <h2
                  id="micro-audit-title"
                  className="mt-1 text-lg font-semibold tracking-tight text-foreground sm:text-xl"
                >
                  {headlineText}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
              <section className="glass-strong rounded-2xl border border-primary/20 p-6">
                <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                  Distribution Leak Report
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="glass-soft rounded-xl border border-border/50 p-4">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                      Primary leak platform
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {primaryLeakPlatform}
                    </p>
                  </div>
                  <div className="glass-soft rounded-xl border border-border/50 p-4">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                      Missed traffic volume
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {missedTrafficVolume}
                    </p>
                  </div>
                  <div className="glass-soft rounded-xl border border-border/50 p-4">
                    <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                      Highest intent thread
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm font-semibold text-foreground">
                      {highestIntentThreadTitle}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-foreground">
                  Our scrapers found buyers actively looking for a solution like
                  yours within the last 48 hours. You are currently entirely
                  invisible in these conversations.
                </p>
              </section>

              <section className="relative min-h-[28rem]">
                <div className="space-y-4 pb-32">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Live discussions found
                    </h3>
                    <ul className="mt-2 space-y-2">
                      {result.previewLeads.map((lead, index) => (
                        <li
                          key={`${lead.platform}-${index}`}
                          className="glass-soft rounded-xl border border-border/50 px-4 py-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="outline"
                              className="border-primary/20 bg-primary/5 font-mono text-[10px]"
                            >
                              <BlurredCell>{lead.platform}</BlurredCell>
                            </Badge>
                            <span className="font-mono text-[10px] text-rose-600">
                              {intentLabel(lead.intentScore)} · {lead.intentScore}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-foreground">
                            <BlurredCell>{lead.threadTitle}</BlurredCell>
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            <BlurredCell>{lead.draftSnippet}</BlurredCell>
                          </p>
                          <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                            <BlurredCell>{lead.sourceUrl}</BlurredCell>
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-transparent via-background/20 to-background/80" />

                <div className="absolute inset-x-4 top-1/2 z-10 -translate-y-1/2 sm:inset-x-8">
                  <div className="pointer-events-auto glass-strong mx-auto max-w-md rounded-2xl border border-primary/30 p-6 text-center shadow-xl">
                    <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Lock className="size-5" aria-hidden />
                    </div>
                    <p className="mt-4 text-sm font-semibold leading-snug text-foreground">
                      Unlock Your Live Distribution Cockpit
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      Reveal your active target traffic threads, unlock deep
                      competitor intelligence, and activate your daily
                      personalized CMO reflection engine.
                    </p>
                    <Button asChild size="lg" className="mt-5 w-full gap-2 font-semibold">
                      <Link
                        href={buildMicroAuditSignupHref()}
                        onClick={() => persistHandoff()}
                      >
                        <Sparkles className="size-4 shrink-0" aria-hidden />
                        Unlock Premium Access
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="mt-3 w-full text-xs font-normal text-muted-foreground hover:text-foreground"
                    >
                      <Link
                        href={buildMicroAuditSignupHref({ tier: "hobbyist" })}
                        onClick={() => persistHandoff("hobbyist")}
                      >
                        Continue with basic free version (1 high-intent
                        lead/day)
                      </Link>
                    </Button>
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
