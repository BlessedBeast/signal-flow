"use client";

import { motion } from "framer-motion";
import { Lock, Shield } from "lucide-react";

import { SectionRule } from "@/components/marketing/fade-up";
import { SECTION_FADE, staggerDelay } from "@/components/marketing/motion-presets";

const LOCKED_CHANNELS = [
  { label: "Reddit r/SaaS", x: 18 },
  { label: "Hacker News", x: 50 },
  { label: "X founder loop", x: 82 },
] as const;

function RailDiagram() {
  return (
    <div
      className="relative mx-auto aspect-[4/3] w-full max-w-md overflow-hidden rounded-xl border border-white/[0.08] bg-black/40 p-4 backdrop-blur-md"
      aria-hidden
    >
      {/* Vertical rails */}
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {LOCKED_CHANNELS.map((ch) => (
          <line
            key={ch.label}
            x1={ch.x}
            y1="8"
            x2={ch.x}
            y2="92"
            stroke="rgba(99,102,241,0.35)"
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />
        ))}
        <line
          x1="5"
          y1="50"
          x2="95"
          y2="50"
          stroke="rgba(52,211,153,0.25)"
          strokeWidth="0.5"
        />
      </svg>

      {/* Contained AI node */}
      <motion.div
        className="absolute left-1/2 top-1/2 z-10 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-primary/40 bg-primary/20 shadow-[0_0_40px_rgba(99,102,241,0.35)]"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Shield className="size-7 text-primary" />
      </motion.div>

      {/* Channel lock pills on rails */}
      {LOCKED_CHANNELS.map((ch, i) => (
        <motion.div
          key={ch.label}
          className="absolute z-20 -translate-x-1/2 rounded-full border border-emerald-500/40 bg-emerald-950/80 px-2 py-1 font-mono text-[8px] uppercase text-emerald-300"
          style={{ left: `${ch.x}%`, top: `${12 + i * 28}%` }}
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: staggerDelay(i, 0.2) }}
        >
          <span className="flex items-center gap-1">
            <Lock className="size-2.5" />
            {ch.label}
          </span>
        </motion.div>
      ))}

      {/* Wander blocked indicators */}
      <div className="absolute bottom-3 left-3 right-3 flex justify-between font-mono text-[8px] uppercase text-zinc-600">
        <span>Off-rail blocked</span>
        <span className="text-emerald-500/80">Rail lock on</span>
      </div>
    </div>
  );
}

export function StrategyLockVisual() {
  return (
    <section className="border-b border-border/40 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionRule />
        <motion.div
          {...SECTION_FADE}
          className="relative mt-10 overflow-hidden rounded-2xl border border-white/[0.1] bg-zinc-950 p-6 sm:p-10 lg:p-12"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,_rgba(99,102,241,0.22),_transparent_50%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-emerald-500/10 blur-3xl"
            aria-hidden
          />

          <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                04 · Master Strategy Blueprint
              </p>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Zero Hallucinations. Pure Strategic Rail Lock.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-400">
                During onboarding, our engine locks your application context into
                custom frameworks. Our AI never wanders—it only builds where your
                true buyers hang out.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Channel lock", "Framework rails", "DNA-bound tasks"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-zinc-400"
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>
            </div>
            <RailDiagram />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
