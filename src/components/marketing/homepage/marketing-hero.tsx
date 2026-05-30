"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import { FadeUp } from "@/components/marketing/fade-up";
import { UrlAuditHeroForm } from "@/components/marketing/url-audit-hero-form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MarketingHeroProps = {
  hasSession: boolean;
  onAuditUrl: (url: string) => void;
};

const FOUNDER_PROOF_TAGS = [
  "bootstrappers",
  "vibe coders",
  "indie hackers",
  "solo founders",
  "micro-SaaS builders",
] as const;

function MonoEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

export function MarketingHero({ hasSession, onAuditUrl }: MarketingHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-border/40 py-16 md:py-24">
      <div
        className="hero-dot-grid pointer-events-none absolute inset-0 z-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 grid-bg opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <FadeUp>
          <MonoEyebrow>Distribution OS for indie founders</MonoEyebrow>
        </FadeUp>
        <FadeUp delay={0.06}>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
            You shipped the product.
            <br />
            Now comes the hard part.
          </h1>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Paste your URL. We build your founder voice profile, hunt high-intent
            leads on Reddit, LinkedIn, and X, and write every reply using your
            actual story — your MRR, your failures, your wins. Not generic{" "}
            <span className="text-primary">AI</span>.
          </p>
        </FadeUp>
        <FadeUp delay={0.14}>
          <div className="mt-10">
            {hasSession ? (
              <Button asChild size="lg" className="gap-2">
                <Link href="/stream/dashboard">Enter Workspace →</Link>
              </Button>
            ) : (
              <div className="mx-auto max-w-xl space-y-4">
                <UrlAuditHeroForm onSubmitUrl={onAuditUrl} />
                <p className="text-center text-xs text-muted-foreground">
                  ✓ No credit card · ✓ 7-day free trial · ✓ 60-second setup · ✓
                  Platform-compliant by default
                </p>
                <p className="text-center text-xs text-muted-foreground">
                  Already have an account?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-primary hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            )}
          </div>
        </FadeUp>
        <motion.div
          className={cn("mt-8 text-center")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.45, ease: "easeOut" }}
        >
          <MonoEyebrow>FOUNDERS ALREADY DISTRIBUTING</MonoEyebrow>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {FOUNDER_PROOF_TAGS.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] text-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
