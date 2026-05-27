"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, CheckCircle2, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { SectionRule } from "@/components/marketing/fade-up";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MOCK_SCRIPT = `Hey — validation before build is the move.

We ran 40+ founder interviews on this exact question. The pattern: talk to 5 buyers in your ICP *before* you wireframe.

Happy to share the 3-question script we use. No pitch — just the doc.`;

const viewMotion = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

export function CockpitPreviewSection() {
  const [templateOpen, setTemplateOpen] = useState(false);

  return (
    <section className="border-b border-border/40 px-6 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionRule />
        <motion.div className="mt-10 mb-10 max-w-3xl" {...viewMotion}>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Interactive cockpit
          </p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
            Your Entire Growth Department. Reduced to a 30-Second Daily Checklist.
          </h2>
        </motion.div>

        <motion.div
          {...viewMotion}
          transition={{ ...viewMotion.transition, delay: 0.08 }}
          className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1 backdrop-blur-md shadow-[0_24px_80px_-24px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center gap-2 border-b border-white/[0.06] bg-muted/20 px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-red-500/80" aria-hidden />
            <span className="size-2.5 rounded-full bg-amber-500/80" aria-hidden />
            <span className="size-2.5 rounded-full bg-emerald-500/80" aria-hidden />
            <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              SignalFlow · Split dashboard
            </span>
          </div>

          <div className="grid gap-0 lg:grid-cols-2">
            {/* Live signal stream */}
            <div className="border-b border-white/[0.06] p-4 sm:p-5 lg:border-b-0 lg:border-r">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                Live signal stream
              </p>
              <div className="mt-4 rounded-xl border border-white/[0.08] bg-background/60 p-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-primary">
                    <Activity className="size-3 animate-pulse" aria-hidden />
                    r/SaaS
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-mono text-[9px] uppercase text-emerald-400">
                    Live match
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold leading-snug tracking-tight text-foreground">
                  How do I validate my B2B software idea before building it?
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Intent score 94 · Scraped 4.2s ago
                </p>
              </div>
              <div className="mt-3 space-y-2 opacity-50">
                <div className="h-10 rounded-lg border border-white/[0.05] bg-muted/20" />
                <div className="h-10 rounded-lg border border-white/[0.05] bg-muted/20" />
              </div>
            </div>

            {/* Task card */}
            <div className="p-4 sm:p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Today&apos;s execution card
              </p>
              <div className="mt-4 rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-transparent to-transparent p-4">
                <div className="flex items-start gap-2">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  <div>
                    <p className="font-mono text-[10px] uppercase text-primary">
                      Task 1
                    </p>
                    <p className="mt-1 text-sm font-bold leading-snug tracking-tight text-foreground">
                      Hijack Traffic via Value-Sandwich Framework
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className={cn(
                    "mt-4 w-full border-white/[0.12] bg-white/[0.04] font-mono text-[11px] uppercase tracking-wide",
                    templateOpen && "border-primary/40 bg-primary/10"
                  )}
                  onMouseEnter={() => setTemplateOpen(true)}
                  onMouseLeave={() => setTemplateOpen(false)}
                  onFocus={() => setTemplateOpen(true)}
                  onBlur={() => setTemplateOpen(false)}
                >
                  <Sparkles className="mr-2 size-3.5 text-primary" aria-hidden />
                  View AI Copy Template
                </Button>

                <AnimatePresence>
                  {templateOpen ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="relative mt-3 rounded-lg border border-white/[0.1] bg-background/80 p-3 backdrop-blur-sm">
                        <p className="select-none text-xs leading-relaxed text-muted-foreground blur-[2px]">
                          {MOCK_SCRIPT}
                        </p>
                        <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px]">
                          <div className="rounded-lg border border-primary/30 bg-background/90 px-3 py-2 shadow-lg shadow-primary/20">
                            <p className="max-w-[200px] text-center text-[10px] font-medium text-foreground">
                              Premium reply script — unlock in workspace
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-md border border-primary/40 bg-primary/15 text-primary shadow-[0_0_16px_rgba(var(--primary),0.35)] transition-transform hover:scale-105"
                          onClick={() =>
                            toast.success("Copy unlocked after signup")
                          }
                          aria-label="Copy AI template"
                        >
                          <Copy className="size-4" aria-hidden />
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
