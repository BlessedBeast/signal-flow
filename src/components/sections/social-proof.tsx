"use client";

import Link from "next/link";

import FadeUp from "@/components/ui/fade-up";

const GLASS =
  "rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-md";

export function SocialProof() {
  return (
    <section className="w-full py-10">
      <div className="mx-auto max-w-4xl px-6">
        <FadeUp
          className={`grid grid-cols-1 items-center gap-6 p-7 md:grid-cols-3 ${GLASS}`}
        >
          <div className="md:col-span-2">
            <p
              className="mb-2 text-3xl font-extrabold leading-none text-muted-foreground"
              aria-hidden
            >
              &ldquo;
            </p>
            <blockquote className="text-base font-medium leading-relaxed text-foreground">
              I used to spend 2 hours a day hunting Reddit threads. Now I open
              SignalFlow, copy the reply, and close the tab. That&apos;s it.
            </blockquote>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex size-7 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.1] font-mono text-[11px] font-bold text-foreground">
                AK
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Arjun K.</p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  Indie Hacker · 3 weeks in beta
                </p>
              </div>
            </div>
          </div>

          <div className="text-center md:text-center">
            <p className="text-4xl font-extrabold tracking-tight text-primary">
              47
            </p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Founders in early access
            </p>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Beta · seats limited
            </p>
            <Link
              href="/signup"
              className="mt-4 inline-block rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 font-mono text-[10px] text-primary transition-opacity hover:opacity-90"
            >
              Join the waitlist →
            </Link>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
