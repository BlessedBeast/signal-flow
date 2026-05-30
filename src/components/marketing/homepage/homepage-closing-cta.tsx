"use client";

import Link from "next/link";

import FadeUp from "@/components/ui/fade-up";
import { UrlAuditHeroForm } from "@/components/marketing/url-audit-hero-form";

type HomepageClosingCtaProps = {
  hasSession: boolean;
  onAuditUrl: (url: string) => void;
};

export function HomepageClosingCta({
  hasSession,
  onAuditUrl,
}: HomepageClosingCtaProps) {
  return (
    <FadeUp className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8 text-center backdrop-blur-md md:p-12">
      <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Start with your URL. Everything else follows.
      </h2>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {
          "Paste your product URL. We'll run your distribution audit for free — no account required. If the gaps we find don't surprise you, you don't need SignalFlow. If they do, you know where to start."
        }
      </p>
      <div className="mt-8 flex flex-col items-center gap-4">
        {hasSession ? (
          <Link
            href="/stream/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-semibold text-primary-foreground"
          >
            Enter Workspace →
          </Link>
        ) : (
          <>
            <div className="w-full max-w-md">
              <UrlAuditHeroForm onSubmitUrl={onAuditUrl} />
            </div>
            <Link
              href="/signup"
              className="text-sm font-medium text-primary hover:underline"
            >
              Start 7-day Founder trial — $9.90 first month
            </Link>
          </>
        )}
      </div>
    </FadeUp>
  );
}
