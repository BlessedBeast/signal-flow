"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UpgradeGateProps = {
  headline?: string;
  body?: string;
  requiredPlanName?: string;
  className?: string;
};

export function UpgradeGate({
  headline = "This module requires an upgraded execution tier.",
  body,
  requiredPlanName,
  className,
}: UpgradeGateProps) {
  const description =
    body ??
    (requiredPlanName
      ? `Upgrade to ${requiredPlanName} to unlock this execution module and remove daily caps on your distribution stack.`
      : "Upgrade your plan on the billing page to unlock premium Velocity and Labs modules.");

  return (
    <div
      className={cn(
        "relative flex min-h-[min(72vh,640px)] flex-col items-center justify-center overflow-hidden rounded-2xl border border-border/50 p-8 sm:p-12",
        "glass-strong",
        className
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-16 size-48 rounded-full bg-violet-500/10 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex max-w-lg flex-col items-center text-center">
        <div className="mb-6 flex size-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 shadow-[0_0_40px_-12px] shadow-primary/40">
          <Lock className="size-7 text-primary" aria-hidden />
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Execution tier locked
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {headline}
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>

        <Button asChild size="lg" className="mt-8 gap-2 shadow-lg">
          <Link href="/profile/billing">
            <Sparkles className="size-4 shrink-0" aria-hidden />
            View plans & upgrade
          </Link>
        </Button>

        <p className="mt-6 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/80">
          Sidebar stays open — explore locked modules anytime
        </p>
      </div>
    </div>
  );
}
