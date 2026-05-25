"use client";

import { useState } from "react";
import Link from "next/link";

import { ListCard } from "@/components/vault/list-card";
import {
  joinAudienceChips,
  parseAudienceChips,
} from "@/components/vault/vault-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Platform, ProductDNA } from "@/lib/signalflow-types";
import { cn } from "@/lib/utils";

const PLATFORM_LABELS: Record<Platform, string> = {
  reddit: "Reddit",
  x: "X",
  hackernews: "Hacker News",
  indiehackers: "Indie Hackers",
  producthunt: "Product Hunt",
};

type VaultCoreDnaTabProps = {
  draft: ProductDNA;
  updateDna: (patch: Partial<ProductDNA>) => void;
  onSave: () => Promise<boolean>;
  saving: boolean;
};

export function VaultCoreDnaTab({
  draft,
  updateDna,
  onSave,
  saving,
}: VaultCoreDnaTabProps) {
  const [audienceInput, setAudienceInput] = useState("");
  const [painInput, setPainInput] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [platformInput, setPlatformInput] = useState("");

  const audienceChips = parseAudienceChips(draft.audience);

  function addAudience() {
    const value = audienceInput.trim();
    if (!value || audienceChips.includes(value)) {
      setAudienceInput("");
      return;
    }
    updateDna({ audience: joinAudienceChips([...audienceChips, value]) });
    setAudienceInput("");
  }

  function removeAudience(index: number) {
    const next = [...audienceChips];
    next.splice(index, 1);
    updateDna({ audience: joinAudienceChips(next) });
  }

  function addPainPoint() {
    const value = painInput.trim();
    if (!value || draft.painPoints.includes(value)) {
      setPainInput("");
      return;
    }
    updateDna({ painPoints: [...draft.painPoints, value] });
    setPainInput("");
  }

  function addQuery() {
    const value = queryInput.trim();
    if (!value) return;
    updateDna({ activeSerperQueries: [...draft.activeSerperQueries, value] });
    setQueryInput("");
  }

  function togglePlatform(platform: Platform) {
    const has = draft.targetPlatforms.includes(platform);
    updateDna({
      targetPlatforms: has
        ? draft.targetPlatforms.filter((p) => p !== platform)
        : [...draft.targetPlatforms, platform],
    });
  }

  function addPlatformFromInput() {
    const value = platformInput.trim().toLowerCase();
    if (!value) return;
    const map: Record<string, Platform> = {
      reddit: "reddit",
      x: "x",
      twitter: "x",
      hackernews: "hackernews",
      hn: "hackernews",
      indiehackers: "indiehackers",
      ih: "indiehackers",
      producthunt: "producthunt",
      ph: "producthunt",
    };
    const platform = map[value];
    if (platform && !draft.targetPlatforms.includes(platform)) {
      updateDna({ targetPlatforms: [...draft.targetPlatforms, platform] });
    }
    setPlatformInput("");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl glass p-5 space-y-4">
        <div>
          <h3 className="font-semibold tracking-tight text-foreground">
            Product identity
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Core brand signals mined from your site DNA.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Product name</Label>
            <Input
              value={draft.productName}
              onChange={(e) => updateDna({ productName: e.target.value })}
              disabled={saving}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">URL</Label>
            <Input
              value={draft.url}
              onChange={(e) => updateDna({ url: e.target.value })}
              disabled={saving}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">One-liner</Label>
          <Textarea
            value={draft.oneLiner}
            onChange={(e) => updateDna({ oneLiner: e.target.value })}
            disabled={saving}
            className="min-h-[88px] resize-y text-sm leading-relaxed"
          />
        </div>
      </section>

      <ListCard
        title="Ideal customer segments"
        description="Audience chips power intent scoring and reply tone."
        items={audienceChips}
        inputValue={audienceInput}
        onInputChange={setAudienceInput}
        onAdd={addAudience}
        onRemove={removeAudience}
        placeholder="e.g. B2B SaaS founders"
        emptyMessage="No audience segments — add ICP targets."
        disabled={saving}
      />

      <ListCard
        title="Pain points"
        description="Problems your product solves — used in hunt scoring."
        items={draft.painPoints}
        inputValue={painInput}
        onInputChange={setPainInput}
        onAdd={addPainPoint}
        onRemove={(index) =>
          updateDna({
            painPoints: draft.painPoints.filter((_, i) => i !== index),
          })
        }
        placeholder="Add a pain point"
        disabled={saving}
      />

      <section className="rounded-xl glass p-5 space-y-4">
        <div>
          <h3 className="font-semibold tracking-tight text-foreground">
            Target platforms
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Surfaces included in adaptive miner passes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PLATFORM_LABELS) as Platform[]).map((platform) => {
            const active = draft.targetPlatforms.includes(platform);
            return (
              <button
                key={platform}
                type="button"
                disabled={saving}
                onClick={() => togglePlatform(platform)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "border-primary/30 bg-primary/10 text-foreground"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                )}
              >
                {PLATFORM_LABELS[platform]}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Input
            value={platformInput}
            onChange={(e) => setPlatformInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addPlatformFromInput();
              }
            }}
            placeholder="Add platform (reddit, x, hn)"
            disabled={saving}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0"
            disabled={saving}
            onClick={addPlatformFromInput}
          >
            Add
          </Button>
        </div>
      </section>

      <ListCard
        title="Active Serper operators"
        description="Proximity-based dorks — parenthetical OR clusters, no exact quotes."
        items={draft.activeSerperQueries}
        inputValue={queryInput}
        onInputChange={setQueryInput}
        onAdd={addQuery}
        onRemove={(index) =>
          updateDna({
            activeSerperQueries: draft.activeSerperQueries.filter(
              (_, i) => i !== index
            ),
          })
        }
        placeholder="site:reddit.com (validate OR validation) (startup OR idea)"
        emptyMessage="No Serper operators — add hunt dorks."
        monoItems
        disabled={saving}
      />

      <div className="flex flex-wrap justify-end gap-3 border-t border-border/40 pt-5">
        <Button asChild variant="outline" disabled={saving}>
          <Link href="/onboarding">Re-run site analysis</Link>
        </Button>
        <Button
          type="button"
          disabled={saving}
          onClick={() => void onSave()}
        >
          {saving ? "Saving…" : "Save Core DNA"}
        </Button>
      </div>
    </div>
  );
}
