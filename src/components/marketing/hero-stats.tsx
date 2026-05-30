"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

import { FadeUp } from "@/components/marketing/fade-up";
import { cn } from "@/lib/utils";

function useInViewOnce(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: threshold });
  return { ref, inView };
}

function StatTwoMin() {
  return (
    <div className="text-[32px] font-bold leading-none tracking-tight text-foreground">
      2 min
    </div>
  );
}

function StatTypewriter({
  text,
  charDelay = 80,
}: {
  text: string;
  charDelay?: number;
}) {
  const { ref, inView } = useInViewOnce();
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!inView) return;
    setDisplay("");
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setDisplay(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
      }
    }, charDelay);
    return () => window.clearInterval(id);
  }, [inView, text, charDelay]);

  return (
    <div
      ref={ref}
      className="text-[32px] font-bold leading-none tracking-tight text-foreground"
    >
      {display}
    </div>
  );
}

function StatTwentyFourSeven() {
  const { ref, inView } = useInViewOnce();
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!inView) return;
    setDisplay("");
    let i = 0;
    const text = "24/7";
    const id = window.setInterval(() => {
      i += 1;
      setDisplay(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
      }
    }, 80);
    return () => window.clearInterval(id);
  }, [inView]);

  return (
    <div
      ref={ref}
      className="flex items-center justify-center gap-2"
    >
      <span className="text-[32px] font-bold leading-none tracking-tight text-foreground">
        {display}
      </span>
      <span className="flex items-center gap-1 pt-1">
        <span
          className="live-pulse-dot inline-block size-1.5 rounded-full bg-primary"
          aria-hidden
        />
        <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-primary">
          LIVE
        </span>
      </span>
    </div>
  );
}

function StatZeroPulse() {
  const { ref, inView } = useInViewOnce();

  return (
    <motion.div
      ref={ref}
      className="text-[32px] font-bold leading-none tracking-tight text-foreground"
      initial={false}
      animate={
        inView
          ? {
              scale: [1, 1.15, 1],
              color: [
                "var(--foreground)",
                "var(--primary)",
                "var(--foreground)",
              ],
            }
          : undefined
      }
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      0
    </motion.div>
  );
}

const STATS = [
  {
    id: "mins",
    label: "to build your voice profile from your real story",
    node: <StatTwoMin />,
  },
  {
    id: "radar",
    label: "automated lead monitoring across Reddit, X, LinkedIn",
    node: <StatTwentyFourSeven />,
  },
  {
    id: "click",
    label: "platform-compliant replies that pass the human test",
    node: <StatTypewriter text="1-click" charDelay={70} />,
  },
  {
    id: "zero",
    label: "posts that sound like every other AI tool",
    node: <StatZeroPulse />,
  },
] as const;

export function HeroStatStrip() {
  return (
    <FadeUp delay={0.15} className="relative mx-auto mt-12 max-w-4xl">
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-secondary/40">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {STATS.map((stat, index) => (
            <FadeUp
              key={stat.id}
              delay={index * 0.08}
              className={cn(
                "relative flex flex-col items-center px-4 py-6 text-center sm:px-6",
                index % 2 === 1 && "border-l border-border/60 md:border-l-0",
                index >= 2 && "border-t border-border/60 md:border-t-0"
              )}
            >
              <div className="flex min-h-[40px] items-center justify-center">
                {stat.node}
              </div>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                {stat.label}
              </p>
            </FadeUp>
          ))}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden md:block"
          aria-hidden
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute top-1/2 h-9 w-px -translate-y-1/2 bg-border/60"
              style={{ left: `${i * 25}%` }}
            />
          ))}
        </div>
      </div>
    </FadeUp>
  );
}
