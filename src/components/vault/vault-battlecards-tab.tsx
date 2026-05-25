"use client";

import { useMemo, useState } from "react";
import { Crosshair, Radio } from "lucide-react";
import { toast } from "sonner";

import { ListCard } from "@/components/vault/list-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProductDNA } from "@/lib/signalflow-types";
import { cn } from "@/lib/utils";

type VaultBattlecardsTabProps = {
  draft: ProductDNA;
  battlecards: Record<string, string>;
  updateDna: (patch: Partial<ProductDNA>) => void;
  onBattlecardChange: (name: string, value: string) => void;
  onSave: () => Promise<boolean>;
  saving: boolean;
};

export function VaultBattlecardsTab({
  draft,
  battlecards,
  updateDna,
  onBattlecardChange,
  onSave,
  saving,
}: VaultBattlecardsTabProps) {
  const [competitorInput, setCompetitorInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  const competitors = draft.competitors;

  const cardGrid = useMemo(
    () =>
      competitors.map((name) => (
        <article
          key={name}
          className="rounded-xl glass p-5 flex flex-col gap-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold tracking-tight text-foreground">
                {name}
              </h3>
              <span className="mt-2 inline-flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-secondary-foreground">
                  <Radio className="size-3 shrink-0" aria-hidden />
                  Active monitoring
                </span>
              </span>
            </div>
            <Crosshair
              className="size-5 shrink-0 text-primary/60"
              aria-hidden
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor={`battlecard-${name}`}
              className="text-xs text-muted-foreground"
            >
              Counter-pitch battlecard
            </Label>
            <Textarea
              id={`battlecard-${name}`}
              value={battlecards[name] ?? ""}
              onChange={(e) => onBattlecardChange(name, e.target.value)}
              placeholder={`How you win against ${name} — positioning, objections, proof points…`}
              className="min-h-[120px] resize-y text-sm leading-relaxed"
              disabled={saving}
            />
          </div>
        </article>
      )),
    [competitors, battlecards, onBattlecardChange, saving]
  );

  function addCompetitor() {
    const value = competitorInput.trim();
    if (!value || competitors.includes(value)) {
      setCompetitorInput("");
      return;
    }
    updateDna({ competitors: [...competitors, value] });
    onBattlecardChange(value, "");
    setCompetitorInput("");
  }

  function removeCompetitor(index: number) {
    const name = competitors[index];
    if (!name) return;
    updateDna({
      competitors: competitors.filter((_, i) => i !== index),
    });
    onBattlecardChange(name, "");
  }

  function addKeyword() {
    const value = keywordInput.trim();
    if (!value || draft.keywords.includes(value)) {
      setKeywordInput("");
      return;
    }
    updateDna({ keywords: [...draft.keywords, value] });
    setKeywordInput("");
  }

  async function handleSave() {
    const ok = await onSave();
    if (ok) {
      toast.success("Battlecards and competitive assets saved to vault");
    } else {
      toast.error("Failed to save battlecards");
    }
  }

  return (
    <div className="space-y-5">
      <ListCard
        title="Tracked competitors"
        description="Brands your prospects compare against — each unlocks a battlecard."
        items={competitors}
        inputValue={competitorInput}
        onInputChange={setCompetitorInput}
        onAdd={addCompetitor}
        onRemove={removeCompetitor}
        placeholder="e.g. Linear"
        emptyMessage="No competitors — add brands from your competitive set."
        disabled={saving}
      />

      <ListCard
        title="Alternative keyword assets"
        description="Intent phrases for flank positioning and Serper expansion."
        items={draft.keywords}
        inputValue={keywordInput}
        onInputChange={setKeywordInput}
        onAdd={addKeyword}
        onRemove={(index) =>
          updateDna({
            keywords: draft.keywords.filter((_, i) => i !== index),
          })
        }
        placeholder="e.g. intent signals"
        emptyMessage="No keywords — add alternative intent phrases."
        disabled={saving}
      />

      {competitors.length === 0 ? (
        <div className="rounded-xl glass p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Add at least one competitor above to author counter-pitch battlecards.
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-5 sm:grid-cols-2",
            competitors.length === 1 && "max-w-xl"
          )}
        >
          {cardGrid}
        </div>
      )}

      <div className="flex justify-end border-t border-border/40 pt-5">
        <Button
          type="button"
          size="lg"
          className="gap-2 px-8"
          disabled={saving || competitors.length === 0}
          onClick={() => void handleSave()}
        >
          {saving ? "Saving battlecards…" : "Update Battlecards"}
        </Button>
      </div>
    </div>
  );
}
