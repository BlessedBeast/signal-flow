"use client";

import { motion } from "framer-motion";
import { Lock, Radar } from "lucide-react";

import { SectionRule } from "@/components/marketing/fade-up";

const viewMotion = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

export function StrategyLockBanner() {
  return (
    <section className="px-6 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionRule />
        <motion.div
          {...viewMotion}
          className="relative mt-10 overflow-hidden rounded-2xl border border-white/[0.1] bg-zinc-950 p-8 sm:p-12"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.18),_transparent_55%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-20 bottom-0 size-64 rounded-full bg-primary/10 blur-3xl"
            aria-hidden
          />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-2xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                Master Strategy Blueprint
              </p>
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
                Zero Hallucinations. Pure Strategic Rail Lock.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
                During onboarding, our engine locks your application context into
                custom frameworks. Our AI never wanders—it only builds where your
                true buyers hang out.
              </p>
            </div>

            <div
              className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 backdrop-blur-md sm:min-w-[240px]"
              aria-hidden
            >
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-emerald-400">
                <Lock className="size-3.5" />
                Channel lock active
              </div>
              <div className="space-y-2">
                {["Reddit r/SaaS", "Hacker News", "X founder loop"].map(
                  (channel) => (
                    <div
                      key={channel}
                      className="flex items-center justify-between rounded-md border border-white/[0.06] px-3 py-2"
                    >
                      <span className="text-xs font-medium text-zinc-300">
                        {channel}
                      </span>
                      <Radar className="size-3.5 text-primary/80" />
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
