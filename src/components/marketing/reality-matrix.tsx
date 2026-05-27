"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";

import { SectionRule } from "@/components/marketing/fade-up";
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

const viewMotion = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

function MatrixColumn({
  variant,
  title,
  items,
  delay = 0,
}: {
  variant: "broken" | "automated";
  title: string;
  items: readonly string[];
  delay?: number;
}) {
  const isBroken = variant === "broken";

  return (
    <motion.article
      {...viewMotion}
      transition={{ ...viewMotion.transition, delay }}
      className={cn(
        "relative flex flex-col rounded-2xl border p-6 backdrop-blur-md sm:p-8",
        "bg-white/[0.02] border-white/[0.08]",
        isBroken
          ? "shadow-[inset_0_0_0_1px_rgba(239,68,68,0.12)]"
          : "shadow-[inset_0_0_0_1px_rgba(52,211,153,0.15)]"
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-transparent to-transparent",
          isBroken ? "via-red-500/40" : "via-emerald-400/50"
        )}
        aria-hidden
      />
      <p
        className={cn(
          "font-mono text-[10px] uppercase tracking-[0.2em]",
          isBroken ? "text-red-400/90" : "text-emerald-400/90"
        )}
      >
        {isBroken ? "Status quo" : "SignalFlow"}
      </p>
      <h3 className="mt-2 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
        {title}
      </h3>
      <ul className="mt-6 space-y-4">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 text-sm font-medium leading-snug text-muted-foreground"
          >
            {isBroken ? (
              <span
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400"
                aria-hidden
              >
                <X className="size-3" strokeWidth={2.5} />
              </span>
            ) : (
              <span className="relative mt-1.5 flex size-2 shrink-0" aria-hidden>
                <span className="absolute inline-flex size-2 animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
            )}
            <span className={isBroken ? "text-red-100/70" : "text-emerald-50/80"}>
              {item}
            </span>
          </li>
        ))}
      </ul>
    </motion.article>
  );
}

export function RealityMatrixSection() {
  return (
    <section className="border-b border-border/40 px-6 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionRule />
        <motion.div className="mt-10 mb-8 max-w-2xl" {...viewMotion}>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            The reality matrix
          </p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Manual grind vs. autonomous cockpit.
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <MatrixColumn variant="broken" title="Manual Grinding" items={BROKEN} />
          <MatrixColumn
            variant="automated"
            title="Autonomous Execution"
            items={AUTOMATED}
            delay={0.06}
          />
        </div>
      </div>
    </section>
  );
}
