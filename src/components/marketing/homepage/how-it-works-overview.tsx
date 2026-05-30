"use client";

import Link from "next/link";

import FadeUp from "@/components/ui/fade-up";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    step: "01",
    title: "Paste your URL",
    body: "We audit your positioning, competitors, and distribution gaps — no account required to start.",
  },
  {
    step: "02",
    title: "Build your Vault + pick a playbook",
    body: "Four-question intake locks your voice. Choose a 2–6 step framework sequence for Reddit, LinkedIn, or X.",
  },
  {
    step: "03",
    title: "Wake up to the Daily OS",
    body: "Five prioritized tasks every morning — exact thread, angle, and platform rules included.",
  },
] as const;

export function HowItWorksOverview() {
  return (
    <div className="text-center">
      <FadeUp>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          how it works
        </p>
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          From URL to execution in three moves.
        </h2>
      </FadeUp>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        {STEPS.map((item, index) => (
          <FadeUp
            key={item.step}
            delay={index * 0.08}
            className="relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-left backdrop-blur-md"
          >
            <span className="font-mono text-xs font-semibold text-primary">
              {item.step}
            </span>
            <h3 className="mt-2 text-lg font-bold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {item.body}
            </p>
            {index < STEPS.length - 1 ? (
              <span
                className="absolute -right-3 top-1/2 hidden -translate-y-1/2 text-muted-foreground md:inline"
                aria-hidden
              >
                →
              </span>
            ) : null}
          </FadeUp>
        ))}
      </div>

      <FadeUp delay={0.2} className="mt-8">
        <Button asChild variant="outline" className="glass-soft">
          <Link href="/how-it-works">See the full system walkthrough →</Link>
        </Button>
      </FadeUp>
    </div>
  );
}
