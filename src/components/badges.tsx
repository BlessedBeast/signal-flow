import { Flame, Snowflake, Sun } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  getIntentTier,
  type IntentTier,
  type LeadStatus,
  type Platform,
} from "@/lib/signalflow-types";
import { cn } from "@/lib/utils";

const intentStyles: Record<
  IntentTier,
  { icon: typeof Flame; className: string }
> = {
  HOT: {
    icon: Flame,
    className: "border-rose-500/25 bg-rose-500/10 text-rose-600",
  },
  WARM: {
    icon: Sun,
    className: "border-amber-500/25 bg-amber-500/10 text-amber-700",
  },
  COLD: {
    icon: Snowflake,
    className: "border-border bg-muted/80 text-muted-foreground",
  },
};

const statusStyles: Record<LeadStatus, string> = {
  new: "border-blue-500/25 bg-blue-500/10 text-blue-700",
  drafted: "border-violet-500/25 bg-violet-500/10 text-violet-700",
  replied: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700",
  archived: "border-border bg-muted/80 text-muted-foreground",
};

const statusLabels: Record<LeadStatus, string> = {
  new: "New",
  drafted: "Drafted",
  replied: "Replied",
  archived: "Archived",
};

const platformConfig: Record<
  Platform,
  { label: string; dotClassName: string }
> = {
  reddit: { label: "Reddit", dotClassName: "bg-orange-500" },
  x: { label: "X", dotClassName: "bg-zinc-100" },
  hackernews: { label: "Hacker News", dotClassName: "bg-orange-600" },
};

export function IntentBadge({
  tier,
  score,
  className,
}: {
  tier?: IntentTier;
  score?: number;
  className?: string;
}) {
  const resolved = tier ?? getIntentTier(score ?? 0);
  const { icon: Icon, className: style } = intentStyles[resolved];

  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium", style, className)}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      {resolved}
    </Badge>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: LeadStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium capitalize", statusStyles[status], className)}
    >
      {statusLabels[status]}
    </Badge>
  );
}

export function PlatformBadge({
  platform,
  className,
}: {
  platform: Platform;
  className?: string;
}) {
  const { label, dotClassName } = platformConfig[platform];

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 border-border/60 bg-card/80 font-medium text-foreground",
        className
      )}
    >
      <span
        className={cn("size-1.5 shrink-0 rounded-full", dotClassName)}
        aria-hidden
      />
      {label}
    </Badge>
  );
}
