import fs from "fs";
import path from "path";

const root = path.resolve(".");

function write(rel, content) {
  const filePath = path.join(root, rel);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
  console.log("wrote", rel);
}

write(
  "src/app/page.tsx",
  `import Link from "next/link";
import {
  Crosshair,
  MessageSquare,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FEATURES = [
  {
    icon: Target,
    title: "Intent scoring",
    description:
      "Rank every thread by buying signal so you reply to HOT leads first.",
  },
  {
    icon: Crosshair,
    title: "Multi-platform mining",
    description:
      "Monitor Reddit, X, and Hacker News with Serper-powered discovery dorks.",
  },
  {
    icon: MessageSquare,
    title: "Context-aware drafts",
    description:
      "Generate human, founder-voice replies grounded in your Product DNA.",
  },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-0 bg-transparent">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-foreground"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary shadow-sm">
              <Zap size={16} className="text-primary-foreground" aria-hidden />
            </span>
            SignalFlow
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="/onboarding"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Product DNA
            </Link>
            <Button asChild size="sm">
              <Link href="/onboarding">Get Started</Link>
            </Button>
          </div>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <div className="relative min-h-[320px]">
          <div
            className="pointer-events-none absolute inset-0 rounded-3xl grid-bg opacity-30"
            aria-hidden
          />
          <div className="relative z-10 space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full glass-soft px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" aria-hidden />
              Lead-gen intelligence for indie SaaS
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Find buyers already talking about your category.
            </h1>
            <p className="max-w-lg text-lg text-muted-foreground leading-relaxed">
              SignalFlow surfaces high-intent conversations, scores them HOT to
              COLD, and drafts replies that sound like a helpful founder—not a
              sales bot.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/onboarding">Start free scan</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="glass-soft">
                <Link href="/dashboard">View pipeline</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-6 shadow-lg sm:p-8">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in to open your bounty board, or create an account to run your
              first Product DNA scan.
            </p>
          </div>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@startup.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>
            <Button asChild className="w-full">
              <Link href="/dashboard">Sign in</Link>
            </Button>
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link
              href="/onboarding"
              className="font-medium text-primary hover:underline"
            >
              Create account
            </Link>
          </p>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="glass-soft px-2 text-muted-foreground">or</span>
            </div>
          </div>
          <Button asChild variant="outline" className="w-full glass-soft">
            <Link href="/onboarding">Continue with Google</Link>
          </Button>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Everything you need to win the thread
          </h2>
          <p className="mt-2 text-muted-foreground">
            A single pipeline from discovery to drafted reply.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <article key={title} className="glass rounded-2xl p-6">
              <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="size-5 text-primary" aria-hidden />
              </div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
`
);

write(
  "src/app/api/onboard/analyze/route.ts",
  `import { NextResponse } from "next/server";

import { initialDNA, type ProductDNA } from "@/lib/signalflow-types";

export const dynamic = "force-dynamic";

function hostnameFromUrl(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : \`https://\${url}\`).hostname;
  } catch {
    return "your-product.com";
  }
}

/** Stub analyze — returns Product DNA shaped for the verify step. */
export async function POST(request: Request) {
  let body: { url?: string };
  try {
    body = (await request.json()) as { url?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = body.url?.trim();
  if (!raw) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  const normalized = raw.startsWith("http") ? raw : \`https://\${raw}\`;
  const host = hostnameFromUrl(normalized);

  const dna: ProductDNA = {
    ...initialDNA,
    url: normalized,
    productName: host.replace(/^www\\./, "").split(".")[0] ?? "Your Product",
    oneLiner:
      "AI-inferred positioning from your site — refine before saving to the vault.",
    audience: "B2B SaaS teams evaluating tools in your category",
    painPoints: [
      "Fragmented community signals across platforms",
      "Slow manual monitoring of competitor threads",
      "Generic outreach that ignores thread context",
    ],
    competitors: ["Linear", "Notion", "Attio"],
    keywords: ["alternative", "recommend", "looking for", "best tool"],
  };

  return NextResponse.json({ ok: true, dna });
}
`
);

write(
  "src/app/onboarding/page.tsx",
  `"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Globe,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  initialDNA,
  type Platform,
  type ProductDNA,
} from "@/lib/signalflow-types";
import { useSignalFlow } from "@/lib/signalflow-store";
import { cn } from "@/lib/utils";

type Phase = "input" | "processing" | "verify";

type StepState = "pending" | "running" | "done";

const PROCESSING_STEPS = [
  { id: "fetch", label: "Reading site with Jina AI", duration: 2500 },
  { id: "extract", label: "Extracting Product DNA", duration: 2000 },
  { id: "audience", label: "Profiling Ideal Customer (ICP)", duration: 1800 },
  { id: "queries", label: "Compiling Platform Search Dorks", duration: 2200 },
  { id: "vault", label: "Saving to Signal Vault", duration: 1000 },
] as const;

const PLATFORM_LABELS: Record<Platform, string> = {
  reddit: "Reddit",
  x: "X",
  hackernews: "Hacker News",
};

export default function OnboardingPage() {
  const router = useRouter();
  const { setDna } = useSignalFlow();
  const [phase, setPhase] = useState<Phase>("input");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDNA>(initialDNA);
  const [stepStates, setStepStates] = useState<StepState[]>(
    PROCESSING_STEPS.map(() => "pending")
  );
  const [progress, setProgress] = useState(0);
  const [platformInput, setPlatformInput] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [editingQueryIndex, setEditingQueryIndex] = useState<number | null>(null);
  const [queryEditValue, setQueryEditValue] = useState("");
  const runIdRef = useRef(0);

  const runProcessing = useCallback(async (targetUrl: string) => {
    const runId = ++runIdRef.current;
    setPhase("processing");
    setStepStates(PROCESSING_STEPS.map(() => "pending"));
    setProgress(0);
    setError(null);

    let dnaResult: ProductDNA = initialDNA;

    for (let i = 0; i < PROCESSING_STEPS.length; i++) {
      if (runIdRef.current !== runId) return;

      setStepStates((prev) =>
        prev.map((s, idx) =>
          idx === i ? "running" : idx < i ? "done" : s
        )
      );
      setProgress(Math.round(((i + 0.35) / PROCESSING_STEPS.length) * 100));

      if (PROCESSING_STEPS[i].id === "fetch") {
        try {
          const res = await fetch("/api/onboard/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: targetUrl }),
          });
          const json = (await res.json()) as {
            ok?: boolean;
            dna?: ProductDNA;
            error?: string;
          };
          if (json.dna) dnaResult = json.dna;
          else if (!res.ok) throw new Error(json.error ?? "Analysis failed");
        } catch {
          dnaResult = { ...initialDNA, url: targetUrl };
        }
      }

      await new Promise((r) =>
        setTimeout(r, PROCESSING_STEPS[i].duration)
      );

      if (runIdRef.current !== runId) return;

      setStepStates((prev) =>
        prev.map((s, idx) => (idx === i ? "done" : idx < i ? "done" : s))
      );
      setProgress(Math.round(((i + 1) / PROCESSING_STEPS.length) * 100));
    }

    if (runIdRef.current !== runId) return;
    setDraft(dnaResult);
    setPhase("verify");
  }, []);

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
    };
  }, []);

  function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Enter your product URL to continue.");
      return;
    }
    void runProcessing(trimmed.startsWith("http") ? trimmed : \`https://\${trimmed}\`);
  }

  function togglePlatform(platform: Platform) {
    setDraft((prev) => {
      const has = prev.targetPlatforms.includes(platform);
      return {
        ...prev,
        targetPlatforms: has
          ? prev.targetPlatforms.filter((p) => p !== platform)
          : [...prev.targetPlatforms, platform],
      };
    });
  }

  function addPlatformChip() {
    const value = platformInput.trim().toLowerCase();
    if (!value) return;
    const map: Record<string, Platform> = {
      reddit: "reddit",
      x: "x",
      twitter: "x",
      hackernews: "hackernews",
      hn: "hackernews",
    };
    const platform = map[value];
    if (platform && !draft.targetPlatforms.includes(platform)) {
      setDraft((prev) => ({
        ...prev,
        targetPlatforms: [...prev.targetPlatforms, platform],
      }));
    }
    setPlatformInput("");
  }

  function addQueryChip() {
    const value = queryInput.trim();
    if (!value) return;
    setDraft((prev) => ({
      ...prev,
      activeSerperQueries: [...prev.activeSerperQueries, value],
    }));
    setQueryInput("");
  }

  function saveToVault() {
    setDna(draft);
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen">
      <header className="border-0 bg-transparent">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <Zap size={16} className="text-primary-foreground" aria-hidden />
            </span>
            SignalFlow
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Skip to pipeline
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-4">
        {phase === "input" && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Map your Product DNA
              </h1>
              <p className="text-muted-foreground">
                Paste your site URL — we will debrief positioning, ICP, and
                search operators.
              </p>
            </div>

            <form onSubmit={handleAnalyze} className="glass rounded-2xl p-6 sm:p-8">
              <Label htmlFor="product-url" className="text-xs uppercase tracking-widest text-muted-foreground">
                Product URL
              </Label>
              <div className="mt-3 flex gap-3">
                <div className="glass-soft flex size-11 shrink-0 items-center justify-center rounded-xl">
                  <Globe className="size-5 text-primary" aria-hidden />
                </div>
                <Input
                  id="product-url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourstartup.com"
                  className="h-11 flex-1 glass-soft border-0"
                  disabled={phase !== "input"}
                />
              </div>
              {error && (
                <p className="mt-3 text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="mt-6 w-full" size="lg">
                <Sparkles className="size-4" aria-hidden />
                Analyze site
              </Button>
            </form>
          </div>
        )}

        {phase === "processing" && (
          <div className="glass rounded-2xl p-6 sm:p-8 space-y-8">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Building your signal profile
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sequential AI debrief in progress…
              </p>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                style={{ width: \`\${progress}%\` }}
              />
            </div>

            <ul className="space-y-3">
              {PROCESSING_STEPS.map((step, index) => {
                const state = stepStates[index];
                return (
                  <li
                    key={step.id}
                    className={cn(
                      "glass-soft flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors",
                      state === "running" && "ring-1 ring-primary/30",
                      state === "done" && "opacity-90"
                    )}
                  >
                    {state === "done" ? (
                      <CheckCircle2
                        className="size-4 shrink-0 text-primary animate-in fade-in zoom-in-50 duration-300"
                        aria-hidden
                      />
                    ) : state === "running" ? (
                      <Loader2
                        className="size-4 shrink-0 animate-spin text-primary"
                        aria-hidden
                      />
                    ) : (
                      <span
                        className="size-4 shrink-0 rounded-full border border-border"
                        aria-hidden
                      />
                    )}
                    <span
                      className={cn(
                        state === "pending"
                          ? "text-muted-foreground"
                          : "text-foreground font-medium"
                      )}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {phase === "verify" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">
                Verify Product DNA
              </h2>
              <p className="text-sm text-muted-foreground">
                Tune identity metadata and operators before saving to your vault.
              </p>
            </div>

            <section className="glass rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Identity
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="productName">Product name</Label>
                  <Input
                    id="productName"
                    value={draft.productName}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, productName: e.target.value }))
                    }
                    className="glass-soft"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="dna-url">Website URL</Label>
                  <Input
                    id="dna-url"
                    value={draft.url}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, url: e.target.value }))
                    }
                    className="glass-soft"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="oneLiner">One-liner</Label>
                  <Textarea
                    id="oneLiner"
                    value={draft.oneLiner}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, oneLiner: e.target.value }))
                    }
                    className="min-h-[72px] glass-soft resize-none"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="audience">Audience</Label>
                  <Textarea
                    id="audience"
                    value={draft.audience}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, audience: e.target.value }))
                    }
                    className="min-h-[60px] glass-soft resize-none"
                  />
                </div>
              </div>
            </section>

            <section className="glass rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Target platforms
              </h3>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PLATFORM_LABELS) as Platform[]).map((platform) => {
                  const active = draft.targetPlatforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => togglePlatform(platform)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "glass-soft text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {PLATFORM_LABELS[platform]}
                      {active && <X className="size-3" aria-hidden />}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={platformInput}
                  onChange={(e) => setPlatformInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPlatformChip())}
                  placeholder="Add platform (reddit, x, hn)"
                  className="glass-soft h-9"
                />
                <Button type="button" variant="outline" size="sm" className="glass-soft shrink-0" onClick={addPlatformChip}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </section>

            <section className="glass rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Serper query operators
              </h3>
              <ul className="space-y-2">
                {draft.activeSerperQueries.map((query, index) => (
                  <li
                    key={\`\${index}-\${query.slice(0, 12)}\`}
                    className="glass-soft group flex items-start gap-2 rounded-xl px-3 py-2.5"
                  >
                    {editingQueryIndex === index ? (
                      <Input
                        value={queryEditValue}
                        onChange={(e) => setQueryEditValue(e.target.value)}
                        className="h-8 flex-1 font-mono text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setDraft((p) => ({
                              ...p,
                              activeSerperQueries: p.activeSerperQueries.map((q, i) =>
                                i === index ? queryEditValue : q
                              ),
                            }));
                            setEditingQueryIndex(null);
                          }
                        }}
                      />
                    ) : (
                      <code className="flex-1 font-mono text-xs text-foreground leading-relaxed">
                        {query}
                      </code>
                    )}
                    <div className="flex shrink-0 gap-1 opacity-70 group-hover:opacity-100">
                      <button
                        type="button"
                        className="rounded-md p-1 hover:bg-accent"
                        onClick={() => {
                          setEditingQueryIndex(index);
                          setQueryEditValue(query);
                        }}
                        aria-label="Edit query"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1 hover:bg-accent"
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            activeSerperQueries: p.activeSerperQueries.filter(
                              (_, i) => i !== index
                            ),
                          }))
                        }
                        aria-label="Remove query"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Input
                  value={queryInput}
                  onChange={(e) => setQueryInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addQueryChip())}
                  placeholder='site:reddit.com "looking for"'
                  className="glass-soft h-9 font-mono text-xs"
                />
                <Button type="button" variant="outline" size="sm" className="glass-soft shrink-0" onClick={addQueryChip}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="glass-soft flex-1"
                onClick={() => setPhase("input")}
              >
                Back
              </Button>
              <Button type="button" className="flex-1" onClick={saveToVault}>
                Save to vault & open pipeline
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
`
);

write(
  "src/app/layout.tsx",
  `import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SignalFlowProvider } from "@/lib/signalflow-store";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SignalFlow",
  description: "Signal intelligence for growth teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body
        className={\`\${geistSans.variable} \${geistMono.variable} min-h-screen bg-background font-sans text-foreground antialiased\`}
      >
        <SignalFlowProvider>{children}</SignalFlowProvider>
      </body>
    </html>
  );
}
`
);

console.log("done");
