import { NextResponse } from "next/server";
import { z } from "zod";

import { executeDailyReleaseForUser } from "@/lib/discovery/lead-bank";
import { executeLeadHunt } from "@/lib/mining/hunt-pipeline";
import { verifyQstashSignature } from "@/lib/qstash";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const payloadSchema = z.object({
  userId: z.string().uuid(),
});

function isStreakExpired(lastActionAt: string | null): boolean {
  if (!lastActionAt) return false;
  const timestamp = new Date(lastActionAt).getTime();
  if (Number.isNaN(timestamp)) return false;
  return Date.now() - timestamp > 48 * 60 * 60 * 1000;
}

export async function POST(request: Request) {
  try {
    const verifiedBody = await verifyQstashSignature(request);
    const parsed = payloadSchema.safeParse(JSON.parse(verifiedBody));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid worker payload" },
        { status: 400 }
      );
    }

    const { userId } = parsed.data;
    const { data: profile, error: profileError } = await supabaseServer
      .from("profiles")
      .select("is_mining, last_action_at")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) {
      return NextResponse.json(
        { ok: false, error: profileError.message },
        { status: 500 }
      );
    }
    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    if (isStreakExpired((profile.last_action_at as string | null) ?? null)) {
      const { error: streakError } = await supabaseServer
        .from("profiles")
        .update({ current_streak: 0 })
        .eq("id", userId);
      if (streakError) {
        console.warn(
          `[DISCOVERY WORKER] Failed to reset streak for ${userId}:`,
          streakError.message
        );
      }
    }

    if (profile.is_mining) {
      return NextResponse.json(
        { ok: true, userId, skipped: true, reason: "mining lock active" },
        { status: 200 }
      );
    }

    try {
      const hunt = await executeLeadHunt(userId);
      return NextResponse.json(
        {
          ok: true,
          userId,
          released: hunt.released,
          queued: hunt.queued,
        },
        { status: 200 }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Hunt failed";
      console.error(`[DISCOVERY WORKER] Hunt failed for ${userId}:`, message);
      const release = await executeDailyReleaseForUser(userId);
      return NextResponse.json(
        {
          ok: true,
          userId,
          released: release.released,
          queued: 0,
          fallback: true,
          error: message,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Worker execution failed";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

