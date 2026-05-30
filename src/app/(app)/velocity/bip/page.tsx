"use client";

import { TierGatedTool } from "@/components/billing/tier-gated-tool";
import { BuildInPublicWorkspace } from "@/components/dashboard/build-in-public-workspace";

export default function VelocityBipPage() {
  return (
    <TierGatedTool minimumTier="founder" moduleLabel="BIP Storyteller">
      <BuildInPublicWorkspace />
    </TierGatedTool>
  );
}
