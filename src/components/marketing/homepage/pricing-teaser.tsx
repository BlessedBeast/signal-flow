import Link from "next/link";

import {
  PRICING_PAGE_HEADLINE,
  PRICING_PAGE_SUBLINE,
  PRICING_TIERS,
} from "@/components/marketing/pricing-tier-data";
import "@/styles/homepage-marketing.css";

export function PricingTeaser() {
  return (
    <div className="marketing-homepage-root w-full">
      <div className="section-header">
        <div className="section-label">pricing</div>
        <h2>{PRICING_PAGE_HEADLINE}</h2>
        <p>{PRICING_PAGE_SUBLINE}</p>
      </div>

      <div className="pricing-grid pricing-grid-teaser">
        {PRICING_TIERS.map((tier) => (
          <article
            key={tier.id}
            className={
              tier.featured
                ? "pricing-card pricing-card-featured"
                : "pricing-card"
            }
          >
            <h3 className="pricing-tier-title">{tier.title}</h3>
            <p className="pricing-price">{tier.price}</p>
            {tier.priceAlt ? (
              <p className="pricing-price-alt">{tier.priceAlt}</p>
            ) : null}
            <p className="pricing-tagline">{tier.tagline}</p>
            <Link
              href={tier.ctaHref}
              className={
                tier.featured
                  ? "pricing-cta pricing-cta-primary"
                  : "pricing-cta"
              }
            >
              {tier.cta}
            </Link>
          </article>
        ))}
      </div>

      <p className="section-subline">
        <Link href="/pricing" className="text-primary hover:underline">
          Compare full plans, feature matrix, and FAQs →
        </Link>
      </p>
    </div>
  );
}
