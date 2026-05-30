import { PricingPageContent } from "@/components/marketing/pricing-page-content";

import "@/styles/homepage-marketing.css";

/** @deprecated Use PricingPageContent on /pricing instead. */
export function PricingSection() {
  return (
    <div className="marketing-homepage-root marketing-pricing-page w-full">
      <PricingPageContent />
    </div>
  );
}
