import "@/styles/homepage-marketing.css";

const EVERY_OTHER_TOOL_ITEMS = [
  "✗ Generic voice trained on millions of posts",
  "✗ No memory of your failures, metrics, or story",
  "✗ No sequence memory — amnesia after every single post",
  "✗ No unified task system — you have to figure out what to do next",
  "✗ No streak tracking — treats distribution as an occasional scramble",
  "✗ Gets posts flagged for AI smell and drops links that get you banned",
] as const;

const SIGNALFLOW_ITEMS = [
  "✓ Voice built from your actual MRR, wins, and scars",
  "✓ Every single post dynamically references your real story",
  "✓ Framework Sequence memory — knows exactly which step you are on",
  "✓ The Daily OS checklist tells you the exact next strategic move",
  "✓ Execution streak engine tracks the only metric that compounds",
  "✓ Platform intelligence enforces community-specific rules before writing",
] as const;

type ComparisonSectionProps = {
  embedded?: boolean;
};

export function ComparisonSection({ embedded = false }: ComparisonSectionProps) {
  return (
    <div className="marketing-homepage-root w-full">
      {embedded ? null : <div className="section-spacer" />}

      <div className={embedded ? "two-col !mb-0" : "two-col"}>
        <div className="compare-card bad">
          <h3 className="compare-title bad">Every other tool</h3>
          <ul className="compare-list">
            {EVERY_OTHER_TOOL_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="compare-card good">
          <h3 className="compare-title good">SignalFlow</h3>
          <ul className="compare-list">
            {SIGNALFLOW_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
