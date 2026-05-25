import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  /** Optional secondary copy (e.g. background cron status). */
  footnote?: string;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon: Icon,
  footnote,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass-strong flex min-h-[240px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-muted/20 px-8 py-14 text-center",
        className
      )}
    >
      <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border border-dashed border-border/40 bg-muted/15 px-6 py-8">
        {Icon ? (
          <Icon
            className="size-10 shrink-0 text-muted-foreground/60"
            aria-hidden
          />
        ) : null}
        <p className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
        {footnote ? (
          <p className="border-t border-border/50 pt-4 font-mono text-[10px] uppercase leading-relaxed tracking-wider text-muted-foreground/90">
            {footnote}
          </p>
        ) : null}
      </div>
    </div>
  );
}
