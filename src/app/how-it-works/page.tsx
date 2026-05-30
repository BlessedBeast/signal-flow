import type { Metadata } from "next";

import { HowItWorksPageContent } from "@/components/marketing/how-it-works/how-it-works-page-content";
import { MarketingNav } from "@/components/marketing/homepage/marketing-nav";

import "@/styles/homepage-marketing.css";

export const metadata: Metadata = {
  title: "How it works · SignalFlow",
  description:
    "URL audit, Voice Vault, framework sequences, lead intent scoring, platform intelligence, and the PLUG / HYPE / DEFLECT reply system.",
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav hasSession={false} />

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <main className="marketing-homepage-root marketing-how-it-works w-full py-10 md:py-16">
          <HowItWorksPageContent />
        </main>
      </div>
    </div>
  );
}
