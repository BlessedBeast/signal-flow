import Link from "next/link";
import { Fragment } from "react";

import {
  PRICING_CLOSING,
  PRICING_FAQ_ITEMS,
  PRICING_FEATURE_ROWS,
  PRICING_PAGE_HEADLINE,
  PRICING_PAGE_SUBLINE,
  PRICING_TABLE_GATE,
  PRICING_TIER_GATES,
  PRICING_TIERS,
} from "@/components/marketing/pricing-page-data";

export function PricingPageContent() {
  return (
    <>
      <header className="pricing-header">
        <h1>{PRICING_PAGE_HEADLINE}</h1>
        <p className="pricing-subline">{PRICING_PAGE_SUBLINE}</p>
      </header>

      <div className="pricing-grid pricing-page-tiers">
        {PRICING_TIERS.map((tier) => (
          <div key={tier.id} className="pricing-column">
            <article
              className={
                tier.featured ? "pricing-card pricing-card-featured" : "pricing-card"
              }
            >
              <h2 className="pricing-tier-title">{tier.title}</h2>
              <p className="pricing-price">{tier.price}</p>
              {tier.priceAlt ? (
                <p className="pricing-price-alt">{tier.priceAlt}</p>
              ) : null}
              <p className="pricing-tagline">{tier.tagline}</p>
              <ul className="pricing-features">
                {tier.features.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link
                href={tier.ctaHref}
                className={
                  tier.featured ? "pricing-cta pricing-cta-primary" : "pricing-cta"
                }
              >
                {tier.cta}
              </Link>
            </article>
            {PRICING_TIER_GATES[tier.id] ? (
              <p className="pricing-gate">{PRICING_TIER_GATES[tier.id]}</p>
            ) : null}
          </div>
        ))}
      </div>

      <section className="pricing-compare-section">
        <div className="pricing-table-wrap">
          <div className="pricing-table-scroll overflow-x-auto w-full block">
            <table className="pricing-table">
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  <th scope="col">Bootstrapper $19</th>
                  <th scope="col">Founder $79</th>
                  <th scope="col">Agency $249</th>
                </tr>
              </thead>
              <tbody>
                {PRICING_FEATURE_ROWS.map((row) => (
                  <Fragment key={row.feature}>
                    <tr>
                      <th scope="row">{row.feature}</th>
                      <td>{row.bootstrapper}</td>
                      <td>{row.founder}</td>
                      <td>{row.agency}</td>
                    </tr>
                    {"gateAfter" in row && row.gateAfter ? (
                      <tr className="pricing-table-gate-row">
                        <td colSpan={4}>{PRICING_TABLE_GATE}</td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="pricing-faq-section">
        <div className="pricing-faq">
          {PRICING_FAQ_ITEMS.map((item) => (
            <div key={item.q} className="pricing-faq-item">
              <p className="pricing-faq-q">{item.q}</p>
              <p className="pricing-faq-a">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pricing-closing">
        <h2>{PRICING_CLOSING.headline}</h2>
        <p>{PRICING_CLOSING.body}</p>
        <div className="pricing-closing-actions">
          <Link href={PRICING_CLOSING.primaryHref} className="pricing-cta pricing-cta-primary">
            {PRICING_CLOSING.primaryCta}
          </Link>
          <Link href={PRICING_CLOSING.secondaryHref} className="pricing-closing-link">
            {PRICING_CLOSING.secondaryCta}
          </Link>
        </div>
      </section>
    </>
  );
}
