import {
  Flame,
  Snowflake,
  Sun,
  Terminal,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  getIntentTier,
  parsePlatform,
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

type PlatformBadgeConfig = {
  label: string;
  icon: LucideIcon;
  className: string;
};

const platformConfig: Record<Platform, PlatformBadgeConfig> = {
  reddit: {
    label: "Reddit",
    icon: Flame,
    className:
      "gap-1.5 border-border/60 bg-card/80 font-medium text-foreground",
  },
  x: {
    label: "X",
    icon: Zap,
    className:
      "gap-1.5 border-zinc-500/25 bg-zinc-500/10 font-medium text-zinc-800 dark:text-zinc-200",
  },
  hackernews: {
    label: "Hacker News",
    icon: Terminal,
    className:
      "gap-1.5 border-orange-500/30 bg-orange-500/15 font-medium text-orange-700 dark:text-orange-400",
  },
  indiehackers: {
    label: "Indie Hackers",
    icon: Zap,
    className:
      "gap-1.5 border-indigo-600/30 bg-indigo-950/15 font-medium text-indigo-800 dark:text-indigo-300",
  },
  producthunt: {
    label: "Product Hunt",
    icon: Flame,
    className:
      "gap-1.5 border-rose-500/30 bg-orange-500/15 font-medium text-rose-700 dark:text-orange-400",
  },
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
  platform: rawPlatform,
  className,
}: {
  platform: Platform | string;
  className?: string;
}) {
  const platform = parsePlatform(
    typeof rawPlatform === "string" ? rawPlatform : rawPlatform
  );
  const { label, icon: Icon, className: style } = platformConfig[platform];

  switch (platform) {
    case "hackernews":
      return (
        <Badge variant="outline" className={cn(style, className)}>
          <Terminal className="size-3 shrink-0" aria-hidden />
          Hacker News
        </Badge>
      );
    case "indiehackers":
      return (
        <Badge variant="outline" className={cn(style, className)}>
          <Zap className="size-3 shrink-0" aria-hidden />
          Indie Hackers
        </Badge>
      );
    case "producthunt":
      return (
        <Badge variant="outline" className={cn(style, className)}>
          <Flame className="size-3 shrink-0" aria-hidden />
          Product Hunt
        </Badge>
      );
    case "reddit":
      return (
        <Badge variant="outline" className={cn(style, className)}>
          <span
            className="size-1.5 shrink-0 rounded-full bg-orange-500"
            aria-hidden
          />
          {label}
        </Badge>
      );
    case "x":
    default:
      return (
        <Badge variant="outline" className={cn(style, className)}>
          <Icon className="size-3 shrink-0" aria-hidden />
          {label}
        </Badge>
      );
  }
}
