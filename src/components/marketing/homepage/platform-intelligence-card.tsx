import "@/styles/homepage-marketing.css";

/**
 * Platform Intelligence preview — r/SaaS platform-safe output mock.
 */
export function PlatformIntelligenceCard() {
  return (
    <div className="marketing-homepage-root w-full">
      <div className="section-header">
        <div className="section-label">platform intelligence</div>
        <h2>Native on every channel. Never flagged as spam.</h2>
        <p>
          Subreddit rules, karma thresholds, and tone calibration run before a
          single word is drafted. Here is what a platform-safe r/SaaS reply looks
          like.
        </p>
      </div>

      <div className="output-card">
        <div className="output-header">
          <div className="output-platform">
            <span
              className="platform-dot"
              style={{ background: "#ff4500" }}
            />{" "}
            r/SaaS
          </div>
          <span className="output-badge">Pre-publish passed</span>
        </div>
        <div className="output-text">
          <p className="mb-3 text-sm font-medium text-foreground">
            Thread: &quot;What CRM do solo founders actually use?&quot;
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Mode: HYPE — add value, don&apos;t pitch. Angle: your cold-start story
            from intake vault. Link: HOLD — karma 87/100 threshold. Validator:
            no AI-smell phrases · no dropped links · community-native tone.
          </p>
        </div>
      </div>
    </div>
  );
}
