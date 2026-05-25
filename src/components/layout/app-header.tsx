"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HelpCircle, Zap } from "lucide-react";

import { useIntelligenceBriefing } from "@/components/intelligence-briefing-provider";
import { cn } from "@/lib/utils";

function formatSegmentLabel(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildBreadcrumbTrail(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "Home";
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return "Home";
  }

  return segments.map(formatSegmentLabel).join(" / ");
}

export function AppHeader() {
  const pathname = usePathname();
  const breadcrumb = buildBreadcrumbTrail(pathname);
  const { openBriefing } = useIntelligenceBriefing();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 w-full border-b border-border/60 glass-strong",
        "supports-[backdrop-filter]:bg-background/80"
      )}
    >
      <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight text-foreground transition-opacity hover:opacity-90"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Zap className="size-3.5 text-primary-foreground" aria-hidden />
          </span>
          <span className="hidden font-mono text-xs uppercase tracking-widest sm:inline">
            Velocity
            <span className="text-muted-foreground"> / </span>
            Hub
          </span>
        </Link>

        <div className="min-w-0 flex-1 px-2 sm:px-4">
          <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <span className="text-muted-foreground/70">{pathname}</span>
            <span className="mx-2 text-border">→</span>
            <span className="text-foreground/90">{breadcrumb}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => openBriefing()}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs text-muted-foreground transition-colors",
              "hover:bg-muted/50 hover:text-foreground"
            )}
            aria-label="Open intelligence briefing"
          >
            <HelpCircle className="size-3.5 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Help</span>
          </button>

          <Link
            href="/profile"
            className={cn(
              "flex size-8 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-xs font-medium text-muted-foreground transition-colors",
              "hover:border-primary/30 hover:bg-primary/10 hover:text-foreground"
            )}
            aria-label="Profile and settings"
          >
            SF
          </Link>
        </div>
      </div>
    </header>
  );
}
