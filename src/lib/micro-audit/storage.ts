import type { PendingMicroAuditPayload } from "@/lib/micro-audit/types";
import {
  MICRO_AUDIT_STORAGE_KEY,
  SIGNUP_TIER_STORAGE_KEY,
} from "@/lib/micro-audit/types";

export function savePendingMicroAudit(payload: PendingMicroAuditPayload): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(MICRO_AUDIT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota or private mode */
  }
}

export function readPendingMicroAudit(): PendingMicroAuditPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(MICRO_AUDIT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingMicroAuditPayload;
  } catch {
    return null;
  }
}

export function clearPendingMicroAudit(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(MICRO_AUDIT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function saveSignupTierPreference(tier: "hobbyist"): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SIGNUP_TIER_STORAGE_KEY, tier);
  } catch {
    /* ignore */
  }
}

export function readSignupTierPreference(): "hobbyist" | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SIGNUP_TIER_STORAGE_KEY);
    return raw === "hobbyist" ? "hobbyist" : null;
  } catch {
    return null;
  }
}

export function clearSignupTierPreference(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SIGNUP_TIER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Signup URL preserving micro-audit session handoff query flags */
export function buildMicroAuditSignupHref(options?: {
  tier?: "hobbyist";
}): string {
  const params = new URLSearchParams({ from: "micro-audit" });
  if (options?.tier === "hobbyist") {
    params.set("tier", "hobbyist");
  }
  return `/signup?${params.toString()}`;
}

export function persistMicroAuditHandoff(
  payload: PendingMicroAuditPayload,
  options?: { signupTier?: "hobbyist" }
): void {
  savePendingMicroAudit({
    ...payload,
    ...(options?.signupTier ? { signupTier: options.signupTier } : {}),
  });
  if (options?.signupTier === "hobbyist") {
    saveSignupTierPreference("hobbyist");
  }
}
