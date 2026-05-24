import fs from "fs";
import path from "path";

const root = path.resolve(".");

function write(rel, content) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content, "utf8");
  console.log("wrote", rel);
}

write(
  "src/components/ui/collapsible.tsx",
  `"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
`
);

write(
  "src/components/lead-sheet.tsx",
  `"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Copy,
  Loader2,
  Sparkles,
} from "lucide-react";

import { IntentBadge, PlatformBadge, StatusBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  getIntentTier,
  type ConversationTurn,
  type Lead,
  type LeadStatus,
} from "@/lib/signalflow-types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: LeadStatus[] = [
  "new",
  "drafted",
  "replied",
  "archived",
];

type LeadSheetProps = {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateLead: (id: string, patch: Partial<Lead>) => void;
};

function buildFollowUpDraft(
  lead: Lead,
  prospectMessage: string
): string {
  const product = "SignalFlow";
  return \`Thanks for the follow-up — happy to help. Based on what you shared: "\${prospectMessage.slice(0, 120)}\${prospectMessage.length > 120 ? "…" : ""}" — we use \${product} to rank threads like yours and draft founder-voice replies. Want a quick walkthrough?\`;
}

export function LeadSheet({
  lead,
  open,
  onOpenChange,
  onUpdateLead,
}: LeadSheetProps) {
  const [draftText, setDraftText] = useState("");
  const [followUpInput, setFollowUpInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (lead) {
      setDraftText(
        lead.ai_draft_content ??
          "Hey — saw your thread. Happy to share what worked for us (no pitch unless it's relevant)."
      );
      setFollowUpInput("");
      setCopied(false);
    }
  }, [lead?.id, lead?.ai_draft_content]);

  async function handleCopy() {
    if (!draftText) return;
    await navigator.clipboard.writeText(draftText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function setStatus(status: LeadStatus) {
    if (!lead) return;
    onUpdateLead(lead.id, { status });
  }

  async function handleGenerateFollowUp() {
    if (!lead || !followUpInput.trim()) return;
    setGenerating(true);
    const at = new Date().toISOString();
    const prospectTurn: ConversationTurn = {
      role: "prospect",
      content: followUpInput.trim(),
      at,
    };
    const nextDraft = buildFollowUpDraft(lead, followUpInput.trim());
    const userTurn: ConversationTurn = {
      role: "user",
      content: nextDraft,
      at: new Date(Date.now() + 1000).toISOString(),
    };
    await new Promise((r) => setTimeout(r, 900));
    onUpdateLead(lead.id, {
      conversation_history: [
        ...lead.conversation_history,
        prospectTurn,
        userTurn,
      ],
      ai_draft_content: nextDraft,
      status: "drafted",
    });
    setDraftText(nextDraft);
    setFollowUpInput("");
    setGenerating(false);
  }

  function saveDraft() {
    if (!lead) return;
    onUpdateLead(lead.id, {
      ai_draft_content: draftText,
      status: lead.status === "new" ? "drafted" : lead.status,
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-sidebar-border p-0 sm:max-w-xl"
      >
        {lead ? (
          <>
            <SheetHeader className="glass-strong shrink-0 space-y-4 border-b border-border/60 px-6 py-5 text-left">
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <PlatformBadge platform={lead.platform} />
                <IntentBadge score={lead.intent_score} />
                <StatusBadge status={lead.status} />
              </div>
              <div>
                <SheetTitle className="text-left text-lg">
                  {lead.author}
                </SheetTitle>
                <SheetDescription className="text-left">
                  {lead.subreddit ?? "Community thread"} ·{" "}
                  {formatDistanceToNow(new Date(lead.created_at), {
                    addSuffix: true,
                  })}
                </SheetDescription>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatus(status)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                      lead.status === status
                        ? "bg-primary/10 text-primary ring-1 ring-primary/25"
                        : "glass-soft text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Original post
                </p>
                <div className="glass-soft rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed text-foreground">
                  {lead.content}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    AI reply template
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="glass-soft h-8 gap-1.5"
                    onClick={() => void handleCopy()}
                  >
                    {copied ? (
                      <CheckCircle2 className="size-3.5 text-primary" />
                    ) : (
                      <Copy className="size-3.5" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <Textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  onBlur={saveDraft}
                  className="min-h-[120px] resize-none font-mono text-xs leading-relaxed glass"
                />
              </div>

              {lead.conversation_history.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Conversation history
                  </p>
                  <ul className="space-y-2">
                    {lead.conversation_history.map((turn, i) => (
                      <li
                        key={\`\${turn.at}-\${i}\`}
                        className={cn(
                          "max-w-[92%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                          turn.role === "prospect"
                            ? "glass-soft mr-auto rounded-tl-md text-foreground"
                            : "glass ml-auto rounded-tr-md border-primary/15 text-foreground"
                        )}
                      >
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {turn.role === "prospect" ? "Prospect" : "You"} ·{" "}
                          {formatDistanceToNow(new Date(turn.at), {
                            addSuffix: true,
                          })}
                        </p>
                        {turn.content}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="glass-strong shrink-0 space-y-3 border-t border-border/60 px-6 py-5">
              <Label
                htmlFor="follow-up-input"
                className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
              >
                Paste prospect follow-up
              </Label>
              <Textarea
                id="follow-up-input"
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                placeholder="Paste their latest reply here…"
                className="min-h-[80px] resize-none glass-soft"
              />
              <Button
                type="button"
                className="w-full gap-2"
                disabled={!followUpInput.trim() || generating}
                onClick={() => void handleGenerateFollowUp()}
              >
                {generating ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="size-4" aria-hidden />
                )}
                Generate smart follow-up
              </Button>
            </div>
          </>
        ) : (
          <div className="p-6 text-sm text-muted-foreground">
            Select a lead to view context.
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
`
);

write(
  "src/components/dashboard/pipeline-dashboard.tsx",
  `"use client";

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
  const t = text.replace(/\\s+/g, " ").trim();
  return t.length <= max ? t : \`\${t.slice(0, max)}…\`;
}

export function PipelineDashboard() {
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
      source_url: sourceUrl.trim() || \`manual://\${Date.now()}\`,
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Pipeline
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Master bounty board — track intent, ingest threads, and reply in
          context.
        </p>
      </div>

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
            value: \`\${metrics.hotConversion}%\`,
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
`
);

write(
  "src/app/(app)/dashboard/page.tsx",
  `import { PipelineDashboard } from "@/components/dashboard/pipeline-dashboard";

/** Page C — Master Pipeline Dashboard (wrapped by AppShell in parent layout). */
export default function DashboardPage() {
  return <PipelineDashboard />;
}
`
);

console.log("done");
