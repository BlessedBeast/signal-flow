"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSignupTierPreference } from "@/lib/micro-audit/storage";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

export default function SignupPage() {
  const router = useRouter();
  const [fromMicroAudit, setFromMicroAudit] = useState(false);
  const [isHobbyistSignup, setIsHobbyistSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromAudit = params.get("from") === "micro-audit";
    const hobbyist = params.get("tier") === "hobbyist";
    setFromMicroAudit(fromAudit);
    setIsHobbyistSignup(hobbyist);
    if (hobbyist) {
      saveSignupTierPreference("hobbyist");
    }
  }, []);

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
        /* env missing — stay on signup */
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
    if (!trimmedEmail || !password || !confirmPassword) {
      toast.error("Complete all fields to create your account.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });

      if (error) throw error;

      toast.success("Account created! Check your email to verify.");
      router.push("/onboarding");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      setPassword("");
      setConfirmPassword("");
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
            {isHobbyistSignup
              ? "Setting up your permanent Free Hobbyist account"
              : "Create your account"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isHobbyistSignup
              ? "No credit card required. Your micro-audit DNA is saved — one high-intent lead per day to start."
              : fromMicroAudit
                ? "Your micro-audit is saved — finish signup to unlock your Live Distribution Cockpit."
                : "Sign up to map your Product DNA and start hunting intent signals."}
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className={cn(
              "font-medium text-primary hover:underline",
              isLoading && "pointer-events-none opacity-60"
            )}
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
