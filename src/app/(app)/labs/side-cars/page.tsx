"use client";

import { TierGatedTool } from "@/components/billing/tier-gated-tool";
import { SideCarsWorkspace } from "@/components/labs/side-cars-workspace";

export default function SideCarsPage() {
  return (
    <TierGatedTool minimumTier="growth_studio" moduleLabel="Side-Cars Lab">
      <SideCarsWorkspace />
    </TierGatedTool>
  );
}
