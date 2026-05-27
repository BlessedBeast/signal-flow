"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, Zap } from "lucide-react";

import {
  EyebrowReveal,
  FadeUp,
} from "@/components/marketing/fade-up";
import { HeroStatStrip } from "@/components/marketing/hero-stats";
import { HookResultsModal } from "@/components/marketing/hook-results-modal";
import { HookScrollIntercept } from "@/components/marketing/hook-scroll-intercept";
import { MicroAuditModal } from "@/components/marketing/micro-audit-modal";
import { AEOSection } from "@/components/sections/aeo-section";
import { Arsenal } from "@/components/sections/arsenal";
import { CompoundingCurve } from "@/components/sections/compounding-curve";
import { FinalCTA } from "@/components/sections/final-cta";
import { ProductProof } from "@/components/sections/product-proof";
import { SocialProof } from "@/components/sections/social-proof";
import { Trust } from "@/components/sections/trust";

function HomeSectionDivider() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-2">
      <div className="border-t border-white/[0.06]" />
    </div>
  );
}
import { UrlAuditHeroForm } from "@/components/marketing/url-audit-hero-form";
import type { MicroAuditResult } from "@/lib/micro-audit/types";
import { isHookAuditUsed } from "@/lib/onboard/hook-types";
import { savePendingMicroAudit } from "@/lib/micro-audit/storage";
import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

function MonoEyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <EyebrowReveal
      className={cn(
        "font-mono text-[10px] uppercase tracking-widest text-muted-foreground",
        className
      )}
    >
      {children}
    </EyebrowReveal>
  );
}

function AuthCTAs({
  hasSession,
  size = "lg",
}: {
  hasSession: boolean;
  size?: "default" | "sm" | "lg";
}) {
  if (hasSession) {
    return (
      <Button asChild size={size} className="gap-2">
        <Link href="/stream/dashboard">
          Enter Workspace {"->"}
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button asChild size={size}>
        <Link href="/signup">Get started</Link>
      </Button>
      <Button asChild variant="outline" size={size} className="glass-soft">
        <Link href="/login">Sign in</Link>
      </Button>
    </>
  );
}

export default function HomePage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditResult, setAuditResult] = useState<MicroAuditResult | null>(null);
  const [hookInterceptOpen, setHookInterceptOpen] = useState(false);
  const [hookResultsOpen, setHookResultsOpen] = useState(false);
  const [hookAuditUrl, setHookAuditUrl] = useState<string | null>(null);
  const hookScrollTriggered = useRef(false);

  function handleAuditComplete(result: MicroAuditResult) {
    savePendingMicroAudit({
      url: result.teaser.url,
      teaser: result.teaser,
      dna: result.dna,
      savedAt: new Date().toISOString(),
    });
    setAuditResult(result);
    setAuditOpen(true);
  }

  useEffect(() => {
    let cancelled = false;

    async function resolveSession() {
      try {
        const supabase = createBrowserSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!cancelled) {
          setHasSession(Boolean(session));
        }
      } catch {
        if (!cancelled) {
          setHasSession(false);
        }
      } finally {
        if (!cancelled) {
          setCheckingSession(false);
        }
      }
    }

    void resolveSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setNavScrolled(window.scrollY > 60);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (hasSession || checkingSession) return;

    const onScrollDepth = () => {
      if (hookScrollTriggered.current) return;
      if (isHookAuditUsed()) return;
      if (hookInterceptOpen || hookResultsOpen) return;

      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;

      const ratio = window.scrollY / docHeight;
      if (ratio < 0.35) return;

      hookScrollTriggered.current = true;
      setHookInterceptOpen(true);
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        onScrollDepth();
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScrollDepth();

    return () => window.removeEventListener("scroll", onScroll);
  }, [
    hasSession,
    checkingSession,
    hookInterceptOpen,
    hookResultsOpen,
  ]);

  function handleHookInterceptSubmit(url: string) {
    setHookInterceptOpen(false);
    setHookAuditUrl(url);
    setHookResultsOpen(true);
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2
          className="size-8 animate-spin text-primary"
          aria-label="Checking session"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header
        className={cn(
          "glass-strong sticky top-0 z-50 w-full border-b transition-[border-color] duration-300",
          navScrolled ? "border-border/60" : "border-transparent"
        )}
      >
        <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-foreground"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary shadow-sm">
              <Zap size={16} className="text-primary-foreground" aria-hidden />
            </span>
            SignalFlow
          </Link>
          <div className="flex items-center gap-3">
            {hasSession ? (
              <Button asChild size="sm">
                <Link href="/stream/dashboard">Enter Workspace</Link>
              </Button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign in
                </Link>
                <Button asChild size="sm">
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border/40 px-6 py-20 sm:py-28">
          <div
            className="hero-dot-grid pointer-events-none absolute inset-0 z-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 z-0 grid-bg opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]"
            aria-hidden
          />
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <MonoEyebrow>Growth ecosystem · Built for vibe coders</MonoEyebrow>
            <FadeUp>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
                You shipped the product. Now comes the{" "}
                <span className="text-primary">hard part</span>.
              </h1>
            </FadeUp>
            <FadeUp delay={0.08}>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Stop guessing what to post. We hunt high-intent leads, intercept
                viral threads, and write your founder timeline automatically while
                you write code.
              </p>
            </FadeUp>
            <FadeUp delay={0.16}>
              <div className="mt-10">
                {hasSession ? (
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <AuthCTAs hasSession={hasSession} />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <UrlAuditHeroForm onAuditComplete={handleAuditComplete} />
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
              className="mt-4 text-center text-xs text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5, ease: "easeOut" }}
            >
              Joined by 340+ indie founders this month · Rated 4.9 on Product Hunt
              ⭐
            </motion.p>
            <HeroStatStrip />
          </div>
        </section>

        <ProductProof />
        <SocialProof />

        <HomeSectionDivider />
        <CompoundingCurve />

        <HomeSectionDivider />
        <AEOSection />

        <HomeSectionDivider />
        <Arsenal />

        <HomeSectionDivider />
        <Trust />

        <FinalCTA hasSession={hasSession} />
      </main>

      <MicroAuditModal
        open={auditOpen}
        result={auditResult}
        onClose={() => setAuditOpen(false)}
      />

      <HookScrollIntercept
        open={hookInterceptOpen}
        onClose={() => setHookInterceptOpen(false)}
        onSubmit={handleHookInterceptSubmit}
      />

      <HookResultsModal
        open={hookResultsOpen}
        url={hookAuditUrl}
        onClose={() => {
          setHookResultsOpen(false);
          setHookAuditUrl(null);
        }}
      />
    </div>
  );
}
