import { NextResponse } from "next/server";

import {
  SubscriptionTierError,
  requireOneClickReplyAccess,
} from "@/lib/billing/user-billing";
import {
  executeReplyGeneration,
  parseReplyBody,
  ReplyError,
} from "@/lib/leads/reply-pipeline";
import {
  createRouteHandlerSupabase,
  resolveRouteHandlerUserId,
} from "@/lib/supabase-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function daysBetweenUtc(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const utcB = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((utcA - utcB) / 86_400_000);
}

async function incrementRetentionStreak(supabase: Awaited<ReturnType<typeof createRouteHandlerSupabase>>, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("current_streak, longest_streak, last_action_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) return;

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
    if (dayGap === 1) {
      nextCurrent = current + 1;
    } else if (dayGap > 1 && elapsedMs > 48 * 60 * 60 * 1000) {
      nextCurrent = 0;
    }
  }

  const nextLongest = Math.max(longest, nextCurrent);
  await supabase
    .from("profiles")
    .update({
      current_streak: nextCurrent,
      longest_streak: nextLongest,
      last_action_at: now.toISOString(),
    })
    .eq("id", userId);
}

type ReplyErrorResponse = {
  ok: false;
  error: string;
  step: string | null;
};

export async function POST(request: Request) {
  console.log("[REPLY TRACE] ===== Reply draft pipeline started =====");
  console.log("[REPLY TRACE] Incoming POST /api/leads/reply");

  try {
    console.log("[REPLY TRACE] Checkpoint 1: Auth Verification");
    const supabase = await createRouteHandlerSupabase(request);
    const userId = await resolveRouteHandlerUserId(request, supabase);
    console.log("[REPLY TRACE] User session validation check:", userId);

    if (!userId) {
      console.error(
        "[REPLY TRACE] Authentication failed: no valid session for reply request"
      );
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required",
          step: "auth",
        } satisfies ReplyErrorResponse,
        { status: 401 }
      );
    }

    await requireOneClickReplyAccess(supabase, userId);

    let body: unknown;
    try {
      body = await request.json();
      console.log("[REPLY TRACE] Request body parsed:", body);
    } catch (parseErr) {
      console.error("[REPLY TRACE] Request body JSON parse failed:", parseErr);
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid JSON body",
          step: "body",
        } satisfies ReplyErrorResponse,
        { status: 400 }
      );
    }

    const { leadId, prospectResponse } = parseReplyBody(body);
    console.log("[REPLY TRACE] Checkpoint 2: Lead Data Retrieval — leadId:", leadId);
    if (prospectResponse) {
      console.log(
        "[REPLY TRACE] Follow-up prospectResponse length:",
        prospectResponse.length
      );
    }

    const result = await executeReplyGeneration(
      userId,
      leadId,
      prospectResponse
    );
    await incrementRetentionStreak(supabase, userId);

    console.log(
      "[REPLY TRACE] ===== Reply draft pipeline completed successfully ====="
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(
      "[REPLY TRACE] Fatal exception encountered during execution:",
      error
    );

    if (error instanceof SubscriptionTierError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          step: "tier",
        } satisfies ReplyErrorResponse,
        { status: error.status }
      );
    }

    if (error instanceof ReplyError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          step: error.step ?? "reply-engine",
        } satisfies ReplyErrorResponse,
        { status: error.status }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Internal generation pipeline error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        step: "reply-engine",
      } satisfies ReplyErrorResponse,
      { status: 500 }
    );
  }
}
