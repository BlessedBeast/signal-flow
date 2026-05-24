"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Crosshair,
  Loader2,
  MessageSquare,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

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

type AuthMode = "signin" | "signup";

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
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
          router.replace("/dashboard");
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      toast.error("Enter your email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createBrowserSupabase();

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) throw error;

        toast.success("Signed in successfully");
        router.push("/dashboard");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });

      if (error) throw error;

      if (data.session) {
        toast.success("Account created — welcome to SignalFlow");
        router.push("/onboarding");
      } else {
        toast.success("Account created. Check your email if confirmation is required.");
        router.push("/onboarding");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setPassword("");
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleMode() {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setPassword("");
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2
          className="size-8 animate-spin text-primary"
          aria-label="Checking session"
        />
      </div>
    );
  }

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
            <Button asChild size="sm" variant="outline" className="glass-soft">
              <Link href="/dashboard">Pipeline</Link>
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
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to open your bounty board and run the lead miner."
                : "Sign up to map your Product DNA and start hunting intent signals."}
            </p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@startup.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Authenticating...
                </>
              ) : mode === "signin" ? (
                "Sign in"
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                New here?{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  disabled={isLoading}
                  className={cn(
                    "font-medium text-primary hover:underline",
                    isLoading && "pointer-events-none opacity-60"
                  )}
                >
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  disabled={isLoading}
                  className={cn(
                    "font-medium text-primary hover:underline",
                    isLoading && "pointer-events-none opacity-60"
                  )}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
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
