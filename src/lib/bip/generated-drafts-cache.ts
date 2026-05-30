import { parseMediaDirectives } from "@/lib/parse-media-directives";

export type GeneratedDraftRow = {
  framework_slug: string;
  draft_text: string;
  media_directives: unknown;
  compiled_step: number | null;
};

export type PersistedBipDraft = {
  draft_text: string;
  media_directives: string[];
  compiled_step: number;
};

export { parseMediaDirectives };

export function rowsToDraftDictionary(
  rows: GeneratedDraftRow[]
): Record<string, PersistedBipDraft> {
  const out: Record<string, PersistedBipDraft> = {};

  for (const row of rows) {
    const slug = row.framework_slug?.trim();
    const draftText = row.draft_text?.trim();
    if (!slug || !draftText) continue;

    out[slug] = {
      draft_text: draftText,
      media_directives: parseMediaDirectives(row.media_directives),
      compiled_step:
        typeof row.compiled_step === "number" && row.compiled_step >= 1
          ? Math.floor(row.compiled_step)
          : 1,
    };
  }

  return out;
}
