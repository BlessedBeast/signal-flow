"use client";

import FadeUp from "@/components/ui/fade-up";
import { cn } from "@/lib/utils";

const GLASS =
  "rounded-2xl border border-white/[0.08] bg-white/[0.02] p-7 backdrop-blur-md";

type MetricRow = {
  headline: string;
  sub: string;
};

const PAID_TRAP_ROWS: MetricRow[] = [
  {
    headline: "CAC Inflation Is Guaranteed",
    sub: "Every competitor bidding raises your cost. Always.",
  },
  {
    headline: "Traffic Dies With the Budget",
    sub: "Stop paying. Traffic hits zero. No residual asset.",
  },
  {
    headline: "Zero Domain Authority Gain",
    sub: "Ads build Google's business. Not yours.",
  },
  {
    headline: "Ad Fatigue Is a Physics Problem",
    sub: "Same audience. Diminishing returns. Unavoidable.",
  },
  {
    headline: "You're Renting, Not Owning",
    sub: "Landlord is Meta or Google. Lease ends anytime.",
  },
  {
    headline: "AI Search Ignores You Completely",
    sub: "Perplexity and ChatGPT don't cite ad copy.",
  },
];

const COMPOUNDING_ROWS: MetricRow[] = [
  {
    headline: "Zero Recurring Acquisition Cost",
    sub: "Assets compound. Cost stays flat. Margin expands.",
  },
  {
    headline: "Traffic Grows While You Sleep",
    sub: "Every indexed page earns forever. No expiry.",
  },
  {
    headline: "Domain Authority Rises Every Week",
    sub: "Programmatic SEO pages build a moat competitors can't buy.",
  },
  {
    headline: "Community Trust Is Owned, Not Rented",
    sub: "Reddit equity. HN reputation. Permanent signals.",
  },
  {
    headline: "AI Engines Recommend You Organically",
    sub: "Perplexity, Gemini, ChatGPT cite semantic authority — not ads.",
  },
  {
    headline: "Every Action Is a Permanent Asset",
    sub: "Thread reply, BIP post, SEO page. Compounds forever.",
  },
];

function ComparisonRows({
  rows,
  positive,
}: {
  rows: MetricRow[];
  positive: boolean;
}) {
  return (
    <ul>
      {rows.map((row) => (
        <li
          key={row.headline}
          className="flex items-start gap-3 border-b border-white/[0.05] py-2.5 last:border-0"
        >
          <span
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
              positive
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive"
            )}
            aria-hidden
          >
            {positive ? "✓" : "✗"}
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">{row.headline}</p>
            <p className="text-xs text-muted-foreground">{row.sub}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function MetricStrip({
  cols,
  positive,
}: {
  cols: { value: string; label: string }[];
  positive: boolean;
}) {
  return (
    <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/[0.05] pt-5">
      {cols.map((col) => (
        <div key={col.label}>
          <p
            className={cn(
              "text-2xl font-extrabold tracking-tight",
              positive ? "text-primary" : "text-destructive"
            )}
          >
            {col.value}
          </p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {col.label}
          </p>
        </div>
      ))}
    </div>
  );
}

export function CompoundingCurve() {
  return (
    <section className="w-full py-24">
      <div className="mx-auto max-w-5xl px-6">
        <FadeUp>
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {"// THE COMPOUNDING CURVE"}
          </p>
          <h2 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-foreground">
            The Ad Trap is a sinking game.
            <br />
            Organic compounds forever.
          </h2>
          <p className="mt-3 max-w-lg text-sm text-muted-foreground">
            Every dollar spent on ads rents traffic. We build it.
          </p>
        </FadeUp>

        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
          <FadeUp delay={0.05} className={GLASS}>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Status quo
            </p>
            <h3 className="mb-5 text-xl font-extrabold tracking-tight text-foreground">
              The Paid Ad Trap
            </h3>
            <ComparisonRows rows={PAID_TRAP_ROWS} positive={false} />
            <MetricStrip
              positive={false}
              cols={[
                { value: "$0", label: "Long-term asset value" },
                { value: "100%", label: "Traffic lost when budget stops" },
                { value: "0x", label: "Domain authority contribution" },
              ]}
            />
          </FadeUp>

          <FadeUp
            delay={0.12}
            className={cn(GLASS, "ring-1 ring-inset ring-primary/20")}
          >
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-primary">
              SignalFlow
            </p>
            <h3 className="mb-5 text-xl font-extrabold tracking-tight text-foreground">
              The Compounding Moat
            </h3>
            <ComparisonRows rows={COMPOUNDING_ROWS} positive />
            <MetricStrip
              positive
              cols={[
                { value: "∞", label: "Asset value over time" },
                { value: "0", label: "Traffic lost at month end" },
                { value: "↑ DA", label: "Authority gain per week" },
              ]}
            />
          </FadeUp>
        </div>
      </div>
    </section>
  );
}
