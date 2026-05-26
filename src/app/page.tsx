"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Crosshair,
  Loader2,
  MessageSquareText,
  Radar,
  Shield,
  Sparkles,
  User,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  EyebrowReveal,
  FadeUp,
  SectionRule,
} from "@/components/marketing/fade-up";
import { HeroStatStrip } from "@/components/marketing/hero-stats";
import {
  BipTimelineMockup,
  DailyDropLedgerMockup,
  InboundPostureMockup,
  VelocityRadarMockup,
} from "@/components/marketing/landing-mockups";
import { MicroAuditModal } from "@/components/marketing/micro-audit-modal";
import { UrlAuditHeroForm } from "@/components/marketing/url-audit-hero-form";
import type { MicroAuditResult } from "@/lib/micro-audit/types";
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

type BentoFeature = {
  id: string;
  label: string;
  title: string;
  description: string;
  icon: LucideIcon;
  span: string;
  visual: React.ReactNode;
};

const WITHOUT_LOOP = {
  label: "// WITHOUT VELOCITYHUB",
  heading: "The Exhausted Founder Loop",
  bullets: [
    "45 minutes of Reddit doomscrolling for ONE thread where you can mention your tool — finding nothing",
    'Your "I built this" launch post gets 4 likes. Two are bots.',
    "You open a blank doc for your BIP update. You close it 10 minutes later having written nothing.",
    "50 X notifications, no strategy. Every reply sounds either desperate or robotic.",
    "A HOT thread blows up in your niche at 2am. You find out at 9am. The wave is gone.",
  ],
} as const;

const WITH_LOOP = {
  label: "// WITH VELOCITYHUB",
  heading: "The Automated Founder Stack",
  bullets: [
    "Wake up to a Daily Drop Ledger: qualified leads who posted about your exact pain point while you slept",
    "HOT thread flagged, compliant reply pre-written. One tap and you're riding the traffic wave.",
    "The Engine read your commits. Your BIP post for today is already drafted. You just approve it.",
    "Paste 50 raw notifications, pick a Growth Posture. 90 seconds later, every reply is done.",
    "Build. The machine distributes. That's the only edge that compounds in 2026.",
  ],
} as const;

const BENTO_FEATURES: BentoFeature[] = [
  {
    id: "hunter",
    label: "THE HUNTER / ACTIVE LEADS",
    title: "Automated Intent Mining",
    description:
      "An adaptive AI scraper monitors Reddit and Hacker News around the clock. When someone complains about the exact pain point your product solves, they land in your Daily Drop Ledger — a chronological queue that prevents notification overwhelm. An Anti-Duplication lock means you never see the same lead twice. A Circuit Breaker pauses scraping automatically when your queue is full — so you never burn API budget on leads you won't get to.",
    icon: Crosshair,
    span: "md:col-span-2 lg:col-span-7",
    visual: <DailyDropLedgerMockup />,
  },
  {
    id: "megaphone",
    label: "THE MEGAPHONE / PLUG ALERTS",
    title: "Viral Trend Jacking",
    description:
      "A velocity radar scans threads blowing up right now — scored HOT, WARM, or COLD by comment momentum. When a thread goes HOT in your niche, VelocityHub pre-writes a compliant, stealthy reply that adds genuine value while positioning your tool. One click. You post. You hijack the traffic wave before anyone else even notices it's happening.",
    icon: Radar,
    span: "md:col-span-2 lg:col-span-5",
    visual: <VelocityRadarMockup />,
  },
  {
    id: "engine",
    label: "THE ENGINE / BIP TIMELINE",
    title: "Chronological Storytelling",
    description:
      "The Engine reads your activity ledger to understand what you built yesterday, then writes an authentic, non-marketing BIP update for today. Not a promo post. A real builder's story that audiences actually want to follow — and the algorithm rewards.",
    icon: MessageSquareText,
    span: "md:col-span-2 lg:col-span-5",
    visual: <BipTimelineMockup />,
  },
  {
    id: "shield",
    label: "THE SHIELD / 1-CLICK REPLIER",
    title: "Inbound Engagement",
    description:
      "Paste your raw X or LinkedIn notifications — all 50 of them. Pick a Growth Posture. The AI burns through every reply instantly, matching your voice and the posture you chose. The result: consistent algorithm signals, genuine-sounding engagement, and zero time spent sounding like a robot trying to be human.",
    icon: Shield,
    span: "md:col-span-2 lg:col-span-7",
    visual: <InboundPostureMockup />,
  },
];

const TRUST_COLUMNS = [
  {
    icon: Shield,
    title: "Strict AI Tone Guardrails",
    description:
      'Every reply is generated with community-first language rules baked in. No aggressive CTAs, no keyword stuffing, no "check out my tool!" spam patterns. The AI replies like a helpful builder — because that\'s what actually converts and doesn\'t get you flagged.',
  },
  {
    icon: BadgeCheck,
    title: "Platform-Compliant by Design",
    description:
      "The Megaphone only surfaces threads where organic engagement is appropriate. It will not draft a reply to a thread where plugging a product violates subreddit rules. Moderators don't see VelocityHub — they see a thoughtful founder.",
  },
  {
    icon: User,
    title: "You Stay in Control",
    description:
      "Nothing posts automatically. Every lead reply, BIP post, and notification response goes through your approval before it goes live. Automation speed. Human judgment. Your reputation is not something we automate away.",
  },
] as const;

const CHANNEL_BADGES = [
  "REDDIT",
  "X · TWITTER",
  "LINKEDIN",
  "HACKER NEWS",
  "PRODUCT HUNT",
] as const;

function BentoCard({ feature, index }: { feature: BentoFeature; index: number }) {
  const Icon = feature.icon;

  return (
    <FadeUp delay={index * 0.08} className={feature.span}>
      <article
        className={cn(
          "group glass-strong relative flex h-full flex-col rounded-2xl border border-border/60 p-6 transition-all duration-300",
          "hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
        )}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.05em] text-muted-foreground transition-[letter-spacing] duration-200 group-hover:tracking-[0.1em]">
          {feature.label}
        </p>

        <div className="mt-3 flex size-10 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-primary transition-colors group-hover:border-primary/35 group-hover:bg-primary/10">
          <Icon className="size-5 shrink-0" aria-hidden />
        </div>

        <div className="mt-4 space-y-2">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            {feature.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {feature.description}
          </p>
        </div>

        {feature.visual}
      </article>
    </FadeUp>
  );
}

function FounderLoopCard({
  variant,
  label,
  heading,
  bullets,
  delay = 0,
}: {
  variant: "without" | "with";
  label: string;
  heading: string;
  bullets: readonly string[];
  delay?: number;
}) {
  const isWithout = variant === "without";

  return (
    <FadeUp delay={delay}>
      <article
        className={cn(
          "glass-strong flex flex-col rounded-2xl border border-border/60 p-6 transition-all duration-300 ease-out sm:p-8",
          "hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
        )}
      >
        <p
          className={cn(
            "font-mono text-[10px] uppercase tracking-widest",
            isWithout ? "text-destructive" : "text-primary"
          )}
        >
          {label}
        </p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {heading}
        </h2>
        <ul className="mt-5 space-y-4">
          {bullets.map((bullet, bulletIndex) => (
            <FadeUp key={bullet} delay={delay + 0.04 * (bulletIndex + 1)}>
              <li className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                <span
                  className={cn(
                    "shrink-0 font-mono text-base leading-none",
                    isWithout ? "text-destructive" : "text-primary"
                  )}
                  aria-hidden
                >
                  {isWithout ? "✗" : "✓"}
                </span>
                <span>{bullet}</span>
              </li>
            </FadeUp>
          ))}
        </ul>
      </article>
    </FadeUp>
  );
}

function SafeForCommunitiesSection() {
  return (
    <section className="border-t border-border/40 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <MonoEyebrow>{"// Safe for Communities"}</MonoEyebrow>
        <FadeUp>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Plays by the rules. Built to last.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            We know what you&apos;re thinking. Here&apos;s why VelocityHub won&apos;t
            get your account nuked.
          </p>
        </FadeUp>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {TRUST_COLUMNS.map((col, index) => {
            const Icon = col.icon;
            return (
              <FadeUp key={col.title} delay={index * 0.08}>
                <article className="glass-strong flex h-full flex-col gap-3 rounded-2xl border border-border/60 p-6">
                  <Icon className="size-5 text-primary" aria-hidden />
                  <h3 className="text-base font-semibold tracking-tight text-foreground">
                    {col.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {col.description}
                  </p>
                </article>
              </FadeUp>
            );
          })}
        </div>

        <FadeUp delay={0.24} className="mt-10">
          <div className="flex flex-col gap-4 rounded-xl border border-border/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Designed for the communities that actually matter. VelocityHub supports
              the five primary distribution channels for indie SaaS — each with
              platform-specific tone calibration built in.
            </p>
            <div className="flex flex-wrap gap-2 sm:shrink-0">
              {CHANNEL_BADGES.map((channel) => (
                <span
                  key={channel}
                  className="rounded-full border border-border/60 bg-background px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-foreground"
                >
                  {channel}
                </span>
              ))}
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
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
              transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
            >
              Joined by 340+ indie founders this month · Rated 4.9 on Product Hunt
              ⭐
            </motion.p>
            <HeroStatStrip />
          </div>
        </section>

        <section className="border-b border-border/40 px-6 py-12 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <SectionRule />
            <div className="mt-10 mb-8 max-w-3xl">
              <MonoEyebrow>{"// THE NINTH MANIFESTO"}</MonoEyebrow>
              <FadeUp>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-4xl">
                  You&apos;re burning 4 hours a day on work a machine should own.
                </h2>
              </FadeUp>
              <FadeUp delay={0.08}>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Every hour you spend on manual distribution is an hour you&apos;re
                  not shipping. That&apos;s the real cost.
                </p>
              </FadeUp>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
              <FounderLoopCard variant="without" {...WITHOUT_LOOP} delay={0} />
              <FounderLoopCard variant="with" {...WITH_LOOP} delay={0.08} />
            </div>
          </div>
        </section>

        <section id="ecosystem" className="px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <SectionRule />
            <div className="mb-10 mt-10 max-w-2xl">
              <MonoEyebrow>The bento manifesto</MonoEyebrow>
              <FadeUp>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Four engines. One distribution stack.
                </h2>
              </FadeUp>
              <FadeUp delay={0.08}>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Not a CRM — a growth operating system for indie hackers who ship
                  in public and hate marketing theater.
                </p>
              </FadeUp>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-12 lg:gap-6">
              {BENTO_FEATURES.map((feature, index) => (
                <BentoCard key={feature.id} feature={feature} index={index} />
              ))}
            </div>
          </div>
        </section>

        <SafeForCommunitiesSection />

        <section className="relative overflow-hidden border-t border-border/40 px-6 py-20 sm:py-24">
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 size-[min(100%,42rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[100px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_65%)]"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 50%, var(--primary) 0%, transparent 70%)",
            }}
            aria-hidden
          />

          <div className="relative z-10 mx-auto max-w-3xl">
            <div className="relative z-0 isolate overflow-hidden glass-strong rounded-2xl border border-border/60 p-8 text-center sm:p-10">
              <p
                className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap text-[180px] font-black leading-none text-muted-foreground"
                style={{ zIndex: -1, opacity: 0.03 }}
                aria-hidden
              >
                SHIP
              </p>
              <div className="relative z-[1]">
                <MonoEyebrow>READY TO RIDE THE STACK</MonoEyebrow>
                <FadeUp>
                  <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    Your product deserves to be{" "}
                    <span className="text-primary">found.</span>
                  </h2>
                </FadeUp>
                <FadeUp delay={0.08}>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    Join indie founders who stopped treating distribution as a side
                    quest. Free tier, no credit card. The Hunter, Engine, and Shield
                    running from day one.
                  </p>
                </FadeUp>
                <FadeUp delay={0.16}>
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    {hasSession ? (
                      <Button asChild size="lg" className="gap-2">
                        <Link href="/stream/dashboard">
                          <Sparkles className="size-4 shrink-0" aria-hidden />
                          Enter Workspace {"->"}
                          <ArrowRight className="size-4 shrink-0" aria-hidden />
                        </Link>
                      </Button>
                    ) : (
                      <AuthCTAs hasSession={hasSession} size="lg" />
                    )}
                  </div>
                </FadeUp>
                <p className="mt-6 text-center font-mono text-xs text-muted-foreground">
                  Free tier includes 50 leads/mo · No credit card required · Cancel,
                  whenever.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <MicroAuditModal
        open={auditOpen}
        result={auditResult}
        onClose={() => setAuditOpen(false)}
      />
    </div>
  );
}
