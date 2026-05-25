"use client";

import type { ReactNode } from "react";

import { SignalFlowProvider } from "@/lib/signalflow-store";

export function AppProviders({ children }: { children: ReactNode }) {
  return <SignalFlowProvider>{children}</SignalFlowProvider>;
}
