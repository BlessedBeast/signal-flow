"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Database, Dna } from "lucide-react";
import { toast } from "sonner";

import { VaultBattlecardsTab } from "@/components/vault/vault-battlecards-tab";
import { VaultCoreDnaTab } from "@/components/vault/vault-core-dna-tab";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { normalizeVaultDnaPayload } from "@/lib/product-dna-schema";
import type { ProductDNA } from "@/lib/signalflow-types";
import { useSignalFlow } from "@/lib/signalflow-store";

export function VaultWorkspace() {
  const searchParams = useSearchParams();
  const { profile, persistProductDna } = useSignalFlow();
  const productDna = profile.product_dna;

  const defaultTab =
    searchParams.get("tab") === "battlecards" ? "battlecards" : "core";

  const [draft, setDraft] = useState<ProductDNA | null>(productDna);
  const [battlecards, setBattlecards] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (productDna) {
      setDraft(productDna);
    }
  }, [productDna]);

  useEffect(() => {
    const competitors = draft?.competitors ?? [];
    setBattlecards((prev) => {
      const merged = { ...profile.competitor_battlecards };
      for (const name of competitors) {
        if (!(name in merged)) {
          merged[name] = prev[name] ?? "";
        }
      }
      for (const key of Object.keys(merged)) {
        if (!competitors.includes(key)) {
          delete merged[key];
        }
      }
      return merged;
    });
  }, [draft?.competitors, profile.competitor_battlecards]);

  const updateDna = useCallback((patch: Partial<ProductDNA>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const handleBattlecardChange = useCallback((name: string, value: string) => {
    setBattlecards((prev) => ({ ...prev, [name]: value }));
  }, []);

  async function saveCoreDna(): Promise<boolean> {
    if (!draft) return false;
    setSaving(true);
    const normalized = normalizeVaultDnaPayload(draft);
    const ok = await persistProductDna(normalized);
    setSaving(false);
    if (ok) {
      setDraft(normalized);
      toast.success("Core DNA saved to vault");
    } else {
      toast.error("Failed to save Core DNA");
    }
    return ok;
  }

  async function saveBattlecards(): Promise<boolean> {
    if (!draft) {
      toast.error("Complete Product DNA onboarding before saving battlecards.");
      return false;
    }

    setSaving(true);
    const normalized = normalizeVaultDnaPayload(draft);
    const trimmed: Record<string, string> = {};
    for (const name of normalized.competitors) {
      trimmed[name] = (battlecards[name] ?? "").trim();
    }

    const ok = await persistProductDna(normalized, { battlecards: trimmed });
    setSaving(false);
    if (ok) setDraft(normalized);
    return ok;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl glass p-5">
        <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <Database className="size-3.5 text-primary" aria-hidden />
          Discovery Stream · Product DNA Vault
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Signal vault
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Your extracted product identity, competitive battlecards, and platform
          dorks — secured for mining and reply pipelines.
        </p>
      </div>

      {!draft ? (
        <div className="rounded-xl glass p-12 text-center">
          <Dna className="mx-auto size-10 text-muted-foreground/60" aria-hidden />
          <p className="mt-4 text-sm text-muted-foreground">
            No Product DNA in vault yet. Run onboarding to extract your site DNA.
          </p>
          <Button asChild className="mt-6" size="lg">
            <Link href="/onboarding">Initialize vault</Link>
          </Button>
        </div>
      ) : (
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="glass h-auto w-full flex-wrap justify-start gap-1 p-1.5">
            <TabsTrigger value="core" className="gap-1.5 px-4 py-2">
              🧬 Core DNA Profile
            </TabsTrigger>
            <TabsTrigger value="battlecards" className="gap-1.5 px-4 py-2">
              ⚔️ Competitive Battlecards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="core" className="mt-6">
            <VaultCoreDnaTab
              draft={draft}
              updateDna={updateDna}
              onSave={saveCoreDna}
              saving={saving}
            />
          </TabsContent>

          <TabsContent value="battlecards" className="mt-6">
            <VaultBattlecardsTab
              draft={draft}
              battlecards={battlecards}
              updateDna={updateDna}
              onBattlecardChange={handleBattlecardChange}
              onSave={saveBattlecards}
              saving={saving}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
