"use client";

import { TierGatedTool } from "@/components/billing/tier-gated-tool";
import { BipWorkspace } from "@/components/velocity/bip-workspace";

export default function VelocityBipPage() {
  return (
    <TierGatedTool minimumTier="indie_builder" moduleLabel="BIP Storyteller">
      <BipWorkspace />
    </TierGatedTool>
  );
}
