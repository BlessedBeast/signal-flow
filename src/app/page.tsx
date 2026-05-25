"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Crosshair,
  Flame,
  Loader2,
  MessageSquareText,
  Radar,
  Shield,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

function MonoEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  );
}

function LedgerPreviewMockup() {
  const rows = [
    { day: "Today", count: 12, lead: "r/saas", score: 98, tier: "HOT" },
    { day: null, count: null, lead: "ask hn", score: 84, tier: "HOT" },
    { day: "Yesterday", count: 8, lead: "indie hackers", score: 71, tier: "WARM" },
  ] as const;

  return (
    <div
      className="mt-5 rounded-xl border border-border/60 bg-muted/20 p-3 font-mono text-[10px] uppercase tracking-wider"
      aria-hidden
    >
      <div className="mb-2 flex items-center justify-between text-muted-foreground">
        <span>Daily drop ledger</span>
        <span className="text-primary">live</span>
      </div>
      <ul className="space-y-2">
        {rows.map((row, i) => (
          <li key={i}>
            {row.day ? (
              <div className="mb-1 flex justify-between text-muted-foreground">
                <span>{row.day}</span>
                <span>{row.count} leads</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/60 px-2 py-1.5 normal-case tracking-normal">
              <span className="truncate text-foreground">{row.lead}</span>
              <span className="shrink-0 text-muted-foreground">
                intent {row.score}
              </span>
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold",
                  row.tier === "HOT"
                    ? "border border-destructive/35 bg-destructive/10 text-destructive"
                    : "border border-primary/30 bg-primary/10 text-primary"
                )}
              >
                {row.tier}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VelocityBadgesMockup() {
  const tiers = [
    { label: "HOT", score: 94, active: true },
    { label: "WARM", score: 62, active: false },
    { label: "COLD", score: 28, active: false },
  ] as const;

  return (
    <div className="mt-5 space-y-2" aria-hidden>
      {tiers.map((tier) => (
        <div
          key={tier.label}
          className={cn(
            "flex items-center justify-between rounded-lg border px-3 py-2 font-mono text-[10px] uppercase tracking-wider",
            tier.active
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border/60 bg-muted/15 text-muted-foreground"
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            {tier.label}
            {tier.active ? (
              <Flame className="size-3 shrink-0" aria-hidden />
            ) : null}
          </span>
          <span>velocity {tier.score}</span>
        </div>
      ))}
      <p className="pt-1 text-center font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        golden hour window · 60m
      </p>
    </div>
  );
}

function BipTimelineMockup() {
  const entries = [
    { day: "Mon", snippet: "shipped auth refactor + daily drop cron" },
    { day: "Tue", snippet: "wired plug alerts to serper velocity" },
    { day: "Wed", snippet: "today: inbound replier posture engine" },
  ] as const;

  return (
    <div className="mt-5" aria-hidden>
      <div className="flex gap-1">
        {entries.map((entry, i) => (
          <div key={entry.day} className="flex flex-1 flex-col items-center">
            <div
              className={cn(
                "h-1.5 w-full rounded-full",
                i === entries.length - 1 ? "bg-primary" : "bg-border/80"
              )}
            />
            <span className="mt-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              {entry.day}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
        {entries.map((entry) => (
          <p
            key={entry.day}
            className="text-xs leading-relaxed text-muted-foreground normal-case tracking-normal"
          >
            <span className="font-mono text-[9px] uppercase tracking-wider text-primary">
              {entry.day}
            </span>{" "}
            — {entry.snippet}
          </p>
        ))}
      </div>
    </div>
  );
}

function InboundPostureMockup() {
  const postures = ["Plug", "Hype", "Deflect"] as const;

  return (
    <div className="mt-5 space-y-3" aria-hidden>
      <div className="flex flex-wrap gap-2">
        {postures.map((posture, i) => (
          <span
            key={posture}
            className={cn(
              "rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider",
              i === 0
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/60 bg-muted/20 text-muted-foreground"
            )}
          >
            {posture}
          </span>
        ))}
      </div>
      <div className="space-y-2 rounded-xl border border-border/60 bg-muted/15 p-3">
        <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          3 comments parsed
        </p>
        <p className="text-xs leading-relaxed text-foreground normal-case tracking-normal">
          tbh this is the exact workflow i needed — shipped mine last week
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground normal-case tracking-normal">
          suggested reply ready · 1-click copy
        </p>
      </div>
    </div>
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

const HERO_STATS = [
  { value: "4h", label: "Saved per day" },
  { value: "24/7", label: "Lead radar, always on" },
  { value: "0", label: "Bans. Ever." },
  { value: "1-click", label: "Traffic wave hijack" },
] as const;

const WITHOUT_LOOP = {
  label: "// WITHOUT VELOCITYHUB",
  heading: "The Exhausted Founder Loop",
  bullets: [
    "Scrolling Reddit for 45 minutes looking for a thread to plug your tool — finding zero",
    'Posting a "hey I built this" tweet that gets 3 likes from your mom and two bots',
    "Staring at a blank page for a BIP update you know you should write but can't start",
    "Watching a HOT thread blow up in your niche while you're fixing a bug in prod",
  ],
} as const;

const WITH_LOOP = {
  label: "// WITH VELOCITYHUB",
  heading: "The Automated Founder Stack",
  bullets: [
    "Wake up to a Daily Drop Ledger of qualified leads actively complaining about your exact problem",
    "Hot threads flagged. Pre-written stealthy reply ready. Tap, post, ride the wave.",
    "AI reads your commits and writes today's authentic BIP post — you just approve it",
    "Build while the machine distributes. That's the only sustainable edge in 2026.",
  ],
} as const;

const BENTO_FEATURES: BentoFeature[] = [
  {
    id: "hunter",
    label: "The Hunter · Active Leads",
    title: "Automated Intent Mining",
    description:
      "An adaptive AI scraper monitors Reddit and Hacker News around the clock. When someone complains about the exact pain point your product solves, they land in your Daily Drop Ledger — a chronological queue that prevents notification overwhelm. An Anti-Duplication lock means you never see the same lead twice. A Circuit Breaker pauses scraping automatically when your queue is full — so you never burn API budget on leads you won't get to.",
    icon: Crosshair,
    span: "md:col-span-2 lg:col-span-7",
    visual: <LedgerPreviewMockup />,
  },
  {
    id: "megaphone",
    label: "The Megaphone · Plug Alerts",
    title: "Viral Trend Jacking",
    description:
      "A velocity radar scans threads blowing up right now — scored HOT, WARM, or COLD by comment momentum. When a thread goes HOT in your niche, VelocityHub pre-writes a compliant, stealthy reply that adds genuine value while positioning your tool. One click. You post. You hijack the traffic wave before anyone else even notices it's happening.",
    icon: Radar,
    span: "md:col-span-2 lg:col-span-5",
    visual: <VelocityBadgesMockup />,
  },
  {
    id: "engine",
    label: "The Engine · BIP Timeline",
    title: "Chronological Storytelling",
    description:
      "The Engine reads your activity ledger to understand what you built yesterday, then writes an authentic, non-marketing BIP update for today. Not a promo post. A real builder's story that audiences actually want to follow — and the algorithm actually rewards.",
    icon: MessageSquareText,
    span: "md:col-span-2 lg:col-span-5",
    visual: <BipTimelineMockup />,
  },
  {
    id: "shield",
    label: "The Shield · 1-Click Replier",
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
    icon: "⚙",
    title: "Strict AI Tone Guardrails",
    description:
      "Every reply and plug is generated with community-first language rules baked in. No aggressive CTAs, no keyword stuffing.",
  },
  {
    icon: "✓",
    title: "Platform-Compliant by Design",
    description:
      "The Megaphone only surfaces threads where organic engagement is appropriate. Moderators don't see VelocityHub — they see a thoughtful founder.",
  },
  {
    icon: "◎",
    title: "You Stay in Control",
    description:
      "Nothing posts automatically. Every lead reply, BIP post, and notification response goes through your approval before it goes live.",
  },
] as const;

const CHANNEL_BADGES = [
  "Reddit",
  "X / Twitter",
  "LinkedIn",
  "Hacker News",
  "Product Hunt",
] as const;

function BentoCard({ feature }: { feature: BentoFeature }) {
  const Icon = feature.icon;

  return (
    <article
      className={cn(
        "group glass-strong relative flex flex-col rounded-2xl border border-border/60 p-6 transition-all duration-300",
        "hover:border-primary/45 hover:shadow-[0_0_28px_-6px] hover:shadow-primary/25",
        feature.span
      )}
    >
      <MonoEyebrow>{feature.label}</MonoEyebrow>

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
  );
}

function HeroStatStrip() {
  return (
    <div className="mx-auto mt-12 max-w-4xl border-t border-border/60">
      <div className="grid grid-cols-2 divide-x divide-y divide-border/60 md:grid-cols-4 md:divide-y-0">
        {HERO_STATS.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center px-4 py-6 text-center sm:px-6"
          >
            <p className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {stat.value}
            </p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-tight text-muted-foreground">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FounderLoopCard({
  variant,
  label,
  heading,
  bullets,
}: {
  variant: "without" | "with";
  label: string;
  heading: string;
  bullets: readonly string[];
}) {
  const isWithout = variant === "without";

  return (
    <article className="glass-strong flex flex-col rounded-2xl border border-border/60 p-6 sm:p-8">
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
        {bullets.map((bullet) => (
          <li
            key={bullet}
            className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
          >
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
        ))}
      </ul>
    </article>
  );
}

function SafeForCommunitiesSection() {
  return (
    <section className="border-t border-border/40 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <MonoEyebrow>{"// Safe for Communities"}</MonoEyebrow>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Plays by the rules. Built to last.
        </h2>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
          {TRUST_COLUMNS.map((col) => (
            <article
              key={col.title}
              className="glass-strong flex flex-col gap-3 rounded-2xl border border-border/60 p-6"
            >
              <p className="font-mono text-lg text-primary" aria-hidden>
                [{col.icon}]
              </p>
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                {col.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {col.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 border-t border-border/60 pt-8">
          <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">
            Designed for the communities that actually matter. VelocityHub supports
            the five primary distribution channels for indie SaaS — each with
            platform-specific tone calibration built in.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {CHANNEL_BADGES.map((channel) => (
              <span
                key={channel}
                className="rounded-full border border-border/60 bg-muted/20 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-foreground"
              >
                {channel}
              </span>
            ))}
          </div>
        </div>
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
      <header className="glass-strong sticky top-0 z-50 w-full border-b border-border/60">
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
            className="pointer-events-none absolute inset-0 grid-bg opacity-35 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]"
            aria-hidden
          />
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <MonoEyebrow>Growth ecosystem · Built for vibe coders</MonoEyebrow>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
              You shipped the product. Now comes the{" "}
              <span className="text-primary">hard part</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Stop guessing what to post. We hunt high-intent leads, intercept
              viral threads, and write your founder timeline automatically while
              you write code.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <AuthCTAs hasSession={hasSession} />
            </div>
            <HeroStatStrip />
          </div>
        </section>

        <section className="border-b border-border/40 px-6 py-12 sm:py-16">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <FounderLoopCard variant="without" {...WITHOUT_LOOP} />
            <FounderLoopCard variant="with" {...WITH_LOOP} />
          </div>
        </section>

        <section id="ecosystem" className="px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 max-w-2xl">
              <MonoEyebrow>The bento manifesto</MonoEyebrow>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Four engines. One distribution stack.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Not a CRM — a growth operating system for indie hackers who ship
                in public and hate marketing theater.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-12 lg:gap-6">
              {BENTO_FEATURES.map((feature) => (
                <BentoCard key={feature.id} feature={feature} />
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
            <div className="glass-strong rounded-2xl border border-border/60 p-8 text-center sm:p-10">
              <MonoEyebrow>Ready to wire the stack</MonoEyebrow>
              <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Your product deserves to be{" "}
                <span className="text-primary">found.</span>
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Join indie founders who stopped treating distribution as a side
                quest. Free tier, no credit card. The Hunter, Engine, and Shield
                running from day one.
              </p>
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
              <p className="mt-6 font-mono text-[11px] uppercase tracking-tight text-muted-foreground">
                Free tier includes 50 leads/mo · No credit card · Cancel whenever
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
