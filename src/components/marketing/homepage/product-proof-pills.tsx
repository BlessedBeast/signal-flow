"use client";

import FadeUp from "@/components/ui/fade-up";

const PLATFORMS = [
  "Reddit",
  "X",
  "LinkedIn",
  "Hacker News",
  "Indie Hackers",
] as const;

export function ProductProofPills() {
  return (
    <FadeUp className="text-center">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        founders already distributing
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {PLATFORMS.map((platform) => (
          <span
            key={platform}
            className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 font-mono text-[11px] text-foreground"
          >
            {platform}
          </span>
        ))}
      </div>
      <p className="mx-auto mt-4 max-w-lg text-sm text-muted-foreground">
        One vault. Six playbooks. Platform-safe output on every channel you care
        about.
      </p>
    </FadeUp>
  );
}
