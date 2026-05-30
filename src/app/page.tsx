"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { ForensicAuditModal } from "@/components/marketing/forensic-audit-modal";
import { HookScrollIntercept } from "@/components/marketing/hook-scroll-intercept";
import { ComparisonSection } from "@/components/marketing/comparison-section";
import { DailyOsSection } from "@/components/marketing/daily-os-section";
import { FrameworksPlaybooksSection } from "@/components/marketing/frameworks-playbooks-section";
import { VoiceVaultSection } from "@/components/marketing/voice-vault-section";
import { HeroStatStrip } from "@/components/marketing/hero-stats";
import { HomepageClosingCta } from "@/components/marketing/homepage/homepage-closing-cta";
import { HomepageSection } from "@/components/marketing/homepage/homepage-section";
import { HowItWorksOverview } from "@/components/marketing/homepage/how-it-works-overview";
import { MarketingHero } from "@/components/marketing/homepage/marketing-hero";
import { MarketingNav } from "@/components/marketing/homepage/marketing-nav";
import { PlatformIntelligenceCard } from "@/components/marketing/homepage/platform-intelligence-card";
import { PricingTeaser } from "@/components/marketing/homepage/pricing-teaser";
import { ProductProofPills } from "@/components/marketing/homepage/product-proof-pills";
import { isHookAuditUsed } from "@/lib/onboard/hook-types";
import { createBrowserSupabase } from "@/lib/supabase-browser";

export default function HomePage() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [hookInterceptOpen, setHookInterceptOpen] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditUrl, setAuditUrl] = useState<string | null>(null);
  const hookScrollTriggered = useRef(false);

  function openForensicAudit(url: string) {
    setAuditUrl(url);
    setAuditModalOpen(true);
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
      if (hookInterceptOpen || auditModalOpen) return;

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
  }, [hasSession, checkingSession, hookInterceptOpen, auditModalOpen]);

  function handleHookInterceptSubmit(url: string) {
    setHookInterceptOpen(false);
    openForensicAudit(url);
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
      <MarketingNav hasSession={hasSession} scrolled={navScrolled} />

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <main className="w-full">
          <MarketingHero
            hasSession={hasSession}
            onAuditUrl={openForensicAudit}
          />

          <HomepageSection className="!py-8 md:!py-12">
            <HeroStatStrip />
          </HomepageSection>

          <HomepageSection>
            <ProductProofPills />
          </HomepageSection>

          <HomepageSection id="how-it-works-preview">
            <HowItWorksOverview />
          </HomepageSection>

          <HomepageSection>
            <VoiceVaultSection embedded />
          </HomepageSection>

          <HomepageSection>
            <FrameworksPlaybooksSection embedded />
          </HomepageSection>

          <HomepageSection>
            <DailyOsSection embedded />
          </HomepageSection>

          <HomepageSection>
            <PlatformIntelligenceCard />
          </HomepageSection>

          <HomepageSection>
            <ComparisonSection embedded />
          </HomepageSection>

          <HomepageSection>
            <PricingTeaser />
          </HomepageSection>

          <HomepageSection className="pb-20 md:pb-28">
            <HomepageClosingCta
              hasSession={hasSession}
              onAuditUrl={openForensicAudit}
            />
          </HomepageSection>
        </main>
      </div>

      <HookScrollIntercept
        open={hookInterceptOpen}
        onClose={() => setHookInterceptOpen(false)}
        onSubmit={handleHookInterceptSubmit}
      />

      <ForensicAuditModal
        open={auditModalOpen}
        url={auditUrl}
        onClose={() => {
          setAuditModalOpen(false);
          setAuditUrl(null);
        }}
      />
    </div>
  );
}
