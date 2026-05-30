import { NextResponse } from "next/server";

import { authenticateRouteHandler } from "@/lib/supabase-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function daysBetweenUtc(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const utcB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((utcA - utcB) / 86_400_000);
}

export async function POST(request: Request) {
  try {
    const auth = await authenticateRouteHandler(request);
    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { data, error } = await auth.supabase
      .from("profiles")
      .select("current_streak, longest_streak, last_action_at")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const now = new Date();
    const current = Number(data?.current_streak ?? 0);
    const longest = Number(data?.longest_streak ?? 0);
    const lastActionAt =
      typeof data?.last_action_at === "string"
        ? new Date(data.last_action_at)
        : null;

    let nextCurrent = current;
    if (!lastActionAt) {
      nextCurrent = 1;
    } else {
      const dayGap = daysBetweenUtc(now, lastActionAt);
      const elapsedMs = now.getTime() - lastActionAt.getTime();

      if (dayGap === 0) {
        nextCurrent = current;
      } else if (dayGap === 1) {
        nextCurrent = current + 1;
      } else if (elapsedMs > 48 * 60 * 60 * 1000) {
        nextCurrent = 0;
      }
    }

    const nextLongest = Math.max(longest, nextCurrent);
    const patch = {
      current_streak: nextCurrent,
      longest_streak: nextLongest,
      last_action_at: now.toISOString(),
    };

    const { error: updateError } = await auth.supabase
      .from("profiles")
      .update(patch)
      .eq("id", auth.user.id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: patch,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update streak";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
