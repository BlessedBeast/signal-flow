"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  Copy,
  LayoutDashboard,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { SectionRule } from "@/components/marketing/fade-up";
import { SECTION_FADE } from "@/components/marketing/motion-presets";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MOCK_SCRIPT = `Hey — validation before build is the move.

We ran 40+ founder interviews on this exact question. The pattern: talk to 5 buyers in your ICP before you wireframe.

Happy to share the 3-question script we use. No pitch — just the doc.`;

export function CockpitPreviewSection() {
  const [templateOpen, setTemplateOpen] = useState(false);

  return (
    <section className="border-b border-border/40 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionRule />
        <motion.div className="mt-10 mb-10 max-w-3xl" {...SECTION_FADE}>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            02 · Cockpit preview
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-[2.65rem] lg:leading-[1.1]">
            Your Entire Growth Department. Reduced to a 30-Second Daily Checklist.
          </h2>
        </motion.div>

        <motion.div
          {...SECTION_FADE}
          transition={{ ...SECTION_FADE.transition, delay: 0.08 }}
          className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] shadow-[0_32px_100px_-32px_rgba(0,0,0,0.65)] backdrop-blur-md"
        >
          {/* App chrome */}
          <div className="flex items-center justify-between border-b border-white/[0.06] bg-zinc-950/80 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-red-500/80" aria-hidden />
              <span className="size-2.5 rounded-full bg-amber-500/80" aria-hidden />
              <span className="size-2.5 rounded-full bg-emerald-500/80" aria-hidden />
              <span className="ml-2 hidden font-mono text-[10px] uppercase tracking-wider text-zinc-500 sm:inline">
                app.signalflow.io/dashboard
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-500">
              <span className="hidden text-emerald-400/90 sm:inline">● Live</span>
              <span>Intent 94</span>
            </div>
          </div>

          <div className="flex min-h-[380px] flex-col lg:flex-row">
            {/* Mini sidebar */}
            <aside
              className="hidden w-14 shrink-0 flex-col items-center gap-4 border-r border-white/[0.06] bg-zinc-950/50 py-4 lg:flex"
              aria-hidden
            >
              <LayoutDashboard className="size-4 text-primary" />
              <Zap className="size-4 text-zinc-600" />
              <Sparkles className="size-4 text-zinc-600" />
            </aside>

            <div className="grid flex-1 lg:grid-cols-2">
              {/* Live signal feed */}
              <div className="border-b border-white/[0.06] p-4 sm:p-6 lg:border-b-0 lg:border-r">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">
                    Live signal feed
                  </p>
                  <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[9px] text-zinc-400">
                    3 queued
                  </span>
                </div>

                <motion.div
                  className="rounded-xl border border-white/[0.1] bg-zinc-900/60 p-4 ring-1 ring-primary/20"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: 0.12 }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/15 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-primary">
                      <Activity className="size-3 animate-pulse" aria-hidden />
                      r/SaaS
                    </span>
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase text-emerald-400">
                      Live match
                    </span>
                  </div>
                  <p className="mt-3 text-[15px] font-bold leading-snug tracking-tight text-white">
                    How do I validate my B2B software idea before building it?
                  </p>
                  <div className="mt-3 flex gap-4 font-mono text-[10px] text-zinc-500">
                    <span>Score 94</span>
                    <span>4.2s scrape</span>
                    <span className="text-emerald-400/80">HOT</span>
                  </div>
                </motion.div>

                <div className="mt-3 space-y-2 opacity-40" aria-hidden>
                  <div className="h-14 rounded-lg border border-white/[0.05] bg-zinc-900/40" />
                  <div className="h-14 rounded-lg border border-white/[0.05] bg-zinc-900/40" />
                </div>
              </div>

              {/* Daily task card */}
              <div className="bg-gradient-to-br from-zinc-950/80 via-zinc-900/40 to-transparent p-4 sm:p-6">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  30-second checklist
                </p>

                <div className="mt-4 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 via-white/[0.02] to-transparent p-4 shadow-[0_0_40px_-12px] shadow-primary/25">
                  <div className="flex items-start gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/20">
                      <CheckCircle2 className="size-4 text-primary" aria-hidden />
                    </div>
                    <div>
                      <p className="font-mono text-[10px] font-semibold uppercase text-primary">
                        Task 1
                      </p>
                      <p className="mt-1 text-sm font-extrabold leading-snug tracking-tight text-white">
                        Hijack Traffic via Value-Sandwich Framework
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "mt-4 w-full border-white/[0.12] bg-white/[0.04] font-mono text-[11px] font-semibold uppercase tracking-wide text-zinc-200",
                      templateOpen && "border-primary/50 bg-primary/15 text-white"
                    )}
                    onMouseEnter={() => setTemplateOpen(true)}
                    onMouseLeave={() => setTemplateOpen(false)}
                    onFocus={() => setTemplateOpen(true)}
                    onBlur={() => setTemplateOpen(false)}
                  >
                    <Sparkles className="mr-2 size-3.5 text-primary" aria-hidden />
                    [ View AI Copy Template ]
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
                        <div className="mt-3 flex gap-2 rounded-lg border border-white/[0.1] bg-zinc-950/90 p-3">
                          <p className="min-w-0 flex-1 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300 blur-[5px] select-none">
                            {MOCK_SCRIPT}
                          </p>
                          <button
                            type="button"
                            className="flex size-9 shrink-0 items-center justify-center self-start rounded-lg border border-primary/50 bg-primary/20 text-primary shadow-[0_0_20px_rgba(99,102,241,0.45)] transition-transform hover:scale-105"
                            onClick={() =>
                              toast.success("Unlock full scripts in workspace")
                            }
                            aria-label="Copy AI template"
                          >
                            <Copy className="size-4" aria-hidden />
                          </button>
                        </div>
                        <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-wider text-primary/80">
                          Premium script · Sign up to copy
                        </p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                <div className="mt-4 flex gap-2" aria-hidden>
                  <div className="h-2 flex-1 rounded-full bg-white/[0.06]">
                    <div className="h-full w-1/3 rounded-full bg-primary/60" />
                  </div>
                  <span className="font-mono text-[9px] text-zinc-500">1/3 tasks</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
