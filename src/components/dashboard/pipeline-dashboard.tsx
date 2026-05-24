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
import { LeadSheet } from "@/components/lead-sheet";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getIntentTier,
  type Lead,
  type Platform,
} from "@/lib/signalflow-types";
import { useSignalFlow } from "@/lib/signalflow-store";
import { cn } from "@/lib/utils";

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "reddit", label: "Reddit" },
  { id: "x", label: "X" },
  { id: "hackernews", label: "HN" },
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

  const sortedLeads = useMemo(
    () =>
      [...leads].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [leads]
  );

  const activeLead =
    sortedLeads.find((l) => l.id === activeLeadId) ?? null;

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
      created_at: now,
      author: "Manual ingest",
      subreddit:
        ingestPlatform === "reddit"
          ? "r/manual"
          : ingestPlatform === "hackernews"
            ? "Ask HN"
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
        ].map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className="glass-soft rounded-2xl px-5 py-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {label}
              </p>
              <Icon className={cn("size-4 opacity-70", accent)} aria-hidden />
            </div>
            <p className={cn("mt-2 text-3xl font-semibold tabular-nums", accent)}>
              {value}
            </p>
          </div>
        ))}
      </div>

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
                <Label className="text-xs text-muted-foreground">Platform</Label>
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

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Lead stream</h2>
        {sortedLeads.length === 0 ? (
          <div className="glass-soft rounded-2xl px-6 py-12 text-center text-sm text-muted-foreground">
            No leads yet — ingest a thread above or run the miner.
          </div>
        ) : (
          <ul className="space-y-2">
            {sortedLeads.map((lead) => {
              const isActive = lead.id === activeLeadId;
              return (
                <li key={lead.id}>
                  <button
                    type="button"
                    onClick={() => setActiveLeadId(lead.id)}
                    className={cn(
                      "glass-soft w-full rounded-2xl px-4 py-4 text-left transition-all duration-150",
                      "hover:ring-1 hover:ring-primary/20",
                      isActive && "ring-2 ring-primary/30 bg-sidebar-accent/50"
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <PlatformBadge platform={lead.platform} />
                      <IntentBadge tier={getIntentTier(lead.intent_score)} />
                      <StatusBadge status={lead.status} />
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(lead.created_at), {
                          addSuffix: true,
                        })}
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
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                      {snippet(lead.content)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
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
