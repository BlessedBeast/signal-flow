"use client";

import FadeUp from "@/components/ui/fade-up";
import { cn } from "@/lib/utils";

const GLASS_CARD =
  "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 backdrop-blur-md";

const INNER_MOCK =
  "mt-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3";

function ReflectionMockup() {
  return (
    <div className={INNER_MOCK}>
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>TODAY&apos;S TASKS</span>
        <span>MON 23</span>
      </div>
      <div className="my-2 border-b border-white/[0.08]" />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <div
            className="mt-0.5 size-3.5 shrink-0 rounded-sm border border-primary bg-primary"
            aria-hidden
          />
          <span className="text-xs text-muted-foreground line-through">
            Reply to r/SaaS thread: best solo CRM tools
          </span>
        </div>
        <span className="shrink-0 text-xs text-primary">Done ✓</span>
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <div
            className="mt-0.5 size-3.5 shrink-0 rounded-sm border border-border"
            aria-hidden
          />
          <span className="text-xs font-medium text-foreground">
            Post BIP update: shipped Circuit Breaker logic
          </span>
        </div>
        <span className="shrink-0 cursor-default text-xs text-primary">
          → Open
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>2 of 2 tasks generated</span>
        <span className="font-mono">Reflection Engine</span>
      </div>
    </div>
  );
}

function BipMockup() {
  return (
    <div className={INNER_MOCK}>
      <div className="mb-2 flex items-center gap-2">
        <div className="size-6 shrink-0 rounded-full bg-muted" aria-hidden />
        <span className="text-xs text-foreground">you</span>
        <span className="text-xs text-muted-foreground">2 min ago</span>
      </div>
      <p className="text-xs leading-relaxed text-foreground">
        Shipped the anti-duplication lock today. Sounds like a small thing. The
        UX difference is actually night and day. Here&apos;s what I learned →
      </p>
      <p className="mt-2 flex gap-3 text-xs text-muted-foreground">
        <span>♥ 47</span>
        <span>↺ 12</span>
        <span>💬 8</span>
      </p>
    </div>
  );
}

function InboundMockup() {
  const rows = [
    {
      active: true,
      title: "THE PLUG",
      sub: "Introduce where genuinely relevant",
    },
    { active: false, title: "HYPE MULTIPLIER", sub: "Amplify positive signal" },
    {
      active: false,
      title: "HATER DEFLECTOR",
      sub: "Turn criticism into credibility",
    },
  ] as const;

  return (
    <div className={INNER_MOCK}>
      {rows.map((row) => (
        <div
          key={row.title}
          className={cn(
            "flex items-center justify-between rounded-lg px-2 py-2",
            row.active && "border-l-2 border-primary bg-white/[0.04]"
          )}
        >
          <div>
            <p
              className={cn(
                "font-mono text-xs",
                row.active ? "font-bold text-foreground" : "text-foreground"
              )}
            >
              {row.title}
            </p>
            <p className="text-xs text-muted-foreground">{row.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function GeoMockup() {
  const seeds = [
    {
      num: "01",
      query: "What's the best tool for Reddit marketing automation?",
      tag: "FAQ Schema",
    },
    {
      num: "02",
      query: "How do indie hackers find leads without cold email?",
      tag: "HowTo Schema",
    },
    {
      num: "03",
      query: "Best organic growth tools for solo founders 2025",
      tag: "Article Schema",
    },
  ] as const;

  return (
    <div className={INNER_MOCK}>
      <p className="mb-2 font-mono text-[10px] uppercase text-muted-foreground">
        SEMANTIC SEEDS GENERATED
      </p>
      {seeds.map((seed) => (
        <div
          key={seed.num}
          className="flex items-start gap-2 border-b border-white/[0.05] py-1.5 last:border-0"
        >
          <span className="w-5 shrink-0 font-mono text-[10px] text-muted-foreground">
            {seed.num}
          </span>
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            {seed.query}
          </p>
          <span className="shrink-0 rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] text-primary">
            {seed.tag}
          </span>
        </div>
      ))}
      <p className="mt-3 font-mono text-[10px] text-muted-foreground">
        3 of 12 seeds active · 217 entities indexed
      </p>
    </div>
  );
}

function SideCarsMockup() {
  const items = [
    { name: "Reddit ROI Calculator", leads: "↑ 34 leads", active: true },
    { name: "SaaS Distribution Audit", leads: "↑ 19 leads", active: true },
    { name: "Cold Email Grader", leads: "Generating...", active: false },
  ] as const;

  return (
    <div className={INNER_MOCK}>
      <p className="mb-2 font-mono text-xs uppercase text-muted-foreground">
        ACTIVE SIDE-CARS
      </p>
      {items.map((item) => (
        <div
          key={item.name}
          className="flex items-center justify-between gap-2 py-1.5"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                item.active ? "bg-primary" : "bg-primary/40"
              )}
              aria-hidden
            />
            <span
              className={cn(
                "text-xs",
                item.active ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {item.name}
            </span>
          </div>
          <span
            className={cn(
              "shrink-0 text-xs",
              item.active ? "text-primary" : "text-muted-foreground"
            )}
          >
            {item.leads}
          </span>
        </div>
      ))}
      <p className="mt-2 text-xs text-muted-foreground">
        3 active tools · 53 total leads captured
      </p>
    </div>
  );
}

type BentoCardProps = {
  tag: string;
  title: string;
  bodyLine1: string;
  bodyLine2: string;
  mockup: React.ReactNode;
  className?: string;
  delay: number;
};

function BentoCard({
  tag,
  title,
  bodyLine1,
  bodyLine2,
  mockup,
  className,
  delay,
}: BentoCardProps) {
  return (
    <FadeUp delay={delay} className={cn(GLASS_CARD, className)}>
      <p className="font-mono text-xs uppercase text-muted-foreground">{tag}</p>
      <h3 className="mt-2 text-base font-bold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {bodyLine1}
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {bodyLine2}
      </p>
      {mockup}
    </FadeUp>
  );
}

export function Arsenal() {
  return (
    <section className="px-6 py-20">
      <FadeUp className="mx-auto max-w-5xl">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {"// THE ARSENAL"}
        </p>
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
          Five specialized labs. One daily checklist.
        </h2>
        <p className="mt-3 max-w-xl text-base text-muted-foreground">
          Each lab runs autonomously. You only touch the output.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12">
          <BentoCard
            tag="CORE ENGINE"
            title="Your AI CMO. Checks in every morning."
            bodyLine1="Two pre-written tasks. Every day."
            bodyLine2="Based on live web scraping. Zero effort."
            mockup={<ReflectionMockup />}
            className="lg:col-span-7"
            delay={0}
          />
          <BentoCard
            tag="CONTENT LAB"
            title="Raw commits → viral personal brand."
            bodyLine1="Git history becomes a 4-part story."
            bodyLine2="Posted to X and LinkedIn automatically."
            mockup={<BipMockup />}
            className="lg:col-span-5"
            delay={0.07}
          />
          <BentoCard
            tag="REPLY LAB"
            title="50 replies. Batch approved. 90 seconds."
            bodyLine1="Paste notifications. Pick a posture."
            bodyLine2="AI writes every reply. You approve."
            mockup={<InboundMockup />}
            className="lg:col-span-5"
            delay={0.14}
          />
          <BentoCard
            tag="AEO LAB"
            title="Rank inside AI before competitors wake up."
            bodyLine1="Semantic markup that trains Perplexity,"
            bodyLine2="ChatGPT, and Gemini to cite you first."
            mockup={<GeoMockup />}
            className="lg:col-span-7"
            delay={0.21}
          />
          <FadeUp delay={0.28} className={cn(GLASS_CARD, "lg:col-span-12")}>
            <p className="font-mono text-xs uppercase text-muted-foreground">
              LEAD CAPTURE LAB
            </p>
            <h3 className="mt-2 text-base font-bold tracking-tight text-foreground">
              Micro-tools that harvest emails while you ship.
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Approve the idea. AI builds the tool.
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Calculators, audits, checklists. On autopilot.
                </p>
              </div>
              <SideCarsMockup />
            </div>
          </FadeUp>
        </div>
      </FadeUp>
    </section>
  );
}
