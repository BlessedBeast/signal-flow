"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import FadeUp from "@/components/ui/fade-up";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FinalCtaProps = {
  hasSession: boolean;
};

const STEPS = [
  { n: "1", label: "Paste your URL" },
  { n: "2", label: "AI audits your distribution leaks" },
  { n: "3", label: "Wake up to pre-written tasks tomorrow" },
] as const;

function StepCircle({ n }: { n: string }) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full",
        "border border-primary/25 bg-primary/10 font-mono text-[11px] text-primary"
      )}
    >
      {n}
    </span>
  );
}

export function FinalCTA({ hasSession }: FinalCtaProps) {
  const href = hasSession ? "/stream/dashboard" : "/signup";

  return (
    <section className="px-6 py-20 pb-32">
      <div className="mx-auto max-w-2xl">
        <FadeUp className="text-center">
          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-12 backdrop-blur-md md:p-16">
            <p className="mb-5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {"// WHAT HAPPENS WHEN YOU CLICK"}
            </p>
            <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground">
              Drop your URL.
              <br />
              We find your buyers in 8 seconds.
            </h2>

            <div className="mb-8 mt-6 flex flex-col items-center justify-center gap-3 md:flex-row">
              {STEPS.map((step, index) => (
                <div key={step.n} className="flex items-center gap-2">
                  {index > 0 ? (
                    <span
                      className="hidden text-sm text-muted-foreground md:inline"
                      aria-hidden
                    >
                      →
                    </span>
                  ) : null}
                  <StepCircle n={step.n} />
                  <span className="max-w-[140px] text-xs text-muted-foreground md:max-w-none">
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            <motion.div
              className="inline-block"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <Button asChild size="lg" className="gap-2">
                <Link href={href}>
                  Analyze My Distribution Leaks →
                  <ArrowRight className="size-4 shrink-0" aria-hidden />
                </Link>
              </Button>
            </motion.div>
            <p className="mt-3 text-xs text-muted-foreground">
              Free forever on the starter tier.
            </p>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground opacity-60">
              No credit card · Setup in 60 seconds · Cancel anytime
            </p>
          </div>
        </FadeUp>

        <FadeUp
          delay={0.08}
          className="mx-auto mt-4 flex max-w-2xl flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 backdrop-blur-md"
        >
          <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span
              className="size-2 animate-pulse rounded-full bg-primary"
              aria-hidden
            />
            47 founders in early access
          </p>
          <p className="text-xs text-muted-foreground">
            Beta pricing ends when we hit 100 users.{" "}
            <span className="font-medium text-primary">53 seats left.</span>
          </p>
        </FadeUp>
      </div>
    </section>
  );
}
