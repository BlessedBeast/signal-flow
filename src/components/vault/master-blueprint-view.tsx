"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Compass, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatFrameworkSlugLabel,
  resolveChosenFrameworkDetails,
} from "@/lib/onboard/blueprint-utils";
import type { CoreFrameworkRow, UserBlueprint } from "@/lib/onboard/blueprint-types";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

export function MasterBlueprintView() {
  const [blueprint, setBlueprint] = useState<UserBlueprint | null>(null);
  const [pillars, setPillars] = useState<CoreFrameworkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBlueprint = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setBlueprint(null);
        setPillars([]);
        return;
      }

      const [blueprintResult, frameworksResult] = await Promise.all([
        supabase
          .from("user_blueprints")
          .select(
            "id, user_id, chosen_frameworks, macro_rationale, target_audience_summary, created_at, updated_at"
          )
          .eq("user_id", session.user.id)
          .maybeSingle(),
        supabase.from("core_frameworks").select("*"),
      ]);

      if (blueprintResult.error) {
        throw new Error(blueprintResult.error.message);
      }

      const row = blueprintResult.data as UserBlueprint | null;
      setBlueprint(row);

      const catalog = (frameworksResult.data ?? [])
        .map((f) => {
          const slug =
            typeof f.slug === "string" ? f.slug : String(f.id ?? "");
          return {
            slug,
            name: typeof f.name === "string" ? f.name : slug,
            title: typeof f.title === "string" ? f.title : slug,
            description:
              typeof f.description === "string" ? f.description : "",
            primary_channels: Array.isArray(f.primary_channels)
              ? (f.primary_channels as string[])
              : [],
          } satisfies CoreFrameworkRow;
        })
        .filter((f) => f.slug);

      setPillars(row ? resolveChosenFrameworkDetails(row, catalog) : []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load blueprint";
      setError(message);
      setBlueprint(null);
      setPillars([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBlueprint();
  }, [loadBlueprint]);

  if (loading) {
    return (
      <div className="glass-strong flex min-h-[280px] items-center justify-center rounded-2xl">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="sr-only">Loading master blueprint</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-soft rounded-2xl border border-destructive/30 p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => void loadBlueprint()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="glass-strong flex min-h-[280px] flex-col items-center justify-center rounded-2xl px-8 py-12 text-center">
        <Compass className="size-10 text-muted-foreground/60" aria-hidden />
        <p className="mt-4 text-sm font-medium text-foreground">
          No master blueprint yet
        </p>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
          Complete vault onboarding to generate your north-star growth roadmap.
          Every subscription tier receives a full blueprint.
        </p>
        <Button asChild className="mt-6" size="lg">
          <Link href="/onboarding">Run onboarding</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass-strong rounded-2xl border border-primary/20 p-6 sm:p-8">
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
              Master Strategy Blueprint
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
              Your north star for daily execution
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Updated{" "}
              {new Date(blueprint.updated_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </section>

      <section className="glass rounded-2xl p-6 space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Chosen growth pillars
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {pillars.map((pillar) => (
            <article
              key={pillar.slug}
              className={cn(
                "glass-soft rounded-xl border border-border/50 p-4",
                "transition-colors hover:border-primary/25"
              )}
            >
              <Badge
                variant="outline"
                className="border-primary/25 bg-primary/10 font-mono text-[10px] text-foreground"
              >
                {pillar.slug}
              </Badge>
              <p className="mt-3 text-sm font-semibold text-foreground">
                {pillar.title}
              </p>
              {pillar.description ? (
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {pillar.description}
                </p>
              ) : null}
              {pillar.primary_channels.length > 0 ? (
                <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Channels: {pillar.primary_channels.join(" · ")}
                </p>
              ) : null}
            </article>
          ))}
          {pillars.length === 0
            ? blueprint.chosen_frameworks.map((slug) => (
                <article
                  key={slug}
                  className="glass-soft rounded-xl border border-border/50 p-4"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {formatFrameworkSlugLabel(slug)}
                  </p>
                </article>
              ))
            : null}
        </div>
      </section>

      <section className="glass rounded-2xl p-6 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Target audience
        </h3>
        <p className="text-sm leading-relaxed text-foreground">
          {blueprint.target_audience_summary}
        </p>
      </section>

      <section className="glass rounded-2xl p-6 space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Strategic rationale
        </h3>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          {blueprint.macro_rationale.split(/\n\n+/).map((paragraph, index) => (
            <p key={index} className="text-foreground/90">
              {paragraph.trim()}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
