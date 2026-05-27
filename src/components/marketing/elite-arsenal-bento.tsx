"use client";

import { motion } from "framer-motion";
import {
  Globe,
  MessageSquareQuote,
  PanelsTopLeft,
  Wand2,
} from "lucide-react";

import { SectionRule } from "@/components/marketing/fade-up";
import { SECTION_FADE, staggerDelay } from "@/components/marketing/motion-presets";
import { cn } from "@/lib/utils";

type ArsenalCard = {
  id: string;
  module: string;
  headline: string;
  subtitle: string;
  icon: typeof Globe;
  accent: string;
  glow: string;
  visual: React.ReactNode;
};

function BipVisual() {
  return (
    <div className="mt-auto flex gap-1.5 pt-8" aria-hidden>
      {[92, 78, 64].map((h) => (
        <div
          key={h}
          className="flex-1 rounded-md border border-white/[0.08] bg-gradient-to-t from-primary/30 to-transparent"
          style={{ height: h / 4 }}
        />
      ))}
    </div>
  );
}

function InboundVisual() {
  return (
    <div className="mt-auto space-y-2 pt-8" aria-hidden>
      {[
        { tier: "HOT", w: "92%" },
        { tier: "WARM", w: "71%" },
        { tier: "HOT", w: "88%" },
      ].map((row) => (
        <div
          key={row.tier + row.w}
          className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-2"
        >
          <span className="w-8 font-mono text-[9px] font-bold text-orange-400">
            {row.tier}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500/80 to-primary/60"
              style={{ width: row.w }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function GeoVisual() {
  return (
    <div className="relative mt-auto h-28 pt-6" aria-hidden>
      <div className="absolute inset-x-0 bottom-2 flex justify-center gap-2">
        {["Perplexity", "Gemini", "GPT"].map((label) => (
          <span
            key={label}
            className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 font-mono text-[8px] uppercase text-cyan-300/90"
          >
            {label}
          </span>
        ))}
      </div>
      <div className="absolute left-1/2 top-6 size-20 -translate-x-1/2 rounded-full border border-cyan-400/30 bg-cyan-500/10 blur-md" />
      <Globe className="absolute left-1/2 top-10 size-9 -translate-x-1/2 text-cyan-400" />
    </div>
  );
}

function SideCarVisual() {
  return (
    <div className="mt-auto grid grid-cols-3 gap-2 pt-8" aria-hidden>
      {["Calc", "Audit", "ROI"].map((label) => (
        <div
          key={label}
          className="flex aspect-square flex-col items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/15 shadow-[0_0_24px_-8px_rgba(139,92,246,0.5)]"
        >
          <PanelsTopLeft className="size-3.5 text-violet-300" />
          <span className="mt-1 font-mono text-[8px] font-semibold text-violet-200/80">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

const CARDS: ArsenalCard[] = [
  {
    id: "bip",
    module: "BIP Storyteller",
    headline: "Brand Velocity on Autopilot",
    subtitle:
      "Turn raw code commits into viral personal branding loops for X & LinkedIn.",
    icon: Wand2,
    accent: "from-primary/30",
    glow: "shadow-primary/10",
    visual: <BipVisual />,
  },
  {
    id: "inbound",
    module: "1-Click Replier",
    headline: "Mass Inbound Traffic Capture",
    subtitle:
      "Batch-approve and deploy high-intent forum comments simultaneously.",
    icon: MessageSquareQuote,
    accent: "from-orange-500/25",
    glow: "shadow-orange-500/10",
    visual: <InboundVisual />,
  },
  {
    id: "geo",
    module: "GEO Seeds Lab",
    headline: "Own the Answer Engines",
    subtitle:
      "Optimize your web architecture to rank inside Perplexity, Gemini, and ChatGPT searches.",
    icon: Globe,
    accent: "from-cyan-500/25",
    glow: "shadow-cyan-500/10",
    visual: <GeoVisual />,
  },
  {
    id: "sidecars",
    module: "Side-Cars Engine",
    headline: "Programmatic Lead Magnets",
    subtitle:
      "Spin up high-utility programmatic micro-tools that harvest emails while you sleep.",
    icon: PanelsTopLeft,
    accent: "from-violet-500/25",
    glow: "shadow-violet-500/10",
    visual: <SideCarVisual />,
  },
];

function ArsenalCard({ card, index }: { card: ArsenalCard; index: number }) {
  const Icon = card.icon;

  return (
    <motion.article
      {...SECTION_FADE}
      transition={{ ...SECTION_FADE.transition, delay: staggerDelay(index, 0.06) }}
      className={cn(
        "group relative flex min-h-[240px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-6 backdrop-blur-md transition-all duration-300",
        "hover:border-white/[0.14] hover:shadow-xl",
        card.glow
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-gradient-to-br to-transparent opacity-70 blur-3xl transition-opacity group-hover:opacity-100",
          card.accent
        )}
        aria-hidden
      />
      <div className="relative flex items-center justify-between">
        <div className="flex size-10 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-primary">
          <Icon className="size-4" aria-hidden />
        </div>
        <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">
          {card.module}
        </span>
      </div>
      <h3 className="relative mt-5 text-xl font-extrabold tracking-tight text-white">
        {card.headline}
      </h3>
      <p className="relative mt-2 max-w-[32ch] text-sm leading-snug text-zinc-400">
        {card.subtitle}
      </p>
      <div className="relative flex-1">{card.visual}</div>
    </motion.article>
  );
}

export function EliteArsenalSection() {
  return (
    <section
      id="ecosystem"
      className="border-b border-border/40 px-6 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionRule />
        <motion.div className="mt-10 mb-10 max-w-2xl" {...SECTION_FADE}>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            03 · Elite arsenal
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Premium labs. Zero fluff.
          </h2>
        </motion.div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5">
          {CARDS.map((card, index) => (
            <ArsenalCard key={card.id} card={card} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
