/** Resolve playbook slugs stored on profile.persona_context (snake or camel). */
/**
 * Sole source of truth for active playbook slugs (profiles.persona_context).
 * `user_blueprints` is an async historical log and must not drive BIP UI or generation.
 */
export function resolveFrameworkSlugsFromPersonaContext(
  context: Record<string, unknown> | null
): string[] {
  if (!context) return [];
  const raw =
    (Array.isArray(context.selected_frameworks)
      ? context.selected_frameworks
      : Array.isArray(context.selectedFrameworks)
        ? context.selectedFrameworks
        : null) ?? [];
  return raw
    .filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    )
    .map((slug) => slug.trim());
}

export function isFrameworkSlugInPersonaContext(
  context: Record<string, unknown> | null,
  frameworkSlug: string
): boolean {
  const normalized = frameworkSlug.trim();
  if (!normalized) return false;
  return resolveFrameworkSlugsFromPersonaContext(context).includes(normalized);
}

export function formatFrameworkSlugLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
