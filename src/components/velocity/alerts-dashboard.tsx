"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Flame,
  Loader2,
  Radar,
  Radio,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { IntentBadge, PlatformBadge } from "@/components/badges";
import { LeadSheet } from "@/components/lead-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { parseApiJsonResponse } from "@/lib/api/parse-api-response";
import { getAuthHeaders } from "@/lib/api-auth";
import { useSignalFlow } from "@/lib/signalflow-store";
import type { Lead } from "@/lib/signalflow-types";
import {
  hotPlugDraftFromAlert,
  tierStatusLabel,
  type PlugAlert,
  type PlugAlertsResult,
} from "@/lib/velocity/alerts-pipeline";
import { cn } from "@/lib/utils";

type PlugAlertsApiPayload = {
  ok?: boolean;
  data?: PlugAlertsResult;
  error?: string;
  step?: string | null;
};

function ApiErrorBanner({
  message,
  onDismiss,
  onRetry,
}: {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}) {
  return (
    <div
      className="glass-strong mb-4 flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between"
      role="alert"
    >
      <div className="flex gap-3">
        <AlertTriangle
          className="mt-0.5 size-5 shrink-0 text-destructive"
          aria-hidden
        />
        <div>
          <p className="text-sm font-semibold text-foreground">
            Plug radar API error
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {message}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {onRetry ? (
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="gap-1"
          onClick={onDismiss}
        >
          <X className="size-4" aria-hidden />
          Dismiss
        </Button>
      </div>
    </div>
  );
}

function AlertsListSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading plug alerts">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="glass-strong animate-pulse space-y-4 rounded-xl border border-border/60 p-5"
        >
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded-md bg-muted/50" />
            <div className="h-5 w-12 rounded-md bg-muted/40" />
            <div className="h-5 w-10 rounded-md bg-muted/30" />
          </div>
          <div className="h-16 rounded-lg bg-muted/40" />
          <div className="h-3 w-2/3 rounded bg-muted/30" />
          <div className="h-3 w-1/2 rounded bg-muted/25" />
        </div>
      ))}
    </div>
  );
}

function AlertCard({
  alert,
  copiedId,
  disabled,
  isIngesting,
  onAlertClick,
  onCopyPlug,
}: {
  alert: PlugAlert;
  copiedId: string | null;
  disabled: boolean;
  isIngesting: boolean;
  onAlertClick: (alert: PlugAlert) => void;
  onCopyPlug: (id: string, text: string) => void;
}) {
  const displayTier = alert.velocity_tier ?? alert.tier;
  const isHot = displayTier === "HOT";
  const isCopied = copiedId === alert.id;
  const isWarmOrCold = displayTier === "WARM" || displayTier === "COLD";
  const threadUrl = alert.url || alert.source_url;
  const plugDraft = hotPlugDraftFromAlert(alert);

  return (
    <button
      type="button"
      disabled={disabled || isIngesting}
      onClick={() => onAlertClick(alert)}
      className={cn(
        "glass-strong w-full cursor-pointer space-y-4 rounded-xl p-5 text-left transition-all",
        "hover:scale-[1.01] hover:ring-1 hover:ring-primary/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "active:scale-[0.99]",
        (disabled || isIngesting) && "pointer-events-none opacity-70"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <PlatformBadge platform={alert.platform} />
          <IntentBadge tier={displayTier} />
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {alert.velocity_score}
          </span>
          {alert.subreddit ? (
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              r/{alert.subreddit}
            </span>
          ) : null}
          {isIngesting ? (
            <Loader2
              className="size-3.5 animate-spin text-primary"
              aria-hidden
            />
          ) : null}
        </div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {tierStatusLabel(displayTier, alert.velocity_score)}
        </p>
      </div>

      <blockquote className="rounded-lg border border-border/50 bg-muted/30 px-3 py-3 text-sm leading-relaxed text-foreground">
        {alert.post_snippet}
      </blockquote>

      {threadUrl ? (
        <a
          href={threadUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-primary hover:underline"
        >
          Open live thread
          <ExternalLink className="size-3 shrink-0" aria-hidden />
        </a>
      ) : null}

      <p className="font-mono text-[10px] text-muted-foreground">
        {alert.comments} comments · {alert.author}
      </p>

      {isWarmOrCold ? (
        <p className="font-mono text-[10px] uppercase tracking-wider text-primary/90">
          Click to open workspace and forge custom stealth reply
        </p>
      ) : null}

      {isHot && plugDraft ? (
        <div
          className="relative space-y-3 rounded-lg border border-primary/40 bg-primary/10 p-4"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary">
            deploy window open
          </p>
          <p className="text-sm leading-relaxed text-foreground">{plugDraft}</p>
          <Button
            type="button"
            className="gap-2"
            size="sm"
            disabled={disabled || isIngesting}
            onClick={(e) => {
              e.stopPropagation();
              onCopyPlug(alert.id, plugDraft);
            }}
          >
            {isCopied ? (
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
            ) : (
              <Copy className="size-4 shrink-0" aria-hidden />
            )}
            {isCopied ? "Copied!" : "Copy Link Plug"}
          </Button>
        </div>
      ) : null}
    </button>
  );
}

export function AlertsDashboard() {
  const { profile, leads, addLead, updateLead, refreshLeads } = useSignalFlow();
  const dna = profile.product_dna;

  const [scanResult, setScanResult] = useState<PlugAlertsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ingestingAlertId, setIngestingAlertId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const copyPlugText = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text.trim());
      setCopiedId(id);
      toast.success("Link plug copied — paste at peak velocity");
      window.setTimeout(() => setCopiedId(null), 2500);
    } catch {
      toast.error("Could not copy plug text — check browser permissions");
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    if (!dna) {
      setScanResult(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) {
        setScanResult(null);
        setApiError("Sign in required to load plug alerts.");
        return;
      }

      const res = await fetch("/api/velocity/alerts", {
        method: "GET",
        headers,
      });

      const parsed = await parseApiJsonResponse<PlugAlertsApiPayload>(
        res,
        "GET /api/velocity/alerts"
      );

      if (!parsed.ok) {
        const message = parsed.error;
        setApiError(message);
        setScanResult(null);
        toast.error(message);
        return;
      }

      const json = parsed.data;

      if (json.step === "onboarding-required") {
        const message =
          json.error ?? "Product DNA required — complete onboarding first.";
        setApiError(message);
        toast.error(message);
        setScanResult(null);
        return;
      }

      if (!json.ok || !json.data) {
        const message = json.error ?? "Failed to load plug alerts";
        setApiError(message);
        setScanResult(null);
        toast.error(message);
        return;
      }

      setScanResult(json.data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load plug alerts";
      console.error("loadAlerts client error:", err);
      setApiError(message);
      toast.error(message);
      setScanResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [dna]);

  const runScan = useCallback(async () => {
    if (isScanning) return;

    if (!dna) {
      toast.error("Complete Product DNA onboarding before running plug radar.");
      return;
    }

    setIsScanning(true);
    setApiError(null);
    toast.info("Scanning thread velocity streams...");

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/velocity/alerts", {
        method: "POST",
        headers,
      });

      const parsed = await parseApiJsonResponse<PlugAlertsApiPayload>(
        res,
        "POST /api/velocity/alerts"
      );

      if (!parsed.ok) {
        const message = parsed.error;
        setApiError(message);
        toast.error(message);
        return;
      }

      const json = parsed.data;

      if (json.step === "onboarding-required") {
        const message =
          json.error ?? "Product DNA required — complete onboarding first.";
        setApiError(message);
        toast.error(message);
        return;
      }

      if (!json.ok || !json.data) {
        const message = json.error ?? "Plug radar scan failed";
        setApiError(message);
        toast.error(message);
        return;
      }

      setScanResult(json.data);
      const hotCount = json.data.alerts.filter(
        (a) => (a.velocity_tier ?? a.tier) === "HOT"
      ).length;
      toast.success(
        hotCount > 0
          ? `${hotCount} HOT alert${hotCount === 1 ? "" : "s"} — deploy links now`
          : `Scan complete — ${json.data.alerts.length} threads in radar`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected radar scan error";
      console.error("runScan client error:", err);
      setApiError(message);
      toast.error(message);
    } finally {
      setIsScanning(false);
    }
  }, [dna, isScanning]);

  const handleAlertInteraction = useCallback(
    async (alert: PlugAlert) => {
      if (ingestingAlertId || isScanning) return;

      setIngestingAlertId(alert.id);

      try {
        const headers = await getAuthHeaders();
        if (!headers.Authorization) {
          toast.error("Sign in to open the reply workspace.");
          return;
        }

        const plugDraft = hotPlugDraftFromAlert(alert);

        const res = await fetch("/api/leads/ingest-alert", {
          method: "POST",
          headers,
          body: JSON.stringify({
            content: alert.post_snippet,
            platform: alert.platform,
            source_url: alert.source_url,
            author: alert.author,
            intent_score: alert.velocity_score,
            tier: alert.tier,
            plugText: plugDraft,
          }),
        });

        const json = (await res.json()) as {
          ok?: boolean;
          lead?: Lead;
          error?: string;
        };

        if (!res.ok || !json.ok || !json.lead) {
          toast.error(json.error ?? "Failed to open alert workspace");
          return;
        }

        const lead = json.lead;
        const existing = leads.find(
          (item) =>
            item.id === lead.id || item.source_url === lead.source_url
        );

        if (existing) {
          updateLead(existing.id, lead);
        } else {
          addLead(lead);
        }

        setSelectedLead(lead);
        setSheetOpen(true);
        void refreshLeads();

        toast.success(
          (alert.velocity_tier ?? alert.tier) === "HOT"
            ? "HOT thread workspace open — deploy your link plug"
            : "Workspace open — forge your stealth reply"
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not open alert workspace";
        toast.error(message);
      } finally {
        setIngestingAlertId(null);
      }
    },
    [
      addLead,
      ingestingAlertId,
      isScanning,
      leads,
      refreshLeads,
      updateLead,
    ]
  );

  const handleUpdateLead = useCallback(
    (id: string, patch: Partial<Lead>) => {
      updateLead(id, patch);
      setSelectedLead((prev) =>
        prev && prev.id === id ? { ...prev, ...patch } : prev
      );
    },
    [updateLead]
  );

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const alerts = useMemo(() => scanResult?.alerts ?? [], [scanResult]);
  const hotAlerts = useMemo(
    () => alerts.filter((a) => (a.velocity_tier ?? a.tier) === "HOT"),
    [alerts]
  );

  const showEmpty =
    !isLoading && !isScanning && dna !== null && alerts.length === 0;

  const scannedLabel =
    scanResult &&
    scanResult.scannedAt &&
    scanResult.scannedAt !== new Date(0).toISOString()
      ? new Date(scanResult.scannedAt).toLocaleString()
      : "—";

  return (
    <div className="space-y-6">
      {apiError ? (
        <ApiErrorBanner
          message={apiError}
          onDismiss={() => setApiError(null)}
          onRetry={() => void loadAlerts()}
        />
      ) : null}

      <div className="rounded-xl glass p-5">
        <p className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          <Flame className="size-3.5 text-primary" aria-hidden />
          Velocity Hub · Plug Radar
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Plug Alerts
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Platform algorithms down-rank posts containing external links. The
          Plug Radar monitors your thread velocity in real-time, flashing an
          alert only when your post hits peak momentum so you can safely drop
          your link.
        </p>
      </div>

      <section className="rounded-xl glass p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold tracking-tight text-foreground">
              Tracking List Terminal
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Click any thread card to ingest into your lead workspace and reply
              in the drawer.
            </p>
            {scanResult && !isLoading ? (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                tracking {scanResult.productName} · {scanResult.productUrl} ·
                last sync {scannedLabel}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            className="gap-2"
            disabled={isScanning || isLoading || !dna}
            onClick={() => void runScan()}
          >
            <Radar
              className={cn("size-4 shrink-0", isScanning && "animate-spin")}
              aria-hidden
            />
            {isScanning ? "Scanning..." : "Rescan Radar"}
          </Button>
        </div>

        {!dna ? (
          <div className="mt-6 rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center">
            <p className="text-xs text-muted-foreground">
              Product DNA required to run plug radar scans.
            </p>
            <Button asChild className="mt-4" size="sm" disabled={isScanning}>
              <Link href="/onboarding">Initialize vault</Link>
            </Button>
          </div>
        ) : (
          <div className="relative mt-6 min-h-[320px]">
            {isLoading ? <AlertsListSkeleton /> : null}

            {isScanning && !isLoading ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg glass-strong backdrop-blur-sm">
                <Loader2
                  className="size-8 animate-spin text-primary"
                  aria-hidden
                />
                <p className="text-sm font-medium text-foreground">
                  Scanning thread velocity streams...
                </p>
              </div>
            ) : null}

            {!isLoading && !isScanning && showEmpty ? (
              <EmptyState
                icon={Radio}
                title="Radar is Scanning..."
                description="Viral waves will appear here automatically."
                className="min-h-[280px]"
              />
            ) : null}

            {!isLoading && !isScanning && alerts.length > 0 ? (
              <div className="space-y-4">
                {alerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    copiedId={copiedId}
                    disabled={isScanning}
                    isIngesting={ingestingAlertId === alert.id}
                    onAlertClick={(item) => void handleAlertInteraction(item)}
                    onCopyPlug={(id, text) => void copyPlugText(id, text)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}

        {hotAlerts.length > 0 && !isScanning && !isLoading ? (
          <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-primary">
            {hotAlerts.length} thread{hotAlerts.length === 1 ? "" : "s"} at peak
            velocity — link-safe window open
          </p>
        ) : null}
      </section>

      <LeadSheet
        lead={selectedLead}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSelectedLead(null);
        }}
        onUpdateLead={handleUpdateLead}
      />
    </div>
  );
}
