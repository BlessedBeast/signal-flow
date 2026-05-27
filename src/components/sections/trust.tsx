"use client";

import FadeUp from "@/components/ui/fade-up";
import { cn } from "@/lib/utils";

const GLASS_CARD =
  "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md";

const PILLARS = [
  {
    icon: "⚙",
    title: "Strict Tone Guardrails",
    body: "Replies trained on 10,000+ successful Reddit threads. Our model knows the difference between helpful and spammy. Community mods don't flag us. Ever.",
  },
  {
    icon: "✓",
    title: "Human Approval Required",
    body: "Nothing posts without your tap. We pre-write. You decide. Speed of AI. Judgment of a founder who actually cares about their reputation.",
  },
  {
    icon: "◎",
    title: "Platform-Compliant by Design",
    body: "Subreddit rules are read and respected per community. r/SaaS gets different tone calibration than r/entrepreneur. You look like a native. Always.",
  },
] as const;

const CHANNELS = [
  "REDDIT",
  "X · TWITTER",
  "LINKEDIN",
  "HACKER NEWS",
  "PRODUCT HUNT",
] as const;

export function Trust() {
  return (
    <section className="px-6 py-20">
      <FadeUp className="mx-auto max-w-4xl">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {"// SAFE FOR COMMUNITIES"}
        </p>
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
          Plays by the rules. Built to last.
        </h2>

        <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {PILLARS.map((pillar, index) => (
            <FadeUp key={pillar.title} delay={index * 0.06} className={GLASS_CARD}>
              <span className="text-xl" aria-hidden>
                {pillar.icon}
              </span>
              <h3 className="mt-3 text-sm font-bold text-foreground">
                {pillar.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {pillar.body}
              </p>
            </FadeUp>
          ))}
        </div>

        <FadeUp
          delay={0.18}
          className={cn(
            GLASS_CARD,
            "mt-4 flex flex-wrap items-center justify-between gap-3 p-4"
          )}
        >
          <p className="text-sm text-muted-foreground">
            Built for the 5 channels that actually convert for indie SaaS.
          </p>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((channel) => (
              <span
                key={channel}
                className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 font-mono text-xs text-foreground"
              >
                {channel}
              </span>
            ))}
          </div>
        </FadeUp>
      </FadeUp>
    </section>
  );
}
