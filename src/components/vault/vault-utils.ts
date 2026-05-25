export function parseAudienceChips(audience: string): string[] {
  if (!audience.trim()) return [];
  return audience
    .split(/[,;]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinAudienceChips(chips: string[]): string {
  return chips.join(", ");
}
