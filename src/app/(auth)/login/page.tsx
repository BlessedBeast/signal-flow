"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
        /* env missing — stay on login */
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
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) throw error;

      toast.success("Signed in successfully");
      router.push("/stream/dashboard");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setPassword("");
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2
          className="size-8 animate-spin text-primary"
          aria-label="Checking session"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground"
      >
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary shadow-sm">
          <Zap size={16} className="text-primary-foreground" aria-hidden />
        </span>
        SignalFlow
      </Link>

      <div className="rounded-2xl glass p-8 max-w-md w-full shadow-2xl">
        <div className="space-y-1">
          <h1 className="font-semibold tracking-tight text-foreground">
            Welcome back
          </h1>
          <p className="text-xs text-muted-foreground">
            Sign in to open your bounty board and run the lead miner.
          </p>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mt-6 space-y-4"
        >
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
              autoComplete="current-password"
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
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          New here?{" "}
          <Link
            href="/signup"
            className={cn(
              "font-medium text-primary hover:underline",
              isLoading && "pointer-events-none opacity-60"
            )}
          >
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
