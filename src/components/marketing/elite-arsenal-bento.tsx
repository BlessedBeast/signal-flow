"use client";

import { motion } from "framer-motion";
import {
  Globe,
  MessageSquareQuote,
  PanelsTopLeft,
  Wand2,
} from "lucide-react";

import { SectionRule } from "@/components/marketing/fade-up";
import { cn } from "@/lib/utils";

type ArsenalCard = {
  id: string;
  headline: string;
  subtitle: string;
  icon: typeof Globe;
  accent: string;
  visual: React.ReactNode;
};

const viewMotion = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.12 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

function BipVisual() {
  return (
    <div className="mt-auto flex gap-1 pt-6" aria-hidden>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-12 flex-1 rounded-md border border-white/[0.06] bg-gradient-to-t from-primary/20 to-transparent"
          style={{ opacity: 1 - i * 0.2 }}
        />
      ))}
    </div>
  );
}

function InboundVisual() {
  return (
    <div className="mt-auto space-y-2 pt-6" aria-hidden>
      {["HOT", "WARM", "HOT"].map((tier, i) => (
        <div
          key={i}
          className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-muted/20 px-2 py-1.5"
        >
          <span
            className={cn(
              "font-mono text-[9px] font-bold",
              tier === "HOT" ? "text-orange-400" : "text-amber-400/80"
            )}
          >
            {tier}
          </span>
          <div className="h-1.5 flex-1 rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-primary/60"
              style={{ width: `${88 - i * 20}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function GeoVisual() {
  return (
    <div className="relative mt-auto h-24 pt-6" aria-hidden>
      <div className="absolute inset-x-4 bottom-0 flex justify-center gap-3">
        {["Perplexity", "Gemini", "GPT"].map((label) => (
          <span
            key={label}
            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 font-mono text-[8px] uppercase text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>
      <div className="mx-auto size-16 rounded-full border border-cyan-500/30 bg-cyan-500/10 blur-sm" />
      <Globe className="absolute left-1/2 top-8 size-8 -translate-x-1/2 text-cyan-400/80" />
    </div>
  );
}

function SideCarVisual() {
  return (
    <div className="mt-auto grid grid-cols-3 gap-1.5 pt-6" aria-hidden>
      {["Calc", "Audit", "ROI"].map((label) => (
        <div
          key={label}
          className="flex aspect-square flex-col items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10"
        >
          <PanelsTopLeft className="size-3 text-violet-400" />
          <span className="mt-1 font-mono text-[8px] text-violet-300/80">
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
    headline: "Brand Velocity on Autopilot",
    subtitle:
      "Turn raw code commits into viral personal branding loops for X & LinkedIn.",
    icon: Wand2,
    accent: "from-primary/25",
    visual: <BipVisual />,
  },
  {
    id: "inbound",
    headline: "Mass Inbound Traffic Capture",
    subtitle:
      "Batch-approve and deploy high-intent forum comments simultaneously.",
    icon: MessageSquareQuote,
    accent: "from-orange-500/20",
    visual: <InboundVisual />,
  },
  {
    id: "geo",
    headline: "Own the Answer Engines",
    subtitle:
      "Optimize your web architecture to rank inside Perplexity, Gemini, and ChatGPT searches.",
    icon: Globe,
    accent: "from-cyan-500/20",
    visual: <GeoVisual />,
  },
  {
    id: "sidecars",
    headline: "Programmatic Lead Magnets",
    subtitle:
      "Spin up high-utility programmatic micro-tools that harvest emails while you sleep.",
    icon: PanelsTopLeft,
    accent: "from-violet-500/20",
    visual: <SideCarVisual />,
  },
];

function ArsenalCard({ card, index }: { card: ArsenalCard; index: number }) {
  const Icon = card.icon;

  return (
    <motion.article
      {...viewMotion}
      transition={{ ...viewMotion.transition, delay: index * 0.06 }}
      className={cn(
        "group relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 backdrop-blur-md transition-colors duration-300",
        "hover:border-white/[0.14] hover:bg-white/[0.04]"
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-gradient-to-br to-transparent opacity-60 blur-2xl transition-opacity group-hover:opacity-100",
          card.accent
        )}
        aria-hidden
      />
      <div className="relative flex size-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-primary">
        <Icon className="size-4" aria-hidden />
      </div>
      <p className="relative mt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {card.id === "bip"
          ? "BIP Storyteller"
          : card.id === "inbound"
            ? "1-Click Replier"
            : card.id === "geo"
              ? "GEO Seeds Lab"
              : "Side-Cars Engine"}
      </p>
      <h3 className="relative mt-2 text-lg font-extrabold leading-tight tracking-tight text-foreground">
        {card.headline}
      </h3>
      <p className="relative mt-2 max-w-[28ch] text-xs leading-relaxed text-muted-foreground">
        {card.subtitle}
      </p>
      <div className="relative flex-1">{card.visual}</div>
    </motion.article>
  );
}

export function EliteArsenalSection() {
  return (
    <section id="ecosystem" className="border-b border-border/40 px-6 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionRule />
        <motion.div className="mt-10 mb-10 max-w-2xl" {...viewMotion}>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Elite arsenal
          </p>
          <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
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
