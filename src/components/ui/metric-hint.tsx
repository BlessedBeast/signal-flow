"use client";

import { HelpCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type MetricHintProps = {
  label: string;
  definition: string;
  className?: string;
};

export function MetricHint({ label, definition, className }: MetricHintProps) {
  return (
    <span className={cn("group relative inline-flex items-center gap-1", className)}>
      <span>{label}</span>
      <HelpCircle
        className="size-3 shrink-0 text-muted-foreground/70 transition-colors group-hover:text-primary"
        aria-hidden
      />
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-56 rounded-lg border border-border/60 glass-strong p-3 text-left text-xs leading-relaxed text-muted-foreground shadow-lg",
          "group-hover:block group-focus-within:block"
        )}
      >
        {definition}
      </span>
    </span>
  );
}
