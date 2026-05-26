"use client";

import { motion, useInView } from "framer-motion";
import { Flame } from "lucide-react";
import { useRef } from "react";

import { cn } from "@/lib/utils";

function useLedgerInView() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  return { ref, inView };
}

const LEDGER_ROWS = [
  {
    platform: "r/saas",
    text: "Does anyone know a tool that auto-posts dev updates to Twitter? I keep forgetting.",
    time: "2 min ago",
    isNew: true,
  },
  {
    platform: "hn",
    text: "Sick of manually combing Reddit for potential customers. There has to be a better way.",
    time: "41 min ago",
    isNew: false,
  },
  {
    platform: "r/indiehackers",
    text: "Spent 3 hours yesterday looking for relevant threads. Zero conversions. I'm losing my mind.",
    time: "3 hr ago",
    isNew: false,
  },
] as const;

export function DailyDropLedgerMockup() {
  const { ref, inView } = useLedgerInView();

  return (
    <div
      ref={ref}
      className="mt-5 rounded-xl border border-border/60 bg-muted/20 p-3"
      aria-hidden
    >
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.1em]">
        <span className="text-muted-foreground">Daily drop ledger</span>
        <span className="text-primary">12 leads</span>
      </div>
      <div className="my-2 h-px bg-border/60" />
      <ul className="space-y-3">
        {LEDGER_ROWS.map((row, index) => (
          <motion.li
            key={row.platform}
            initial={{ opacity: 0, x: -8 }}
            animate={inView ? { opacity: 1, x: 0 } : undefined}
            transition={{
              duration: 0.35,
              ease: "easeOut",
              delay: index * 0.12,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="shrink-0 rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                {row.platform}
              </span>
              {row.isNew ? (
                <span className="badge-shimmer shrink-0 rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase text-primary">
                  NEW
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {row.text}
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
              {row.time}
            </p>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

const VELOCITY_ROWS = [
  {
    tier: "HOT",
    hot: true,
    title: "I'm done paying $200/mo for tools that don't — ",
    velocity: 84,
    window: "GOLDEN HOUR WINDOW: 34M",
  },
  {
    tier: "WARM",
    hot: false,
    title: "Any good alternatives to Buffer for indie —",
    velocity: 60,
    window: null,
  },
  {
    tier: "COLD",
    hot: false,
    title: "What's everyone using for social scheduling —",
    velocity: 24,
    window: null,
  },
] as const;

function VelocityBar({ percent, animate }: { percent: number; animate: boolean }) {
  return (
    <div className="h-1 w-12 overflow-hidden rounded-full bg-border/60">
      <motion.div
        className="h-full rounded-full bg-primary"
        initial={{ width: 0 }}
        animate={animate ? { width: `${percent}%` } : { width: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
    </div>
  );
}

export function VelocityRadarMockup() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <div ref={ref} className="mt-5 divide-y divide-border/60" aria-hidden>
      {VELOCITY_ROWS.map((row) => (
        <div key={row.tier} className="space-y-1 py-3 first:pt-0 last:pb-0">
          <div className="flex items-center gap-2">
            <div className="flex w-16 shrink-0 items-center gap-1">
              {row.hot ? (
                <Flame className="size-3.5 shrink-0 text-destructive" aria-hidden />
              ) : null}
              <span
                className={cn(
                  "font-mono text-[11px] font-bold uppercase tracking-wider",
                  row.hot
                    ? "text-destructive"
                    : row.tier === "WARM"
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60"
                )}
              >
                {row.tier}
              </span>
            </div>
            <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
              {row.title}
            </p>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase text-muted-foreground">
                  velocity {row.velocity}
                </span>
                <VelocityBar percent={row.velocity} animate={inView} />
              </div>
              {row.window ? (
                <span className="font-mono text-[9px] text-muted-foreground/70">
                  {row.window}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BipTimelineMockup() {
  return (
    <div className="mt-5" aria-hidden>
      <div className="relative">
        <div className="flex items-end justify-between gap-2">
          <div className="flex-1 text-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Mon
            </span>
          </div>
          <div className="relative flex-1 text-center">
            <span
              className="live-pulse-dot absolute -top-2 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary"
              aria-hidden
            />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-foreground underline decoration-primary decoration-2 underline-offset-4">
              Tue
            </span>
          </div>
          <div className="flex-1 text-center">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/60">
              Wed
            </span>
          </div>
        </div>
        <div className="mt-2 h-px bg-border/60" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <p className="rounded-md border border-transparent px-1 py-0.5 text-[10px] leading-snug text-muted-foreground">
            → shipped auth refresh + daily drop core
          </p>
          <p className="rounded-md border border-transparent px-1 py-0.5 text-[10px] leading-snug text-muted-foreground">
            → wired plug alerts to session velocity
          </p>
        </div>
        <div>
          <p className="rounded-md border border-border/40 px-1 py-0.5 text-[10px] leading-snug text-foreground">
            → today: inbound replier protocol engine
            <span className="cursor-blink ml-0.5 inline-block w-0.5 bg-foreground">
              |
            </span>
          </p>
        </div>
        <div>
          <p className="rounded-md border border-dashed border-border/50 px-1 py-0.5 text-[10px] text-shimmer-loading">
            (generating...)
          </p>
        </div>
      </div>
    </div>
  );
}

const POSTURES = [
  { label: "PLUG", description: "Introduce where genuinely relevant", active: true },
  { label: "HYPE", description: "Amplify positive signal", active: false },
  { label: "DEFLECT", description: "Turn criticism into credibility", active: false },
] as const;

export function InboundPostureMockup() {
  return (
    <div className="mt-5 space-y-3" aria-hidden>
      <div className="divide-y divide-border/60 rounded-lg border border-border/60">
        {POSTURES.map((posture) => (
          <div
            key={posture.label}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5",
              posture.active && "border-l-2 border-l-primary bg-primary/5"
            )}
          >
            <span
              className={cn(
                "w-14 shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wider",
                posture.active ? "text-primary" : "text-muted-foreground"
              )}
            >
              {posture.label}
            </span>
            <span className="text-xs text-muted-foreground">{posture.description}</span>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border/60 p-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          3 comments found
        </p>
        <p className="mt-2 text-xs italic leading-relaxed text-muted-foreground">
          tbh this is the exact workflow i needed — shipped mine last week
        </p>
        <div className="mt-3 border-t border-border/50 pt-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">Suggested reply:</span>
            <button
              type="button"
              className="rounded-md border border-border/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
              tabIndex={-1}
            >
              1-click copy
            </button>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-foreground">
            glad it clicked — took us a while to nail the posture logic but the
            results are night and day 🙏
          </p>
        </div>
      </div>
    </div>
  );
}
