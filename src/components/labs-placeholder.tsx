import type { LucideIcon } from "lucide-react";

type LabsPlaceholderProps = {
  icon: LucideIcon;
  tier: string;
  title: string;
  description: string;
};

export function LabsPlaceholder({
  icon: Icon,
  tier,
  title,
  description,
}: LabsPlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-zinc-900 bg-zinc-950 px-6 py-5">
        <p className="inline-flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-widest text-zinc-500">
          <Icon className="size-3.5 text-emerald-400" aria-hidden />
          {tier}
        </p>
        <h1 className="mt-2 font-mono text-2xl font-semibold tracking-tight text-zinc-100">
          {title}
        </h1>
        <p className="mt-1 max-w-2xl font-mono text-sm leading-relaxed text-zinc-500">
          {description}
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/20 px-8 py-16 text-center">
        <p className="font-mono text-sm text-zinc-500">
          Module wiring in progress — check back soon.
        </p>
      </div>
    </div>
  );
}
