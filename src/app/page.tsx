"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createBrowserSupabase } from "@/lib/supabase-browser";

const MODULES = [
  {
    tier: "Discovery Stream",
    emoji: "📡",
    title: "Discovery Stream",
    description:
      "Scans 4 platforms for un-archived, high-intent user threads.",
  },
  {
    tier: "Velocity Hub",
    emoji: "⚡",
    title: "Inbound Reply Hub",
    description:
      "Instantly clears X/LinkedIn comments with 1-click casual, human-sounding postures.",
  },
  {
    tier: "Growth Labs",
    emoji: "🧪",
    title: "Growth Labs",
    description:
      "Synthesizes RAG-optimized GEO seeds and drops downloadable single-file side-car magnets for Lovable.dev.",
  },
] as const;

export default function HomePage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function redirectIfAuthenticated() {
      try {
        const supabase = createBrowserSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!cancelled && session) {
          router.replace("/stream/dashboard");
        }
      } catch {
        /* env missing — stay on homepage */
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    }

    void redirectIfAuthenticated();

    return () => {
      cancelled = true;
    };
  }, [router]);

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
      <header className="sticky top-0 z-50 w-full border-b border-border/40 glass-panel">
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
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Log in
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">Sign up</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden px-6 py-20 sm:py-28">
          <div
            className="pointer-events-none absolute inset-0 grid-bg opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
            aria-hidden
          />
          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Manifesto · Vibe-coder distribution stack
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl">
              Ship in peace. We&apos;ll handle the distribution.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              The automated organic velocity engine for solo builders. Monitor
              Reddit, Hacker News, X, and Indie Hackers for high-intent buyers
              in real-time. Bypass AI scanners. Generate GEO seeds. Turn your
              codebase into cash.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/signup">Start building in public</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="glass-soft">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              The old way vs. the builder way
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              You didn&apos;t learn to code so you could become a marketer.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              The nightmare loop is familiar: blast dead cold emails into the
              void, babysit a bloated enterprise CRM you never wanted, or burn
              Sunday afternoons writing corporate threads when you just want to
              ship features. SignalFlow is the anti-CRM — a distribution layer
              that runs while you code, surfaces real buyers already talking,
              and hands you replies that sound human on the first pass.
            </p>
          </div>
        </section>

        <section id="features" className="px-6 pb-24 pt-4">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Three-tier velocity stack
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Everything a solo builder needs to win distribution
              </h2>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {MODULES.map((mod) => (
                <article key={mod.title} className="glass rounded-2xl p-6">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {mod.emoji} {mod.tier}
                  </p>
                  <h3 className="mt-3 font-semibold tracking-tight text-foreground">
                    {mod.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {mod.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 px-6 py-16">
          <div className="glass-strong mx-auto max-w-3xl rounded-2xl p-8 text-center sm:p-10">
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Ready when you are
            </p>
            <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Map your Product DNA. Run the miner. Reply in one click.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Free to start. Built for indie hackers who ship fast and hate
              funnels.
            </p>
            <Button asChild className="mt-6" size="lg">
              <Link href="/signup">Create free account</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
