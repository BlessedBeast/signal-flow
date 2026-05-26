"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

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
import { getAuthHeaders } from "@/lib/api-auth";
import type { Lead, LeadStatus, Platform } from "@/lib/signalflow-types";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: LeadStatus[] = [
  "new",
  "drafted",
  "replied",
  "archived",
];

const API_STATUSES = new Set<LeadStatus>(["replied", "archived"]);

const PLATFORM_THREAD_LABEL: Record<Platform, string> = {
  reddit: "Reddit thread",
  x: "X post",
  hackernews: "HN thread",
  indiehackers: "Indie Hackers post",
  producthunt: "Product Hunt thread",
};

type LeadSheetProps = {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateLead: (id: string, patch: Partial<Lead>) => void;
};

function hasDraftContent(draft: string | null | undefined): boolean {
  return Boolean(draft?.trim());
}

function threadLinkLabel(safeUrl: string, platform: Platform): string {
  try {
    const parsed = new URL(safeUrl);
    const host = parsed.hostname.replace(/^www\./, "");
    if (platform === "reddit") {
      const sub = parsed.pathname.match(/\/r\/([^/]+)/);
      if (sub) return `r/${sub[1]}`;
    }
    return host || PLATFORM_THREAD_LABEL[platform];
  } catch {
    return PLATFORM_THREAD_LABEL[platform];
  }
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
  const [statusLoading, setStatusLoading] = useState<LeadStatus | null>(null);
  const [conversionLoading, setConversionLoading] = useState<
    "won" | "lost" | null
  >(null);
  const [isGeneratingBaseDraft, setIsGeneratingBaseDraft] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const isDraftGenerating = isGeneratingBaseDraft || isRegenerating;

  const leadId = lead?.id;
  const leadDraftContent = lead?.ai_draft_content;

  useEffect(() => {
    if (!leadId || !open) return;
    setFollowUpInput("");
    setCopied(false);
    setIsGeneratingBaseDraft(false);
    setIsRegenerating(false);
    setDraftText(
      hasDraftContent(leadDraftContent) ? leadDraftContent!.trim() : ""
    );
  }, [leadId, leadDraftContent, open]);

  async function handleGenerateInitialDraft() {
    if (!lead) return;

    setIsGeneratingBaseDraft(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) {
        toast.error("Sign in to generate reply drafts.");
        return;
      }

      const res = await fetch("/api/leads/reply", {
        method: "POST",
        headers,
        body: JSON.stringify({ leadId: lead.id }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        reply?: string;
        conversation_history?: Lead["conversation_history"];
        ai_draft_content?: string;
        error?: string;
      };

      if (!res.ok || !json.ok || !json.reply) {
        toast.error(json.error ?? "Failed to generate initial draft");
        return;
      }

      const reply = json.reply;
      onUpdateLead(lead.id, {
        ai_draft_content: json.ai_draft_content ?? reply,
        conversation_history:
          json.conversation_history ?? lead.conversation_history,
        status: lead.status === "new" ? "drafted" : lead.status,
      });
      setDraftText(reply);
      toast.success("Initial draft ready");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Draft generation failed";
      toast.error(message);
    } finally {
      setIsGeneratingBaseDraft(false);
    }
  }

  async function handleRegenerateDraft() {
    if (!lead) return;

    setIsRegenerating(true);
    const toastId = toast.loading(
      "Compiling a fresh anti-detection perspective..."
    );

    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) {
        toast.error("Sign in to regenerate reply drafts.", { id: toastId });
        return;
      }

      const res = await fetch("/api/leads/reply", {
        method: "POST",
        headers,
        body: JSON.stringify({ leadId: lead.id }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        reply?: string;
        conversation_history?: Lead["conversation_history"];
        ai_draft_content?: string;
        error?: string;
        details?: string;
      };

      if (!res.ok || !json.ok || !json.reply) {
        toast.error(
          res.status >= 500
            ? "Failed to cycle draft engine."
            : (json.error ?? json.details ?? "Failed to cycle draft engine."),
          { id: toastId }
        );
        return;
      }

      const reply = json.reply;
      setDraftText(reply);
      onUpdateLead(lead.id, {
        ai_draft_content: json.ai_draft_content ?? reply,
        conversation_history:
          json.conversation_history ?? lead.conversation_history,
        status: lead.status === "new" ? "drafted" : lead.status,
      });
      toast.success("Fresh draft prepared!", { id: toastId });
    } catch {
      toast.error("Failed to cycle draft engine.", { id: toastId });
    } finally {
      setIsRegenerating(false);
    }
  }

  async function handleCopy() {
    if (!draftText || isDraftGenerating) return;
    await navigator.clipboard.writeText(draftText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function applyStatus(status: LeadStatus) {
    if (!lead) return;

    if (!API_STATUSES.has(status)) {
      onUpdateLead(lead.id, { status });
      return;
    }

    setStatusLoading(status);
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) {
        toast.error("Sign in to update pipeline status.");
        return;
      }

      const res = await fetch("/api/leads/status", {
        method: "POST",
        headers,
        body: JSON.stringify({ leadId: lead.id, status }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Status update failed");
        return;
      }

      onUpdateLead(lead.id, { status });
      toast.success(
        status === "replied" ? "Marked as replied" : "Lead archived"
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Status update failed";
      toast.error(message);
    } finally {
      setStatusLoading(null);
    }
  }

  async function handleGenerateFollowUp() {
    if (!lead || !followUpInput.trim()) return;

    setGenerating(true);
    toast.info("Generating follow-up…");

    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) {
        toast.error("Sign in to generate follow-ups.");
        return;
      }

      const res = await fetch("/api/velocity/follow-up", {
        method: "POST",
        headers,
        body: JSON.stringify({
          leadId: lead.id,
          followInput: followUpInput.trim(),
        }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        suggestedReply?: string;
        conversation_history?: Lead["conversation_history"];
        ai_draft_content?: string;
        error?: string;
        step?: string;
      };

      if (json.step === "onboarding-required") {
        toast.error(
          json.error ?? "Product DNA required — complete onboarding first."
        );
        return;
      }

      if (!res.ok || !json.ok || !json.suggestedReply) {
        toast.error(json.error ?? "Follow-up generation failed");
        return;
      }

      setDraftText(json.suggestedReply);
      setFollowUpInput("");
      onUpdateLead(lead.id, {
        conversation_history:
          json.conversation_history ?? lead.conversation_history,
        ai_draft_content: json.ai_draft_content ?? json.suggestedReply,
        status: "drafted",
      });
      toast.success("Follow-up draft ready — review and copy when it fits");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Follow-up generation failed";
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  function saveDraft() {
    if (!lead || isDraftGenerating) return;
    onUpdateLead(lead.id, {
      ai_draft_content: draftText,
      status: lead.status === "new" ? "drafted" : lead.status,
    });
  }

  async function handleConversionOutcome(outcome: "won" | "lost") {
    if (!lead) return;

    setConversionLoading(outcome);
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) {
        toast.error("Sign in to record conversion outcomes.");
        return;
      }

      const res = await fetch("/api/leads/conversion", {
        method: "POST",
        headers,
        body: JSON.stringify({ leadId: lead.id, outcome }),
      });

      const json = (await res.json()) as {
        ok?: boolean;
        flywheelSaved?: boolean;
        error?: string;
      };

      if (!res.ok || !json.ok) {
        toast.error(json.error ?? "Failed to update conversion status");
        return;
      }

      onUpdateLead(lead.id, { status: "archived" });

      if (outcome === "won") {
        toast.success(
          json.flywheelSaved
            ? "Lead marked as won — sequence saved to flywheel"
            : "Lead marked as won"
        );
      } else {
        toast.message("Lead marked as lost", {
          description: "Archived without flywheel training data.",
        });
      }

      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Conversion update failed";
      toast.error(message);
    } finally {
      setConversionLoading(null);
    }
  }

  const rawThreadUrl = lead?.url?.trim() || lead?.source_url?.trim() || "";
  const safeUrl = rawThreadUrl
    ? rawThreadUrl.startsWith("http")
      ? rawThreadUrl
      : `https://${rawThreadUrl}`
    : "";
  const canOpenThread = Boolean(safeUrl);
  const showDraftEditor =
    hasDraftContent(lead?.ai_draft_content) || hasDraftContent(draftText);

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
                {canOpenThread ? (
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center gap-1"
                  >
                    <PlatformBadge platform={lead.platform} />
                  </a>
                ) : (
                  <PlatformBadge platform={lead.platform} />
                )}
                <IntentBadge score={lead.intent_score} />
                <StatusBadge status={lead.status} />
                {canOpenThread ? (
                  <a
                    href={safeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg glass-soft px-2.5 py-1 text-xs font-medium text-primary",
                      "transition-colors hover:bg-primary/10 hover:underline"
                    )}
                  >
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden />
                    Open Original Thread
                  </a>
                ) : null}
              </div>
              <div>
                {canOpenThread ? (
                  <SheetTitle className="text-left text-lg">
                    <a
                      href={safeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline flex items-center gap-1 text-foreground"
                    >
                      {threadLinkLabel(safeUrl, lead.platform)}
                      <ExternalLink
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                    </a>
                  </SheetTitle>
                ) : (
                  <SheetTitle className="text-left text-lg">
                    {PLATFORM_THREAD_LABEL[lead.platform]}
                  </SheetTitle>
                )}
                <SheetDescription className="text-left">
                  {formatDistanceToNow(new Date(lead.created_at), {
                    addSuffix: true,
                  })}
                  {canOpenThread ? (
                    <span className="mt-1 block truncate text-xs opacity-80">
                      {safeUrl}
                    </span>
                  ) : null}
                </SheetDescription>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={
                      statusLoading !== null ||
                      conversionLoading !== null ||
                      isDraftGenerating
                    }
                    onClick={() => void applyStatus(status)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                      lead.status === status
                        ? "bg-primary/10 text-primary ring-1 ring-primary/25"
                        : "glass-soft text-muted-foreground hover:text-foreground",
                      statusLoading === status && "opacity-60"
                    )}
                  >
                    {statusLoading === status ? "…" : status}
                  </button>
                ))}
              </div>

              <div className="glass-soft rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  Conversion outcome
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-600/90"
                    disabled={
                      conversionLoading !== null ||
                      isDraftGenerating ||
                      lead.status === "archived"
                    }
                    onClick={() => void handleConversionOutcome("won")}
                  >
                    {conversionLoading === "won" ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Trophy className="size-3.5" aria-hidden />
                    )}
                    Mark Lead as Won
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1.5 glass-soft"
                    disabled={
                      conversionLoading !== null ||
                      isDraftGenerating ||
                      lead.status === "archived"
                    }
                    onClick={() => void handleConversionOutcome("lost")}
                  >
                    {conversionLoading === "lost" ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    ) : (
                      <XCircle className="size-3.5" aria-hidden />
                    )}
                    Mark Lead as Lost
                  </Button>
                </div>
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    AI reply template
                  </Label>
                  {showDraftEditor ? (
                    <div className="flex flex-wrap items-center gap-2">
                      {canOpenThread ? (
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 font-mono text-xs text-primary transition-colors hover:underline"
                        >
                          <span>View Original Thread</span>
                          <ExternalLink className="size-3 shrink-0" aria-hidden />
                        </a>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={cn(
                          "glass-soft h-8 gap-1.5 border-zinc-800/15 bg-zinc-950/[0.04] font-mono text-xs tracking-tight text-muted-foreground shadow-none",
                          "hover:border-zinc-800/25 hover:bg-zinc-950/10 hover:text-foreground"
                        )}
                        disabled={isDraftGenerating || generating}
                        onClick={() => void handleRegenerateDraft()}
                      >
                        <RefreshCw
                          className={cn(
                            "size-3.5 shrink-0",
                            isRegenerating && "animate-spin"
                          )}
                          aria-hidden
                        />
                        Retry
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="glass-soft h-8 gap-1.5"
                        disabled={
                          isDraftGenerating || generating || !draftText
                        }
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
                  ) : null}
                </div>
                {showDraftEditor ? (
                  <Textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    onBlur={saveDraft}
                    placeholder="Edit your reply before pasting on the thread…"
                    className="min-h-[120px] resize-none font-mono text-xs leading-relaxed glass"
                    disabled={isDraftGenerating}
                  />
                ) : (
                  <div className="glass-soft flex min-h-[140px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/60 px-6 py-8 text-center">
                    <p className="max-w-xs text-sm text-muted-foreground leading-relaxed">
                      No reply draft yet. Generate a contextual first message
                      powered by your Product DNA and community compliance
                      rules.
                    </p>
                    <Button
                      type="button"
                      className="gap-2"
                      disabled={isGeneratingBaseDraft}
                      onClick={() => void handleGenerateInitialDraft()}
                    >
                      {isGeneratingBaseDraft ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <Sparkles className="size-4" aria-hidden />
                      )}
                      Generate Initial Draft
                    </Button>
                  </div>
                )}
              </div>

              {lead.conversation_history.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    Conversation history
                  </p>
                  <ul className="space-y-2">
                    {lead.conversation_history.map((turn, i) => (
                      <li
                        key={`${turn.at}-${i}`}
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
                disabled={generating || isDraftGenerating}
              />
              <Button
                type="button"
                className="w-full gap-2"
                disabled={
                  !followUpInput.trim() || generating || isDraftGenerating
                }
                onClick={() => void handleGenerateFollowUp()}
              >
                {generating ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="size-4" aria-hidden />
                )}
                {generating ? "Generating follow-up…" : "Generate smart follow-up"}
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
