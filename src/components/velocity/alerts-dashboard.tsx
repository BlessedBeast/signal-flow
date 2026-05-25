"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Flame,
  Loader2,
  Radar,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

import { IntentBadge, PlatformBadge } from "@/components/badges";
import { LeadSheet } from "@/components/lead-sheet";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/api-auth";
import { useSignalFlow } from "@/lib/signalflow-store";
import type { Lead } from "@/lib/signalflow-types";
import type { PlugAlert, PlugAlertsResult } from "@/lib/velocity/alerts-pipeline";
import { cn } from "@/lib/utils";

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
  const isHot = alert.tier === "HOT";
  const isCopied = copiedId === alert.id;
  const isWarmOrCold = alert.tier === "WARM" || alert.tier === "COLD";

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
          <IntentBadge tier={alert.tier} />
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {alert.velocityScore}
          </span>
          {isIngesting ? (
            <Loader2
              className="size-3.5 animate-spin text-primary"
              aria-hidden
            />
          ) : null}
        </div>
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {alert.statusIndicator}
        </p>
      </div>

      <blockquote className="rounded-lg border border-border/50 bg-muted/30 px-3 py-3 text-sm leading-relaxed text-foreground">
        {alert.postSnippet}
      </blockquote>

      <p className="font-mono text-[10px] text-muted-foreground">
        {alert.engagement.likes} likes · {alert.engagement.shares} shares ·{" "}
        {alert.engagement.comments} comments · {alert.engagement.minutesSincePost}
        m elapsed
      </p>

      {isWarmOrCold ? (
        <p className="font-mono text-[10px] uppercase tracking-wider text-primary/90">
          Click to open workspace and forge custom stealth reply
        </p>
      ) : null}

      {isHot && alert.plugText ? (
        <div
          className="relative space-y-3 rounded-lg border border-primary/40 bg-primary/10 p-4"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary">
            deploy window open
          </p>
          <p className="text-sm leading-relaxed text-foreground">
            {alert.plugText}
          </p>
          <Button
            type="button"
            className="gap-2"
            size="sm"
            disabled={disabled || isIngesting}
            onClick={(e) => {
              e.stopPropagation();
              onCopyPlug(alert.id, alert.plugText!);
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
  const [isScanning, setIsScanning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasAutoScanned, setHasAutoScanned] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [ingestingAlertId, setIngestingAlertId] = useState<string | null>(null);

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

  const runScan = useCallback(async () => {
    if (isScanning) return;

    if (!dna) {
      toast.error("Complete Product DNA onboarding before running plug radar.");
      return;
    }

    setIsScanning(true);
    toast.info("Scanning thread velocity streams...");

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/velocity/alerts", {
        method: "POST",
        headers,
      });

      const json = (await res.json()) as {
        ok?: boolean;
        data?: PlugAlertsResult;
        error?: string;
        step?: string;
      };

      if (json.step === "onboarding-required") {
        toast.error(
          json.error ?? "Product DNA required — complete onboarding first."
        );
        return;
      }

      if (!res.ok || !json.ok || !json.data) {
        toast.error(json.error ?? "Plug radar scan failed");
        return;
      }

      setScanResult(json.data);
      const hotCount = json.data.alerts.filter((a) => a.tier === "HOT").length;
      toast.success(
        hotCount > 0
          ? `${hotCount} HOT alert${hotCount === 1 ? "" : "s"} — deploy links now`
          : `Scan complete — ${json.data.alerts.length} threads monitored`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unexpected radar scan error";
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

        const res = await fetch("/api/leads/ingest-alert", {
          method: "POST",
          headers,
          body: JSON.stringify({
            content: alert.postSnippet,
            platform: alert.platform,
            source_url: alert.source_url,
            author: alert.author,
            intent_score: alert.velocityScore,
            tier: alert.tier,
            plugText: alert.plugText,
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
          alert.tier === "HOT"
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
    if (dna && !hasAutoScanned && !scanResult) {
      setHasAutoScanned(true);
      void runScan();
    }
  }, [dna, hasAutoScanned, scanResult, runScan]);

  const alerts = scanResult?.alerts ?? [];
  const hotAlerts = useMemo(
    () => alerts.filter((a) => a.tier === "HOT"),
    [alerts]
  );

  return (
    <div className="space-y-6">
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
            {scanResult ? (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                tracking {scanResult.productName} · {scanResult.productUrl} ·
                scanned {new Date(scanResult.scannedAt).toLocaleTimeString()}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            className="gap-2"
            disabled={isScanning || !dna}
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
          <div className="relative mt-6 min-h-[320px] space-y-4">
            {isScanning ? (
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

            {!isScanning && alerts.length === 0 ? (
              <EmptyState
                icon={Radio}
                title="Radar is Scanning..."
                description="We are calculating velocity on thousands of threads. Viral waves will appear here automatically."
                className="min-h-[280px]"
              />
            ) : (
              alerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  copiedId={copiedId}
                  disabled={isScanning}
                  isIngesting={ingestingAlertId === alert.id}
                  onAlertClick={(item) => void handleAlertInteraction(item)}
                  onCopyPlug={(id, text) => void copyPlugText(id, text)}
                />
              ))
            )}
          </div>
        )}

        {hotAlerts.length > 0 && !isScanning ? (
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
