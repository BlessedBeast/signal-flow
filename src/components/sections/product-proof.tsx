"use client";

import FadeUp from "@/components/ui/fade-up";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GLASS =
  "w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md";

export function ProductProof() {
  return (
    <section className="w-full py-16">
      <div className="mx-auto max-w-4xl px-6">
        <FadeUp>
          <p className="mb-6 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {"// WHAT WAITS FOR YOU EVERY MORNING"}
          </p>
        </FadeUp>

        <FadeUp delay={0.08} className={GLASS}>
          <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.04] px-4 py-3">
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-white/20" />
              <span className="size-2.5 rounded-full bg-white/30" />
              <span className="size-2.5 rounded-full bg-white/40" />
            </div>
            <div className="mx-3 hidden min-w-0 flex-1 rounded-md border border-white/[0.08] bg-white/[0.06] px-3 py-1 sm:block">
              <span className="font-mono text-[11px] text-muted-foreground">
                app.signalflow.co/dashboard
              </span>
            </div>
            <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 font-mono text-[10px] text-primary">
              ● LIVE
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  TODAY&apos;S TASKS
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  MON · JUN 23
                </span>
              </div>

              <div className="mb-3 rounded-xl border border-white/[0.06] bg-white/[0.04] p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 size-4 shrink-0 rounded-sm bg-primary"
                    aria-hidden
                  />
                  <p className="text-sm font-medium text-muted-foreground line-through">
                    Reply to r/SaaS: &apos;What CRM do solo founders actually
                    use?&apos;
                  </p>
                </div>
                <div className="ml-7 mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                      r/SaaS
                    </span>
                    <span className="rounded-sm bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      847 members online
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-primary">✓ Done</span>
                </div>
              </div>

              <div
                className={cn(
                  "rounded-xl border border-white/[0.12] bg-white/[0.06] p-4",
                  "ring-1 ring-inset ring-primary/15"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="mt-0.5 size-4 shrink-0 rounded-sm border border-white/20"
                    aria-hidden
                  />
                  <p className="text-sm font-medium text-foreground">
                    Post BIP update: shipped Circuit Breaker logic
                  </p>
                </div>
                <div className="ml-7 mt-2 flex flex-wrap gap-2">
                  <span className="rounded-sm bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    X · Twitter
                  </span>
                  <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                    Draft ready
                  </span>
                </div>
                <div className="ml-7 mt-3 rounded-lg border border-white/[0.08] bg-white/[0.04] p-3">
                  <p className="text-[11px] italic leading-relaxed text-muted-foreground">
                    Shipped the anti-duplication lock yesterday. Sounds like a
                    small detail. The UX delta is actually significant —
                    here&apos;s the reasoning that took us 3 iterations →
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground">
                      AI-generated · matches your voice
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 border-white/[0.08] bg-transparent px-2 text-[11px]"
                    >
                      Copy & Post →
                    </Button>
                  </div>
                </div>
                <div className="ml-7 mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Reflection Engine
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Source: r/indiehackers · 2 min ago
                  </span>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="font-mono text-[10px] text-muted-foreground">
                  2 of 2 tasks generated · refreshes in 23h
                </span>
                <div className="h-1 w-20 overflow-hidden rounded-full bg-white/[0.08]">
                  <div className="h-full w-1/2 rounded-full bg-primary" />
                </div>
              </div>
            </div>

            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                DISTRIBUTION SIGNALS
              </p>

              <div className="mb-2 rounded-xl border border-white/[0.06] bg-white/[0.04] p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-foreground">
                    r/SaaS
                  </span>
                  <span className="font-mono text-[10px] text-primary">HOT 🔥</span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  847 comments/hr · 12 high-intent threads
                </p>
              </div>

              <div className="mb-2 rounded-xl border border-white/[0.06] bg-white/[0.04] p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-foreground">
                    Hacker News
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    WARM
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  3 threads matching your niche
                </p>
              </div>

              <div className="mb-2 rounded-xl border border-white/[0.06] bg-white/[0.04] p-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium text-foreground">
                    LinkedIn
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground/60">
                    COLD
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Low activity · skip today
                </p>
              </div>

              <div className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.04] p-3">
                <p className="mb-2 font-mono text-[10px] text-muted-foreground">
                  AEO STATUS
                </p>
                <div className="flex items-center justify-between gap-2 py-1">
                  <span className="text-xs text-foreground">Perplexity</span>
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.08]">
                    <div className="h-full w-[78%] rounded-full bg-primary" />
                  </div>
                  <span className="font-mono text-[10px] text-primary">Indexed</span>
                </div>
                <div className="flex items-center justify-between gap-2 py-1">
                  <span className="text-xs text-foreground">ChatGPT</span>
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.08]">
                    <div className="h-full w-[64%] rounded-full bg-primary" />
                  </div>
                  <span className="font-mono text-[10px] text-primary">Indexed</span>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>

        <p className="mx-auto mt-5 max-w-md text-center text-sm text-muted-foreground">
          This is what opens on your dashboard every morning. Two tasks.
          Pre-written. Ready to deploy.
        </p>
      </div>
    </section>
  );
}
