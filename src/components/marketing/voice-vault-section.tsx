import "@/styles/homepage-marketing.css";

/**
 * Section 6: The Voice Vault — exact marketing copy.
 * Renders after `.flow-demo` and before the r/SaaS `.output-card` in homepage markup.
 */
type VoiceVaultSectionProps = {
  embedded?: boolean;
};

export function VoiceVaultSection({ embedded = false }: VoiceVaultSectionProps) {
  return (
    <div className="marketing-homepage-root w-full">
      {embedded ? null : <div className="section-spacer" />}

      <div className="section-header">
        <div className="section-label">your foundation</div>
        <h2>
          {"Everything you've built. Everything you've learned."}
          <br />
          Stored once. Used everywhere.
        </h2>
        <p style={{ maxWidth: "700px", lineHeight: 1.6 }}>
          {
            "Most AI tools write for everyone. SignalFlow writes for you. When you sign up, we run you through a 4-question intake based on your chosen framework. We ask about your MRR, your biggest failure, your exact customer, your turning point. That goes into your Vault. Every post, every reply, every comment we generate pulls from that Vault. Your $4,200 MRR. Your 73% churn month. Your first customer who paid without asking for a discount. That's what makes the difference between content that converts and content that gets scrolled past."
          }
        </p>
      </div>

      <div className="output-card" style={{ marginBottom: "1.5rem" }}>
        <div className="output-header">
          <div className="output-platform">
            <span
              className="platform-dot"
              style={{ background: "#4ade80" }}
            />{" "}
            Founder Identity Vault
          </div>
          <span className="output-badge">Permanent Context</span>
        </div>
        <div
          className="output-text"
          style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}
        >
          <div style={{ marginBottom: "12px" }}>
            <strong
              style={{
                fontFamily: "var(--font-sans)",
                color: "var(--color-text-secondary)",
              }}
            >
              Core belief:
            </strong>{" "}
            {"\"Most founders fail at distribution, not product\""}
          </div>
          <div style={{ marginBottom: "12px" }}>
            <strong
              style={{
                fontFamily: "var(--font-sans)",
                color: "var(--color-text-secondary)",
              }}
            >
              Key metric:
            </strong>{" "}
            {'"$4,200 MRR after 8 months"'}
          </div>
          <div style={{ marginBottom: "12px" }}>
            <strong
              style={{
                fontFamily: "var(--font-sans)",
                color: "var(--color-text-secondary)",
              }}
            >
              Failure event:
            </strong>{" "}
            {'"Launched to zero signups twice before finding Reddit"'}
          </div>
          <div style={{ marginBottom: "12px" }}>
            <strong
              style={{
                fontFamily: "var(--font-sans)",
                color: "var(--color-text-secondary)",
              }}
            >
              Customer win:
            </strong>{" "}
            {'"3 paid users from one case study post"'}
          </div>
          <div>
            <strong
              style={{
                fontFamily: "var(--font-sans)",
                color: "var(--color-text-secondary)",
              }}
            >
              Platform voice:
            </strong>{" "}
            Reddit (conversational), LinkedIn (deliberate), X (punchy)
          </div>
        </div>
      </div>

      <p
        style={{
          textAlign: "center",
          fontSize: "14px",
          color: "var(--color-text-secondary)",
          marginBottom: "4rem",
        }}
      >
        Your vault is permanent. Answer once. Sound like yourself forever.
      </p>
    </div>
  );
}
