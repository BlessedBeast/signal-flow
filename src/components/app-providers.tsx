"use client";

import type { ReactNode } from "react";

import { IntelligenceBriefingProvider } from "@/components/intelligence-briefing-provider";
import { SignalFlowProvider } from "@/lib/signalflow-store";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SignalFlowProvider>
      <IntelligenceBriefingProvider>{children}</IntelligenceBriefingProvider>
    </SignalFlowProvider>
  );
}
