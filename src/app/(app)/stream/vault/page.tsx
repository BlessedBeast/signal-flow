import { Suspense } from "react";

import { VaultWorkspace } from "@/components/vault/vault-workspace";

export default function ProductDnaVaultPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl glass p-8 text-center text-sm text-muted-foreground">
          Loading vault…
        </div>
      }
    >
      <VaultWorkspace />
    </Suspense>
  );
}
