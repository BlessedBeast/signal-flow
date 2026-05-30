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
          <MonoEyebrow>Growth ecosystem · Built for vibe coders</MonoEyebrow>
        </FadeUp>
        <FadeUp delay={0.06}>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
            You shipped the product. Now comes the{" "}
            <span className="text-primary">hard part</span>.
          </h1>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Stop guessing what to post. We hunt high-intent leads, intercept viral
            threads, and write your founder timeline automatically while you write
            code.
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
        <motion.p
          className={cn("mt-4 text-center text-xs text-muted-foreground")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.45, ease: "easeOut" }}
        >
          Joined by 340+ indie founders this month · Rated 4.9 on Product Hunt ⭐
        </motion.p>
      </div>
    </section>
  );
}
