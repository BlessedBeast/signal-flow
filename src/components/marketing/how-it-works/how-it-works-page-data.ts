export const HOW_IT_WORKS_HEADER = {
  label: "the full picture",
  headline: "Not a content tool. A distribution system.",
  body: "Every other tool gives you a blank page and calls it AI. SignalFlow gives you a system: a voice, a sequence, an audience, and the exact words to say when you find them. Here's exactly how it works.",
} as const;

export type HowItWorksStep = {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  body: string;
  bullets: readonly string[];
  visualLabel: string;
  visualItems: readonly { label: string; value: string }[];
};

export const HOW_IT_WORKS_STEPS: readonly HowItWorksStep[] = [
  {
    id: "url-scan",
    step: "01",
    title: "URL SCAN → STRATEGY",
    subtitle: "Hormozi Value Equation + StoryBrand audits",
    body: "Paste your product URL. SignalFlow scrapes your public positioning and runs two parallel strategy lenses before you create an account. You see where your offer is vague, where trust is missing, and which distribution gaps are costing you leads.",
    bullets: [
      "Value Equation audit: dream outcome, perceived likelihood, time delay, and effort & sacrifice — scored against your live copy.",
      "StoryBrand audit: character, problem, guide, plan, call to action, success, and failure stakes — mapped to your homepage narrative.",
      "Outputs a strategy briefing: ICP friction, competitor angles, and recommended first channel — not a generic SWOT deck.",
    ],
    visualLabel: "Audit output",
    visualItems: [
      { label: "Dream outcome clarity", value: "62% — headline buries the payoff" },
      { label: "Perceived likelihood", value: "Low — no proof stack above fold" },
      { label: "StoryBrand guide role", value: "Missing — page reads like a feature list" },
      { label: "Recommended first move", value: "Reddit case study · 4-step sequence" },
    ],
  },
  {
    id: "intake-vault",
    step: "02",
    title: "INTAKE → THE VAULT",
    subtitle: "Permanent founder identity profile storage",
    body: "After you pick your first playbook, a dynamic intake asks questions generated from your URL audit — not a generic form. Answers compile into your Vault: a permanent identity layer every engine reads.",
    bullets: [
      "Stores core belief, key metrics, failure events, customer quotes, and tone constraints as structured persona_context.",
      "Locks product DNA (audience, pain points, Serper hunt queries, competitors) for lead matching and reply generation.",
      "Never re-asks what you already told us — the Vault persists across frameworks, replies, and Daily OS tasks.",
    ],
    visualLabel: "Vault parameters",
    visualItems: [
      { label: "Core belief", value: '"Most founders fail at distribution, not product"' },
      { label: "Key metric", value: '"$4,200 MRR after 8 months"' },
      { label: "Failure event", value: '"Launched to zero signups twice before Reddit"' },
      { label: "Tone lock", value: "Lowercase-heavy · no em-dash · no AI-smell phrases" },
    ],
  },
  {
    id: "frameworks",
    step: "03",
    title: "FRAMEWORK SELECTION → SEQUENCE",
    subtitle: "Playbook mechanics and anti-amnesia constraints",
    body: "Choose from six distribution playbooks — each a multi-step sequence across Reddit, LinkedIn, X, or HN. SignalFlow tracks which step you are on per framework and weaves prior steps into the next draft so the narrative compounds instead of resetting.",
    bullets: [
      "Each playbook defines platform, step count, and angle per step (e.g. Reddit Case Study · 4 steps).",
      "framework_step_tracking stores integer progress per slug — survives refresh, tab switches, and parallel campaigns.",
      "Anti-amnesia rule: Step 3 references your Step 1 metrics and vault quotes automatically — no \"as I mentioned earlier\" hallucinations.",
    ],
    visualLabel: "Active sequence",
    visualItems: [
      { label: "Playbook", value: "Reddit Case Study" },
      { label: "Progress", value: "Step 2 of 4 · Authority post" },
      { label: "Parallel slot", value: "LinkedIn Waitlist · Step 1 queued" },
      { label: "Memory", value: "Step 1 MRR + churn month injected into draft" },
    ],
  },
  {
    id: "lead-hunting",
    step: "04",
    title: "LEAD HUNTING → INTENT DETECTION",
    subtitle: "Problem-matching scoring factors",
    body: "SignalFlow runs Serper-powered hunts against queries derived from your product DNA — then scores every thread for intent, not vanity mentions. You get people actively describing the problem you solve, ranked by reply-worthiness.",
    bullets: [
      "Intent score weights: problem language match, buying signal phrases, thread freshness, and platform fit.",
      "Filters out brand mentions, news reposts, hiring threads, and low-intent noise before they hit your stream.",
      "Tier 1: manual fetch. Tier 2+: automated daily (or hourly) hunts while you sleep — same scoring engine.",
    ],
    visualLabel: "Lead scorecard",
    visualItems: [
      { label: "Thread", value: "r/SaaS · 'CRM for solo founders?'" },
      { label: "Problem match", value: "94% — ICP pain verbatim" },
      { label: "Intent signals", value: "Active ask · budget implied · no vendor yet" },
      { label: "Recommended mode", value: "HYPE — add value, hold link (karma 87/100)" },
    ],
  },
  {
    id: "platform-intelligence",
    step: "05",
    title: "PLATFORM INTELLIGENCE → SAFE REPLY",
    subtitle: "Reddit, LinkedIn, and X compliance thresholds",
    body: "Before a word is drafted, platform rules load for the exact community — subreddit karma gates, link policies, tone ceilings, and auto-mod tripwires. The pre-publish validator blocks drafts that would get removed or flagged.",
    bullets: [
      "Reddit: karma thresholds per sub, no-link zones, em-dash ban patterns, and sub-native tone calibration.",
      "LinkedIn: peer-level sentence rhythm — no bro-marketing cadence or announcement spam energy.",
      "X: micro-burst formatting, punchy fragments, timeline-native casual voice — not essay paragraphs.",
    ],
    visualLabel: "Pre-publish check",
    visualItems: [
      { label: "Channel", value: "r/SaaS" },
      { label: "Karma gate", value: "87 / 100 required for link drop" },
      { label: "Validator", value: "No AI-smell · no em-dash · community-native tone" },
      { label: "Status", value: "Pre-publish passed" },
    ],
  },
] as const;

export const HOW_IT_WORKS_REPLY_BONUS = {
  step: "06",
  title: "THE REPLY SYSTEM",
  subtitle: "PLUG · HYPE · DEFLECT + native media directives",
  body: "When a lead lands in your stream, you do not stare at a blank reply box. Pick a mode. SignalFlow drafts platform-safe text and outputs media directives — what to attach natively on-platform, never as a sketchy external link dump.",
  modes: [
    {
      id: "plug",
      name: "PLUG mode",
      description:
        "Value-first reply that acknowledges their point, drops a real implementation detail from your vault, and weaves your product URL only when it fits naturally — never forced.",
      directive: 'Media directive: "Attach screenshot of dashboard metric you mentioned — upload directly in thread."',
    },
    {
      id: "hype",
      name: "HYPE mode",
      description:
        "High-energy peer acknowledgment — celebrate their insight without fanboy bot energy. Best for momentum threads where adding value builds authority without pitching.",
      directive:
        'Media directive: "No link this pass — karma below threshold. Lead with cold-start story from vault."',
    },
    {
      id: "deflect",
      name: "DEFLECT mode",
      description:
        "Calm, witty counter for skeptics and trolls. Highlights execution over over-engineering. Zero corporate tone, zero defensive whining — short punchy counters only.",
      directive:
        'Media directive: "Optional: attach one chart proving the metric — keep reply under two short paragraphs."',
    },
  ],
} as const;

export const HOW_IT_WORKS_FAQ = [
  {
    q: "Does it actually sound like me?",
    a: "Yes — if you complete intake honestly. Every draft pulls from your Vault: your MRR, failures, customer quotes, and tone locks. We enforce anti-AI constraints (banned phrases, no em-dash tripwires, fragmented syntax) so output reads like you typed it on your phone, not like a marketing intern.",
  },
  {
    q: "What if I get banned on Reddit?",
    a: "SignalFlow never posts on your behalf. You review, edit, and publish manually. Pre-publish validation checks subreddit rules, karma thresholds, link policies, and known auto-mod patterns before you copy anything. We tell you when to HOLD a link — not drop it and pray.",
  },
  {
    q: "Can I run multiple products?",
    a: "Founder tier includes 3 product vaults with independent DNA, lead queries, and parallel framework sequences. Agency tier is unlimited vaults with multi-product dashboard view — built for studios running several launches at once.",
  },
  {
    q: "Do you need my Reddit or LinkedIn password?",
    a: "No. You enter platform stats manually during setup — karma, account age, follower count. We do not use OAuth or store credentials. You stay in control of every publish action.",
  },
  {
    q: "How is this different from ChatGPT?",
    a: "ChatGPT gives you a blank page and forgets you tomorrow. SignalFlow gives you audited positioning, a permanent Vault, step-aware playbook memory, scored leads, platform compliance, and reply modes — one system that compounds daily.",
  },
  {
    q: "What do I do every morning?",
    a: "Open Daily OS. Up to five tasks — each names the exact thread, platform mode, angle from your vault, and whether to drop or hold your link. Not \"post on Reddit.\" The specific move, ready to execute.",
  },
] as const;

export const HOW_IT_WORKS_CLOSING = {
  headline: "The system is built. You just have to show up.",
  body: "Your URL starts the audit. Your Vault locks the voice. Your playbook runs the sequence. Your stream surfaces the leads. Pick a mode, paste the reply, attach proof on-platform — five tasks a day, streak on the line.",
  primaryCta: "Start with your URL",
  primaryHref: "/signup",
  secondaryCta: "See pricing",
  secondaryHref: "/pricing",
} as const;
