import type { CoreFrameworkRow, UserBlueprint } from "@/lib/onboard/blueprint-types";

export function formatFrameworkSlugLabel(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function resolveChosenFrameworkDetails(
  blueprint: UserBlueprint,
  catalog: CoreFrameworkRow[]
): CoreFrameworkRow[] {
  const bySlug = new Map(catalog.map((f) => [f.slug, f]));

  return blueprint.chosen_frameworks.map((slug) => {
    const match = bySlug.get(slug);
    if (match) return match;
    return {
      slug,
      name: formatFrameworkSlugLabel(slug),
      title: formatFrameworkSlugLabel(slug),
      description: "",
      primary_channels: [],
    };
  });
}

export function buildMasterBlueprintPromptBlock(
  blueprint: UserBlueprint,
  catalog: CoreFrameworkRow[]
): string {
  const pillars = resolveChosenFrameworkDetails(blueprint, catalog);

  const pillarBlock = pillars
    .map(
      (p, i) =>
        `[Pillar ${i + 1}] ${p.title} (slug: ${p.slug})
Channels: ${p.primary_channels.join(", ") || "see macro rationale"}
${p.description}`
    )
    .join("\n\n");

  return `MASTER STRATEGY BLUEPRINT (north star — daily tasks MUST align):
Chosen growth pillars (ONLY these — do not assign work outside these frameworks):
${pillarBlock}

Target audience:
${blueprint.target_audience_summary}

Macro rationale:
${blueprint.macro_rationale}

CHANNEL LOCK: Every task must map to a channel allowed by the chosen pillars above. Never suggest Reddit, X, HN, IH, or PH work unless that platform appears in a chosen pillar's primary_channels.`;
}
