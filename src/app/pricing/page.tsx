import type { Metadata } from "next";

import { MarketingNav } from "@/components/marketing/homepage/marketing-nav";
import { PricingPageContent } from "@/components/marketing/pricing-page-content";

import "@/styles/homepage-marketing.css";

export const metadata: Metadata = {
  title: "Pricing · SignalFlow",
  description:
    "One price. One system. Bootstrapper, Founder, and Agency plans for indie distribution.",
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav hasSession={false} />

      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <main className="marketing-homepage-root marketing-pricing-page w-full py-10 md:py-16">
          <PricingPageContent />
        </main>
      </div>
    </div>
  );
}
