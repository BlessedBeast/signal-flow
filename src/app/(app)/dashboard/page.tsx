"use client";

import { PipelineDashboard } from "@/components/dashboard/pipeline-dashboard";
import { ScanForLeadsButton } from "@/components/scan-for-leads-button";
import { useSignalFlow } from "@/lib/signalflow-store";

export default function DashboardPage() {
  const { leads } = useSignalFlow();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Pipeline
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live bounty board — {leads.length} lead
            {leads.length === 1 ? "" : "s"} from your vault.
          </p>
        </div>
        <ScanForLeadsButton className="shrink-0" />
      </div>

      <PipelineDashboard showHeader={false} />
    </div>
  );
}
