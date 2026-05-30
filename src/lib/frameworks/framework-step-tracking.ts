export type FrameworkStepTracking = Record<string, number>;

/** Parse profiles.framework_step_tracking JSONB into slug → positive integer steps. */
export function parseFrameworkStepTracking(raw: unknown): FrameworkStepTracking {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const out: FrameworkStepTracking = {};
  for (const [slug, value] of Object.entries(raw)) {
    if (!slug.trim()) continue;
    const parsed =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value)
          : NaN;
    if (Number.isFinite(parsed) && parsed >= 1) {
      out[slug.trim()] = Math.floor(parsed);
    }
  }
  return out;
}

/** Next step to compile for a playbook; defaults to 1 when slug is absent. */
export function getPlaybookStep(
  tracking: FrameworkStepTracking,
  frameworkSlug: string
): number {
  const step = tracking[frameworkSlug.trim()];
  if (typeof step === "number" && step >= 1) {
    return Math.floor(step);
  }
  return 1;
}

export function incrementPlaybookStep(
  tracking: FrameworkStepTracking,
  frameworkSlug: string
): FrameworkStepTracking {
  const slug = frameworkSlug.trim();
  const current = getPlaybookStep(tracking, slug);
  return { ...tracking, [slug]: current + 1 };
}
