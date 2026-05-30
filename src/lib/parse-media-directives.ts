/**
 * Normalizes `media_directives` from Supabase JSONB (array, stringified JSON, or null).
 */
export function parseMediaDirectives(raw: unknown): string[] {
  if (raw == null) return [];

  let value: unknown = raw;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed) as unknown;
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}
