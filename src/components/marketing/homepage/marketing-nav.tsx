"use client";

import Link from "next/link";
import { Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MarketingNavProps = {
  hasSession: boolean;
  scrolled?: boolean;
};

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
] as const;

export function MarketingNav({ hasSession, scrolled = false }: MarketingNavProps) {
  return (
    <header
      className={cn(
        "glass-strong sticky top-0 z-50 w-full border-b transition-[border-color] duration-300",
        scrolled ? "border-border/60" : "border-transparent"
      )}
    >
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 text-sm font-semibold tracking-tight text-foreground"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Zap size={16} className="text-primary-foreground" aria-hidden />
          </span>
          SignalFlow
        </Link>

        <div className="hidden items-center gap-6 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {hasSession ? (
            <Button asChild size="sm">
              <Link href="/stream/dashboard">Enter Workspace</Link>
            </Button>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
              >
                Sign in
              </Link>
              <Button asChild size="sm">
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
