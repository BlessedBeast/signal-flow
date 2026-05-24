"use client";

import { Radar } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/api-auth";
import { useSignalFlow } from "@/lib/signalflow-store";
import { cn } from "@/lib/utils";

/** Must match `src/app/api/miner/hunt/route.ts` */
const MINER_HUNT_API_PATH = "/api/miner/hunt";

type ScanForLeadsButtonProps = {
  size?: "default" | "sm" | "lg";
  className?: string;
  fullWidth?: boolean;
};

type HuntApiResponse = {
  ok?: boolean;
  inserted?: number;
  error?: string;
  step?: string | null;
};

export function ScanForLeadsButton({
  size = "default",
  className,
  fullWidth = false,
}: ScanForLeadsButtonProps) {
  const { profile, refreshLeads, refreshProfile } = useSignalFlow();
  const mining = profile.is_mining;

  async function handleScanForLeads() {
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) {
        toast.error("Sign in to scan for leads.");
        return;
      }

      let res: Response;
      try {
        res = await fetch(MINER_HUNT_API_PATH, {
          method: "POST",
          headers: {
            ...headers,
            Accept: "application/json",
          },
          cache: "no-store",
          credentials: "same-origin",
        });
      } catch (networkErr) {
        const message =
          networkErr instanceof Error
            ? networkErr.message
            : "Network request failed";
        toast.error(
          `Could not reach the miner API at ${MINER_HUNT_API_PATH}. Is the dev server running? (${message})`
        );
        return;
      }

      let json: HuntApiResponse;
      try {
        json = (await res.json()) as HuntApiResponse;
      } catch {
        toast.error(
          `Miner API returned a non-JSON response (${res.status}). Check server logs.`
        );
        return;
      }

      if (res.status === 409) {
        toast.message("Miner already running", {
          description: json.error ?? "A hunt is already in progress.",
        });
        await refreshProfile();
        return;
      }

      if (!res.ok || !json.ok) {
        toast.error(json.error ?? `Lead scan failed (${res.status})`);
        await refreshProfile();
        return;
      }

      const count = json.inserted ?? 0;
      if (count > 0) {
        toast.success(
          `Found ${count} new high-intent lead${count === 1 ? "" : "s"}`
        );
      } else {
        toast.message("Scan complete", {
          description: "No new leads matched this run.",
        });
      }

      await refreshLeads();
      await refreshProfile();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Lead scan failed";
      toast.error(message);
      await refreshProfile();
    }
  }

  return (
    <Button
      type="button"
      size={size}
      className={cn(
        "gap-2",
        fullWidth && "w-full",
        mining &&
          "glass-soft border-amber-500/20 bg-muted/40 text-muted-foreground shadow-none hover:bg-muted/40",
        className
      )}
      disabled={mining}
      onClick={() => void handleScanForLeads()}
    >
      {mining ? (
        <>
          <span className="relative flex size-2.5 shrink-0" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-80" />
            <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
          </span>
          <span className={cn(size === "sm" && "truncate text-xs")}>
            Miner Executing Loop...
          </span>
        </>
      ) : (
        <>
          <Radar
            className={cn("shrink-0", size === "sm" ? "size-3.5" : "size-4")}
            aria-hidden
          />
          Scan for Leads
        </>
      )}
    </Button>
  );
}
