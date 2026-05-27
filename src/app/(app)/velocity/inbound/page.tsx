"use client";

import { TierGatedTool } from "@/components/billing/tier-gated-tool";
import { InboundWorkspace } from "@/components/velocity/inbound-workspace";

export default function InboundReplierPage() {
  return (
    <TierGatedTool minimumTier="growth_studio" moduleLabel="1-Click Inbound Replier">
      <InboundWorkspace />
    </TierGatedTool>
  );
}
