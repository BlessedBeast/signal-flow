import Link from "next/link";

import {
  HOW_IT_WORKS_CLOSING,
  HOW_IT_WORKS_FAQ,
  HOW_IT_WORKS_HEADER,
  HOW_IT_WORKS_REPLY_BONUS,
  HOW_IT_WORKS_STEPS,
} from "@/components/marketing/how-it-works/how-it-works-page-data";

function StepVisual({
  label,
  items,
}: {
  label: string;
  items: readonly { label: string; value: string }[];
}) {
  return (
    <div className="hiw-step-visual">
      <div className="output-card hiw-visual-card">
        <div className="output-header">
          <span className="hiw-visual-label">{label}</span>
          <span className="output-badge">Live preview</span>
        </div>
        <dl className="hiw-visual-dl">
          {items.map((item) => (
            <div key={item.label} className="hiw-visual-row">
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function HowItWorksPageContent() {
  return (
    <>
      <header className="hiw-page-header">
        <p className="section-label">{HOW_IT_WORKS_HEADER.label}</p>
        <h1>{HOW_IT_WORKS_HEADER.headline}</h1>
        <p className="hiw-page-lead">{HOW_IT_WORKS_HEADER.body}</p>
      </header>

      <ol className="hiw-steps" aria-label="How SignalFlow works">
        {HOW_IT_WORKS_STEPS.map((step, index) => (
          <li
            key={step.id}
            className={
              index % 2 === 1
                ? "hiw-step-panel hiw-step-panel--reverse"
                : "hiw-step-panel"
            }
          >
            <div className="hiw-step-content">
              <span className="hiw-step-num">{step.step}</span>
              <h2 className="hiw-step-title">{step.title}</h2>
              <p className="hiw-step-subtitle">{step.subtitle}</p>
              <p className="hiw-step-body">{step.body}</p>
              <ul className="hiw-step-bullets">
                {step.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </div>
            <StepVisual label={step.visualLabel} items={step.visualItems} />
          </li>
        ))}
      </ol>

      <section className="hiw-bonus-panel" aria-labelledby="hiw-reply-heading">
        <div className="hiw-bonus-header">
          <span className="hiw-step-num">{HOW_IT_WORKS_REPLY_BONUS.step}</span>
          <h2 id="hiw-reply-heading" className="hiw-step-title">
            {HOW_IT_WORKS_REPLY_BONUS.title}
          </h2>
          <p className="hiw-step-subtitle">{HOW_IT_WORKS_REPLY_BONUS.subtitle}</p>
          <p className="hiw-step-body">{HOW_IT_WORKS_REPLY_BONUS.body}</p>
        </div>

        <div className="hiw-reply-modes">
          {HOW_IT_WORKS_REPLY_BONUS.modes.map((mode) => (
            <article key={mode.id} className="hiw-reply-mode-card">
              <h3>{mode.name}</h3>
              <p className="hiw-reply-mode-desc">{mode.description}</p>
              <p className="hiw-reply-mode-directive">{mode.directive}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="hiw-faq-section" aria-labelledby="hiw-faq-heading">
        <h2 id="hiw-faq-heading" className="hiw-faq-title">
          System FAQ
        </h2>
        <div className="hiw-faq-grid">
          {HOW_IT_WORKS_FAQ.map((item) => (
            <div key={item.q} className="hiw-faq-item">
              <p className="hiw-faq-q">{item.q}</p>
              <p className="hiw-faq-a">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="hiw-closing">
        <h2>{HOW_IT_WORKS_CLOSING.headline}</h2>
        <p>{HOW_IT_WORKS_CLOSING.body}</p>
        <div className="hiw-closing-actions">
          <Link href={HOW_IT_WORKS_CLOSING.primaryHref} className="pricing-cta pricing-cta-primary">
            {HOW_IT_WORKS_CLOSING.primaryCta}
          </Link>
          <Link href={HOW_IT_WORKS_CLOSING.secondaryHref} className="pricing-closing-link">
            {HOW_IT_WORKS_CLOSING.secondaryCta} →
          </Link>
        </div>
      </section>
    </>
  );
}
