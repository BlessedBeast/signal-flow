"use client";

import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  Flame,
  MessageSquare,
  Plus,
  Send,
  Target,
  TrendingUp,
} from "lucide-react";

import { IntentBadge, PlatformBadge, StatusBadge } from "@/components/badges";
import { TaskChecklist } from "@/components/dashboard/task-checklist";
import { LeadSheet } from "@/components/lead-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricHint } from "@/components/ui/metric-hint";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { groupLeadsByReleaseDay } from "@/lib/leads/lead-ledger";
import {
  getIntentTier,
  type Lead,
  type Platform,
} from "@/lib/signalflow-types";
import { useSignalFlow } from "@/lib/signalflow-store";
import { cn } from "@/lib/utils";

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "reddit", label: "Reddit" },
  { id: "hackernews", label: "HN" },
  { id: "indiehackers", label: "IH" },
  { id: "producthunt", label: "PH" },
  { id: "x", label: "X" },
];

function estimateIntentScore(content: string): number {
  const lower = content.toLowerCase();
  if (
    /looking for|alternative|recommend|best tool|anyone use/i.test(lower)
  ) {
    return lower.includes("alternative") || lower.includes("looking for")
      ? 88
      : 72;
  }
  if (/ask hn|help|how do you/i.test(lower)) return 55;
  return 38;
}

function computeMetrics(leads: Lead[]) {
  const tracked = leads.length;
  const hotLeads = leads.filter((l) => l.intent_score >= 80);
  const hotCount = hotLeads.length;
  const hotReplied = hotLeads.filter((l) => l.status === "replied").length;
  const hotConversion =
    hotCount > 0 ? Math.round((hotReplied / hotCount) * 100) : 0;
  const repliesSent = leads.filter((l) => l.status === "replied").length;
  return { tracked, hotCount, hotConversion, repliesSent };
}

function snippet(text: string, max = 140) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

const METRIC_DEFINITIONS = {
  tracked:
    "Total high-intent candidate channels scraped and pulled into your local database.",
  hot: "Leads scoring 80+ intent in your active stream — volatile threads worth immediate outreach.",
  conversion:
    "The percentage of highly volatile viral waves you successfully hijacked within the 60-minute golden hour window.",
  replies:
    "Threads you marked as replied after closing the loop in the lead sheet.",
} as const;

const LEDGER_EMPTY_FOOTNOTE =
  "Background: discovery cron mines Serper signals into your vault queue. Daily drop releases the highest-intent batch and stamps released_at for the ledger.";

type PipelineDashboardProps = {
  showHeader?: boolean;
};

export function PipelineDashboard({ showHeader = true }: PipelineDashboardProps) {
  const { leads, addLead, updateLead } = useSignalFlow();
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [ingestOpen, setIngestOpen] = useState(false);
  const [rawContent, setRawContent] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [ingestPlatform, setIngestPlatform] = useState<Platform>("reddit");

  const metrics = useMemo(() => computeMetrics(leads), [leads]);

  const ledgerBuckets = useMemo(
    () => groupLeadsByReleaseDay(leads),
    [leads]
  );

  const streamLeadCount = useMemo(
    () => ledgerBuckets.reduce((sum, bucket) => sum + bucket.leads.length, 0),
    [ledgerBuckets]
  );

  const activeLead =
    leads.find((l) => l.id === activeLeadId) ?? null;

  function handleIngest(e: React.FormEvent) {
    e.preventDefault();
    const content = rawContent.trim();
    if (!content) return;

    const score = estimateIntentScore(content);
    const now = new Date().toISOString();

    addLead({
      content,
      platform: ingestPlatform,
      intent_score: score,
      status: "new",
      ai_draft_content: null,
      conversation_history: [
        { role: "prospect", content, at: now },
      ],
      source_url: sourceUrl.trim() || `manual://${Date.now()}`,
      released_at: now,
      created_at: now,
      author: "Manual ingest",
      subreddit:
        ingestPlatform === "reddit"
          ? "r/manual"
          : ingestPlatform === "hackernews"
            ? "Ask HN"
            : ingestPlatform === "indiehackers"
              ? "Indie Hackers"
              : ingestPlatform === "producthunt"
                ? "Product Hunt"
                : null,
    });

    setRawContent("");
    setSourceUrl("");
    setIngestOpen(false);
  }

  return (
    <div className="space-y-8">
      {showHeader ? (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Pipeline
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Master bounty board — track intent, ingest threads, and reply in
            context.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Tracked leads",
            value: metrics.tracked,
            icon: Target,
            accent: "text-foreground",
          },
          {
            label: "Hot leads",
            value: metrics.hotCount,
            icon: Flame,
            accent: "text-rose-600",
          },
          {
            label: "Hot conversion",
            value: `${metrics.hotConversion}%`,
            icon: TrendingUp,
            accent: "text-primary",
          },
          {
            label: "Replies sent",
            value: metrics.repliesSent,
            icon: MessageSquare,
            accent: "text-emerald-600",
          },
        ].map(({ label, value, icon: Icon, accent }) => {
          const definitionKey =
            label === "Tracked leads"
              ? "tracked"
              : label === "Hot leads"
                ? "hot"
                : label === "Hot conversion"
                  ? "conversion"
                  : "replies";

          return (
            <div
              key={label}
              className="group glass-soft rounded-2xl px-5 py-4 shadow-sm transition-colors hover:border-primary/25 hover:ring-1 hover:ring-primary/15"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  <MetricHint
                    label={label}
                    definition={METRIC_DEFINITIONS[definitionKey]}
                  />
                </p>
                <Icon className={cn("size-4 opacity-70", accent)} aria-hidden />
              </div>
              <p className={cn("mt-2 text-3xl font-semibold tabular-nums", accent)}>
                {value}
              </p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="space-y-4 lg:col-span-8">
          <Collapsible open={ingestOpen} onOpenChange={setIngestOpen}>
            <div className="glass rounded-2xl overflow-hidden">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-sidebar-accent/40"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="size-4 text-primary" aria-hidden />
                    <span className="text-sm font-semibold text-foreground">
                      Manual lead ingestion
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "size-4 text-muted-foreground transition-transform",
                      ingestOpen && "rotate-180"
                    )}
                    aria-hidden
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <form
                  onSubmit={handleIngest}
                  className="space-y-4 border-t border-border/50 px-5 pb-5 pt-4"
                >
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Platform
                    </Label>
                    <div className="inline-flex rounded-xl glass-soft p-1">
                      {PLATFORMS.map(({ id, label }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setIngestPlatform(id)}
                          className={cn(
                            "rounded-lg px-4 py-1.5 text-xs font-medium transition-colors",
                            ingestPlatform === id
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thread-content">Thread text</Label>
                    <Textarea
                      id="thread-content"
                      value={rawContent}
                      onChange={(e) => setRawContent(e.target.value)}
                      placeholder="Paste the full post or comment thread…"
                      className="min-h-[100px] glass-soft resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source-url">Source link (optional)</Label>
                    <Input
                      id="source-url"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder="https://reddit.com/…"
                      className="glass-soft"
                    />
                  </div>
                  <Button type="submit" className="gap-2">
                    <Send className="size-4" aria-hidden />
                    Add to pipeline
                  </Button>
                </form>
              </CollapsibleContent>
            </div>
          </Collapsible>

          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Lead ledger
              </h2>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {streamLeadCount} in stream · grouped by daily drop
              </p>
            </div>

            {streamLeadCount === 0 ? (
              <EmptyState
                icon={Target}
                title="Ledger awaiting daily drop"
                description="No active stream leads yet. Run the adaptive miner from the sidebar, or manually ingest a thread above while cron queues fresh signals in the vault."
                footnote={LEDGER_EMPTY_FOOTNOTE}
                className="min-h-[280px]"
              />
            ) : (
              <div className="space-y-3">
                {ledgerBuckets.map((bucket) => (
                  <Collapsible
                    key={bucket.key}
                    defaultOpen={bucket.key === "today"}
                    className="group glass-strong overflow-hidden rounded-2xl"
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors",
                          "hover:bg-sidebar-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <ChevronDown
                            className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                            aria-hidden
                          />
                          <span className="truncate text-base font-semibold tracking-tight text-foreground">
                            {bucket.label}
                          </span>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                          <Badge
                            variant="outline"
                            className="border-border/60 bg-muted/30 font-mono text-[10px] text-foreground"
                          >
                            {bucket.stats.total} lead
                            {bucket.stats.total === 1 ? "" : "s"}
                          </Badge>
                          {bucket.stats.untouched > 0 ? (
                            <Badge
                              variant="outline"
                              className="border-primary/25 bg-primary/10 font-mono text-[10px] text-foreground"
                            >
                              {bucket.stats.untouched} untouched
                            </Badge>
                          ) : null}
                          {bucket.stats.ongoingFollowUps > 0 ? (
                            <Badge
                              variant="outline"
                              className="border-border/60 font-mono text-[10px] text-muted-foreground"
                            >
                              {bucket.stats.ongoingFollowUps} ongoing follow-up
                              {bucket.stats.ongoingFollowUps === 1 ? "" : "s"}
                            </Badge>
                          ) : null}
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ul className="space-y-2 border-t border-border/50 px-3 pb-3 pt-2">
                        {bucket.leads.map((lead) => {
                          const isActive = lead.id === activeLeadId;
                          return (
                            <li key={lead.id}>
                              <button
                                type="button"
                                onClick={() => setActiveLeadId(lead.id)}
                                className={cn(
                                  "glass-soft w-full rounded-xl px-4 py-4 text-left transition-all duration-150",
                                  "hover:ring-1 hover:ring-primary/20",
                                  isActive &&
                                    "ring-2 ring-primary/30 bg-sidebar-accent/50"
                                )}
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <PlatformBadge platform={lead.platform} />
                                  <IntentBadge
                                    tier={getIntentTier(lead.intent_score)}
                                  />
                                  <StatusBadge status={lead.status} />
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    {formatDistanceToNow(
                                      new Date(lead.released_at),
                                      { addSuffix: true }
                                    )}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm font-medium text-foreground">
                                  {lead.author}
                                  {lead.subreddit ? (
                                    <span className="font-normal text-muted-foreground">
                                      {" "}
                                      · {lead.subreddit}
                                    </span>
                                  ) : null}
                                </p>
                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                  {snippet(lead.content)}
                                </p>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="lg:col-span-4">
          <TaskChecklist />
        </aside>
      </div>

      <LeadSheet
        lead={activeLead}
        open={activeLeadId !== null}
        onOpenChange={(open) => {
          if (!open) setActiveLeadId(null);
        }}
        onUpdateLead={updateLead}
      />
    </div>
  );
}
