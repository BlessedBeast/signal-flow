import { NextResponse } from "next/server";

import {
  executeFollowUpGeneration,
  FollowUpError,
  parseFollowUpBody,
} from "@/lib/velocity/follow-up-pipeline";
import {
  createRouteHandlerSupabase,
  resolveRouteHandlerUserId,
} from "@/lib/supabase-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

type FollowUpErrorResponse = {
  ok: false;
  error: string;
  step: string | null;
};

export async function POST(request: Request) {
  console.log("[FOLLOW-UP TRACE] ===== Follow-up pipeline started =====");
  console.log("[FOLLOW-UP TRACE] Incoming POST /api/velocity/follow-up");

  try {
    console.log("[FOLLOW-UP TRACE] Checkpoint 1: Auth verification");
    const supabase = await createRouteHandlerSupabase(request);
    const userId = await resolveRouteHandlerUserId(request, supabase);
    console.log("[FOLLOW-UP TRACE] Authenticated user:", userId);

    if (!userId) {
      console.error("[FOLLOW-UP TRACE] Authentication failed");
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required",
          step: "auth",
        } satisfies FollowUpErrorResponse,
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch (parseErr) {
      console.error("[FOLLOW-UP TRACE] JSON parse failed:", parseErr);
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid JSON body",
          step: "body",
        } satisfies FollowUpErrorResponse,
        { status: 400 }
      );
    }

    const { leadId, followInput } = parseFollowUpBody(body);
    console.log(
      "[FOLLOW-UP TRACE] Checkpoint 2: Execute follow-up — leadId:",
      leadId,
      "| followInput length:",
      followInput.length
    );

    const result = await executeFollowUpGeneration(userId, supabase, {
      leadId,
      followInput,
    });

    console.log("[FOLLOW-UP TRACE] ===== Follow-up pipeline completed =====");

    return NextResponse.json(
      {
        ok: true,
        suggestedReply: result.suggestedReply,
        conversation_history: result.conversation_history,
        ai_draft_content: result.ai_draft_content,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[FOLLOW-UP TRACE] Fatal exception:", error);

    if (error instanceof FollowUpError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          step: error.step ?? "follow-up-engine",
        } satisfies FollowUpErrorResponse,
        { status: error.status }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Internal follow-up generation pipeline error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        step: "follow-up-engine",
      } satisfies FollowUpErrorResponse,
      { status: 500 }
    );
  }
}
