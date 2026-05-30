import "@/styles/homepage-marketing.css";

const PLAYBOOKS = [
  {
    title: "Reddit Case Study",
    platform: "Reddit",
    sequence: "4 steps",
    description:
      "Turn your real metrics into a story that builds authority and quietly introduces your product in the last paragraph.",
    useCase: "Best for: Founders with early traction (any MRR > $0)",
  },
  {
    title: "LinkedIn Waitlist Funnel",
    platform: "LinkedIn",
    sequence: "5 steps",
    description:
      "Build anticipation, collect warm leads, and convert followers into trial users without a single ad.",
    useCase: "Best for: Founders launching a new feature or product",
  },
  {
    title: "X (Twitter) Thread Teardown",
    platform: "X",
    sequence: "3 steps",
    description:
      "Break down a lesson from building your product into a high-share thread that positions you as the authority.",
    useCase: "Best for: Founders with a strong opinion about their market",
  },
  {
    title: "Hacker News Launch",
    platform: "Hacker HN",
    sequence: "2 steps",
    description:
      "Write a 'Show HN' or 'Ask HN' post that doesn't get buried — using your real origin story as the hook.",
    useCase: "Best for: Technical founders with a strong product story",
  },
  {
    title: "Founder Story Arc",
    platform: "LinkedIn / Reddit",
    sequence: "6 steps",
    description:
      "A long-game narrative sequence — failure, pivot, lesson, traction, insight, call to action. Runs over 2 weeks.",
    useCase: "Best for: Founders building a long-term personal brand",
  },
  {
    title: "Cold DM Sequence",
    platform: "LinkedIn / X",
    sequence: "4 steps",
    description:
      "Find the exact person who needs your product and reach out with context, not a pitch.",
    useCase: "Best for: Founders in a niche B2B market",
  },
] as const;

/**
 * Section 7: Frameworks & Playbooks — exact marketing copy.
 */
type FrameworksPlaybooksSectionProps = {
  embedded?: boolean;
};

export function FrameworksPlaybooksSection({
  embedded = false,
}: FrameworksPlaybooksSectionProps) {
  return (
    <div className="marketing-homepage-root w-full">
      {embedded ? null : <div className="section-spacer" />}

      <div className="section-header">
        <div className="section-label">the playbook engine</div>
        <h2>Pick your framework. We run the sequence.</h2>
        <p>
          {
            "Distribution isn't random. It's a sequence. Each framework is a proven multi-step playbook — not just one post, but a series of moves designed to build authority, find buyers, and close without pitching. You pick the framework. We know which step you're on, what you published last, and what comes next. No repeating yourself. No losing the thread."
          }
        </p>
      </div>

      <div className="playbooks-grid">
        {PLAYBOOKS.map((playbook) => (
          <article key={playbook.title} className="compare-card">
            <h3 className="compare-card-title">{playbook.title}</h3>
            <div className="compare-card-meta">
              <span className="compare-card-platform">{playbook.platform}</span>
              <span className="compare-card-sequence">{playbook.sequence}</span>
            </div>
            <p className="compare-card-description">{playbook.description}</p>
            <p className="compare-card-usecase">{playbook.useCase}</p>
          </article>
        ))}
      </div>

      <p className={embedded ? "section-subline !mb-0" : "section-subline"}>
        Every framework knows where you left off. Every step builds on the last
        one. No AI amnesia.
      </p>
    </div>
  );
}
