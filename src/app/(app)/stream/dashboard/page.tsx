"use client";

import { Vault } from "lucide-react";

import { PipelineDashboard } from "@/components/dashboard/pipeline-dashboard";
import { ScanForLeadsButton } from "@/components/scan-for-leads-button";
import { Badge } from "@/components/ui/badge";
import { useSignalFlow } from "@/lib/signalflow-store";

export default function StreamDashboardPage() {
  const { leadBank } = useSignalFlow();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Active Leads
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chronological lead ledger — daily drops grouped by release date.
          </p>
          {leadBank.queuedCount > 0 ? (
            <Badge
              variant="outline"
              className="mt-3 gap-1.5 border-primary/25 bg-primary/10 font-mono text-xs text-foreground"
            >
              <Vault className="size-3 shrink-0 text-primary" aria-hidden />
              Lead Bank: {leadBank.queuedCount} lead
              {leadBank.queuedCount === 1 ? "" : "s"} queued for tomorrow
            </Badge>
          ) : null}
        </div>
        <ScanForLeadsButton className="shrink-0" />
      </div>

      <PipelineDashboard showHeader={false} />
    </div>
  );
}
