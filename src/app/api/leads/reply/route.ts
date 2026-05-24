import { NextResponse } from "next/server";

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

    console.log(
      "[REPLY TRACE] ===== Reply draft pipeline completed successfully ====="
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error(
      "[REPLY TRACE] Fatal exception encountered during execution:",
      error
    );

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
