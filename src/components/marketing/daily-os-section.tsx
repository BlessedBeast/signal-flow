import "@/styles/homepage-marketing.css";

const TASKS = [
  {
    priority: "Priority 1 · REPLY",
    time: "← 15 min",
    context:
      "Platform: Reddit · r/entrepreneur | Thread: 'Struggling to get first 10 customers...' | Mode: HYPE — add value, don't pitch | Angle: Your cold-start story from intake vault | Link: HOLD — karma 87/100 threshold",
  },
  {
    priority: "Priority 2 · CREATE",
    time: "← 45 min",
    context:
      "Framework: Reddit Case Study · Step 2 of 4 | Platform: r/SaaS | Topic: What your 0% trial-to-paid rate taught you | Status: Draft ready to review",
  },
  {
    priority: "Priority 3 · RESEARCH",
    time: "← 20 min",
    context:
      "Platform: LinkedIn | Task: Find 5 posts mentioning 'no-code SaaS failing' | Tag as leads for DM sequence · Step 1",
  },
  {
    priority: "Priority 4 · VAULT",
    time: "← 5 min",
    context:
      "Missing: First customer story detail | Needed for: LinkedIn Waitlist Funnel · Step 3",
  },
  {
    priority: "Priority 5 · PUBLISH",
    time: "← 5 min",
    context:
      "Draft ready: X Thread Teardown · Step 1 | Status: Reviewed · awaiting your post",
  },
] as const;

const STREAK_STATS = [
  { value: "21", label: "Current streak counter (days)" },
  { value: "21", label: "Longest streak" },
  { value: "8", label: "Tasks completed this week" },
  { value: "2", label: "Frameworks in progress" },
] as const;

/**
 * Section 8: The Daily OS (tasks + streak) — exact marketing copy.
 */
type DailyOsSectionProps = {
  embedded?: boolean;
};

export function DailyOsSection({ embedded = false }: DailyOsSectionProps) {
  return (
    <div className="marketing-homepage-root w-full">
      {embedded ? null : <div className="section-spacer" />}

      <div className="section-header">
        <div className="section-label">your daily execution layer</div>
        <h2>One checklist. Every morning. No guessing what to do next.</h2>
        <p>
          {
            "Every day, SignalFlow reads your active frameworks, your recent posts, your live lead stream, and your vault. It generates a prioritized task list — maximum 5 items — with the exact next move for each. Not 'post something on Reddit.' Exactly: 'Reply to this thread in r/SaaS with hype mode. Your conversion story from last week is the right angle. Don't drop the link — your karma in this sub is 87, threshold is 100.' That specific. Every morning."
          }
        </p>
      </div>

      <div className={embedded ? "daily-os-columns !mb-0" : "daily-os-columns"}>
        <div className="daily-os-column">
          <div className="output-card">
            <div className="output-header">
              <span className="daily-os-card-title">
                {"TODAY'S TASKS — May 29"}
              </span>
            </div>
            <div className="output-text">
              <div className="task-list">
                {TASKS.map((task) => (
                  <div key={task.priority} className="task-row">
                    <div className="task-row-head">
                      <span className="task-row-priority">{task.priority}</span>
                      <span className="task-row-time">{task.time}</span>
                    </div>
                    <p className="task-row-context">{task.context}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="daily-os-column">
          <div className="output-card">
            <div className="output-text">
              <p className="streak-subhead">
                Distribution only compounds if you show up.
              </p>
              <p className="streak-body">
                {
                  "SignalFlow tracks your execution streak — consecutive days where you completed at least one task. Miss a day, it resets. It's not a gamification gimmick. It's the only metric that actually correlates with organic distribution working. Most founders who hit 21-day streaks see their first inbound lead within that window."
                }
              </p>
              <div className="streak-stats-grid">
                {STREAK_STATS.map((stat) => (
                  <div key={stat.label} className="streak-stat-cell">
                    <span className="streak-stat-value">{stat.value}</span>
                    <p className="streak-stat-label">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
