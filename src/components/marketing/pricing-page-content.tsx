import Link from "next/link";

import {
  PRICING_CLOSING,
  PRICING_FAQ_ITEMS,
  PRICING_FEATURE_ROWS,
  PRICING_PAGE_HEADLINE,
  PRICING_PAGE_SUBLINE,
  PRICING_TIER_GATES,
  PRICING_TIERS,
} from "@/components/marketing/pricing-page-data";

const TABLE_CELL =
  "border-b border-r border-border/60 py-4 px-4 last:border-r-0 align-middle";

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
                tier.featured
                  ? "pricing-card pricing-card-featured relative"
                  : "pricing-card relative"
              }
            >
              {tier.featured ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-primary/50 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">
                  MOST POPULAR
                </span>
              ) : null}
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {tier.headerTag}
              </p>
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
          <div className="pricing-table-scroll overflow-x-auto w-full block border border-border/60">
            <table className="pricing-table w-full border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={TABLE_CELL}>
                    FEATURE
                  </th>
                  <th scope="col" className={TABLE_CELL}>
                    FREE SANDBOX
                  </th>
                  <th scope="col" className={TABLE_CELL}>
                    BOOTSTRAPPER $19
                  </th>
                  <th scope="col" className={`${TABLE_CELL} last:border-r-0`}>
                    FOUNDER $49
                  </th>
                </tr>
              </thead>
              <tbody>
                {PRICING_FEATURE_ROWS.map((row) => (
                  <tr key={row.feature}>
                    <th scope="row" className={TABLE_CELL}>
                      {row.feature}
                    </th>
                    <td className={TABLE_CELL}>{row.free}</td>
                    <td className={TABLE_CELL}>{row.bootstrapper}</td>
                    <td className={`${TABLE_CELL} last:border-r-0`}>
                      {row.founder}
                    </td>
                  </tr>
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
