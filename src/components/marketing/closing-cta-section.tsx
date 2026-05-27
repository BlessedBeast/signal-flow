"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Shield, User } from "lucide-react";

import { SECTION_FADE } from "@/components/marketing/motion-presets";
import { Button } from "@/components/ui/button";

const TRUST_PILLARS = [
  {
    icon: Shield,
    title: "Plays by the rules",
    line: "Community-first tone guardrails on every draft.",
  },
  {
    icon: BadgeCheck,
    title: "Built to last",
    line: "Platform-compliant replies. No spam patterns.",
  },
  {
    icon: User,
    title: "You approve",
    line: "Nothing posts until you tap approve.",
  },
] as const;

type ClosingCtaSectionProps = {
  hasSession: boolean;
};

export function ClosingCtaSection({ hasSession }: ClosingCtaSectionProps) {
  return (
    <section className="px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <motion.div
          {...SECTION_FADE}
          className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 backdrop-blur-md sm:p-10"
        >
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-emerald-500/10 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-primary/15 blur-3xl"
            aria-hidden
          />

          <div className="relative grid gap-8 sm:grid-cols-3 sm:gap-6">
            {TRUST_PILLARS.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <motion.div
                  key={pillar.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.3, delay: index * 0.06 }}
                  className="text-center sm:text-left"
                >
                  <Icon
                    className="mx-auto size-5 text-primary sm:mx-0"
                    aria-hidden
                  />
                  <p className="mt-2 text-sm font-bold tracking-tight text-foreground">
                    {pillar.title}
                  </p>
                  <p className="mt-1 text-xs leading-snug text-muted-foreground">
                    {pillar.line}
                  </p>
                </motion.div>
              );
            })}
          </div>

          <div className="relative mt-10 border-t border-white/[0.08] pt-10 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              You shipped. Now let the machine find them.
            </h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {hasSession ? (
                <Button asChild size="lg" className="gap-2 shadow-lg">
                  <Link href="/stream/dashboard">
                    Enter Workspace
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              ) : (
                <Button asChild size="lg" className="gap-2 px-8 shadow-lg shadow-primary/20">
                  <Link href="/signup">
                    Get Started for Free
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              )}
            </div>
            {!hasSession ? (
              <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Hobbyist tier · No credit card
              </p>
            ) : null}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
