"use client";

import { motion } from "framer-motion";
import { Ban } from "lucide-react";

import { SectionRule } from "@/components/marketing/fade-up";
import { SECTION_FADE, staggerDelay } from "@/components/marketing/motion-presets";
import { cn } from "@/lib/utils";

const BROKEN = [
  "Hunting subreddits & forums for hours",
  "Staring at a blank page writing replies",
  "Inconsistent, exhausting marketing spikes",
] as const;

const AUTOMATED = [
  "Scrapers find live buyers in 4.2 seconds",
  "AI pre-writes hyper-contextual copy drafts",
  "2 daily clicks inside a unified dashboard",
] as const;

function MatrixColumn({
  variant,
  title,
  items,
  columnDelay = 0,
}: {
  variant: "broken" | "automated";
  title: string;
  items: readonly string[];
  columnDelay?: number;
}) {
  const isBroken = variant === "broken";

  return (
    <motion.article
      {...SECTION_FADE}
      transition={{ ...SECTION_FADE.transition, delay: columnDelay }}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border p-6 backdrop-blur-md sm:p-8",
        "bg-white/[0.02] border-white/[0.08]",
        isBroken
          ? "bg-red-950/20 shadow-[inset_0_1px_0_0_rgba(248,113,113,0.25)]"
          : "bg-emerald-950/15 shadow-[inset_0_1px_0_0_rgba(52,211,153,0.3)]"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent",
          isBroken ? "from-red-500/10" : "from-emerald-500/12"
        )}
        aria-hidden
      />
      <p
        className={cn(
          "relative font-mono text-[10px] uppercase tracking-[0.2em]",
          isBroken ? "text-red-400/80" : "text-emerald-400/90"
        )}
      >
        {isBroken ? "Broken status quo" : "Autonomous future"}
      </p>
      <h3 className="relative mt-2 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h3>
      <ul className="relative mt-6 space-y-4">
        {items.map((item, index) => (
          <motion.li
            key={item}
            initial={{ opacity: 0, x: isBroken ? -8 : 8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{
              duration: 0.3,
              ease: "easeOut",
              delay: staggerDelay(index, columnDelay + 0.1),
            }}
            className="flex gap-3 text-sm font-semibold leading-snug"
          >
            {isBroken ? (
              <span
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10 text-red-400"
                aria-hidden
              >
                <Ban className="size-3" strokeWidth={2.5} />
              </span>
            ) : (
              <span className="relative mt-2 flex size-2 shrink-0" aria-hidden>
                <span className="absolute inline-flex size-2 animate-ping rounded-full bg-emerald-400/70" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              </span>
            )}
            <span
              className={cn(
                isBroken
                  ? "text-red-200/80 line-through decoration-red-500/40 decoration-1"
                  : "text-emerald-100/90"
              )}
            >
              {item}
            </span>
          </motion.li>
        ))}
      </ul>
    </motion.article>
  );
}

export function RealityMatrixSection() {
  return (
    <section className="border-b border-border/40 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionRule />
        <motion.div
          className="mt-10 mb-10 max-w-2xl"
          {...SECTION_FADE}
        >
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            01 · Reality matrix
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Two paths. One compounds.
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          <MatrixColumn variant="broken" title="Manual Grinding" items={BROKEN} />
          <MatrixColumn
            variant="automated"
            title="Autonomous Execution"
            items={AUTOMATED}
            columnDelay={0.08}
          />
        </div>
      </div>
    </section>
  );
}
