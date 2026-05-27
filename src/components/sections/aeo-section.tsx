"use client";

import FadeUp from "@/components/ui/fade-up";
import { cn } from "@/lib/utils";

const GLASS =
  "rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md";

const ENGINES = [
  { name: "Perplexity", width: "82%", status: "INDEXED" },
  { name: "ChatGPT", width: "71%", status: "INDEXED" },
  { name: "Gemini", width: "64%", status: "INDEXING" },
] as const;

const STAT_CARDS = [
  { value: "0", label: "Ad spend to rank in AI search", destructive: true },
  { value: "∞", label: "Shelf life of a semantic asset", destructive: false },
  { value: "3x", label: "Faster citation vs. traditional SEO", destructive: false },
] as const;

function FeatureRow({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span
        className="mt-1.5 size-1.5 shrink-0 rounded-sm bg-primary"
        aria-hidden
      />
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

export function AEOSection() {
  return (
    <section className="w-full py-20">
      <div className="mx-auto max-w-5xl px-6">
        <FadeUp>
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {"// THE AI SEARCH REALITY"}
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground">
            Optimize for the Answer Engines.
          </h2>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Buyers ask AI now. Are you the answer it gives?
          </p>
        </FadeUp>

        <FadeUp delay={0.06} className={cn(GLASS, "mt-10 p-8")}>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
                The search bar is dead.
              </h3>
              <p className="mb-2 mt-4 text-sm text-muted-foreground">
                Buyers don&apos;t Google and browse anymore.
              </p>
              <p className="mb-2 text-sm text-muted-foreground">
                They ask Perplexity. They ask ChatGPT. They ask Gemini.
              </p>
              <p className="text-sm text-muted-foreground">
                The answer those engines give is not an ad. It&apos;s the most
                semantically trusted source.
              </p>

              <div className="my-5 border-t border-white/[0.08]" />

              <FeatureRow
                title="GEO Seeds Lab generates structured schema markup"
                sub="Trains AI engines to cite you as the source."
              />
              <FeatureRow
                title="Semantic content clusters built automatically"
                sub="Topical authority that AI models trust and reference."
              />
              <FeatureRow
                title="Answer-optimized FAQ and entity markup"
                sub="Every page answers the exact query AI engines index."
              />
            </div>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  AEO INDEX STATUS
                </span>
                <span className="flex items-center gap-1.5 font-mono text-[10px] text-primary">
                  <span
                    className="size-2 animate-pulse rounded-full bg-primary"
                    aria-hidden
                  />
                  LIVE
                </span>
              </div>
              <div className="my-3 border-t border-white/[0.08]" />
              {ENGINES.map((engine) => (
                <div
                  key={engine.name}
                  className="flex items-center justify-between gap-3 border-b border-white/[0.05] py-2.5 last:border-0"
                >
                  <span className="text-sm font-medium text-foreground">
                    {engine.name}
                  </span>
                  <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                    <div className="h-1.5 w-28 max-w-[45%] overflow-hidden rounded-full bg-white/[0.08] sm:max-w-none">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: engine.width }}
                      />
                    </div>
                    <span className="shrink-0 font-mono text-[10px] uppercase text-primary">
                      {engine.status}
                    </span>
                  </div>
                </div>
              ))}
              <p className="mt-3 font-mono text-[10px] text-muted-foreground">
                3 engines tracking · 217 semantic entities seeded
              </p>
            </div>
          </div>
        </FadeUp>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {STAT_CARDS.map((card, index) => (
            <FadeUp
              key={card.label}
              delay={index * 0.07}
              className={cn(GLASS, "rounded-xl p-5")}
            >
              <p
                className={cn(
                  "text-3xl font-extrabold tracking-tight",
                  card.destructive ? "text-destructive" : "text-primary"
                )}
              >
                {card.value}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {card.label}
              </p>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
