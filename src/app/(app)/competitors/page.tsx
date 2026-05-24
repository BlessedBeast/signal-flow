"use client";

import { useEffect, useMemo, useState } from "react";
import { Crosshair, Radio } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSignalFlow } from "@/lib/signalflow-store";
import { cn } from "@/lib/utils";

export default function CompetitorsPage() {
  const { profile, persistProductDna } = useSignalFlow();
  const productDna = profile.product_dna;
  const competitors = useMemo(
    () => productDna?.competitors ?? [],
    [productDna?.competitors]
  );

  const [battlecards, setBattlecards] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
  }, [competitors, profile.competitor_battlecards]);

  const hasDna = Boolean(productDna);

  const cardGrid = useMemo(
    () =>
      competitors.map((name) => (
        <article
          key={name}
          className="glass-soft flex flex-col gap-4 rounded-2xl border border-border/50 p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                {name}
              </h3>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                <Radio className="size-3 shrink-0" aria-hidden />
                Active Stream Monitoring
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
              className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
            >
              Counter-Pitch Battlecard Insights
            </Label>
            <Textarea
              id={`battlecard-${name}`}
              value={battlecards[name] ?? ""}
              onChange={(e) =>
                setBattlecards((prev) => ({
                  ...prev,
                  [name]: e.target.value,
                }))
              }
              placeholder={`How you win against ${name} — positioning, objections, proof points…`}
              className="min-h-[120px] resize-none glass border-0 text-sm leading-relaxed"
              disabled={saving}
            />
          </div>
        </article>
      )),
    [competitors, battlecards, saving]
  );

  async function handleUpdateBattlecards() {
    if (!productDna) {
      toast.error("Complete Product DNA onboarding before saving battlecards.");
      return;
    }

    setSaving(true);
    const trimmed: Record<string, string> = {};
    for (const name of competitors) {
      trimmed[name] = (battlecards[name] ?? "").trim();
    }

    const ok = await persistProductDna(productDna, {
      battlecards: trimmed,
    });
    setSaving(false);

    if (!ok) {
      toast.error("Failed to save battlecards to vault");
      return;
    }

    toast.success("Battlecards secured in your profile vault");
  }

  return (
    <div className="space-y-8">
      <div className="glass rounded-2xl px-6 py-5">
        <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <Crosshair className="size-3.5 text-primary" aria-hidden />
          Competitive intelligence
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Competitor workspace
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          Battlecards sync to your profile vault and inform counter-positioning
          during live intent hunts.
        </p>
      </div>

      {!hasDna ? (
        <div className="glass-soft rounded-2xl px-8 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No Product DNA in vault yet. Run onboarding to extract competitor
            brands from your site.
          </p>
        </div>
      ) : competitors.length === 0 ? (
        <div className="glass-soft rounded-2xl px-8 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No competitors listed in your Product DNA. Add brands during verify
            or re-run site analysis.
          </p>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "grid gap-5 sm:grid-cols-2",
              competitors.length === 1 && "max-w-xl"
            )}
          >
            {cardGrid}
          </div>

          <div className="flex justify-end border-t border-border/40 pt-6">
            <Button
              type="button"
              size="lg"
              className="gap-2 px-8"
              disabled={saving}
              onClick={() => void handleUpdateBattlecards()}
            >
              {saving ? "Saving battlecards…" : "Update Battlecards"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
