"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getIntelligenceBriefing,
  type IntelligenceModuleKey,
} from "@/lib/intelligence-briefing";
import { cn } from "@/lib/utils";

export type IntelligenceBriefingProps = {
  moduleKey: IntelligenceModuleKey;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function IntelligenceBriefing({
  moduleKey,
  open,
  onOpenChange,
}: IntelligenceBriefingProps) {
  const briefing = getIntelligenceBriefing(moduleKey);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex w-full flex-col gap-0 border-border/60 glass-strong p-0 sm:max-w-md"
        )}
      >
        <SheetHeader className="space-y-3 border-b border-border/60 px-6 py-5 text-left">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Intelligence briefing
          </p>
          <SheetTitle className="text-left text-xl tracking-tight">
            {briefing.title}
          </SheetTitle>
          <SheetDescription className="text-left text-xs">
            {briefing.subtitle}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Three things to know before you operate this module:
          </p>
          <ol className="space-y-4">
            {briefing.bullets.map((bullet, index) => (
              <li
                key={bullet}
                className="flex gap-3 rounded-xl border border-border/50 bg-muted/25 px-4 py-3"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span className="text-sm leading-relaxed text-foreground">
                  {bullet}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </SheetContent>
    </Sheet>
  );
}
