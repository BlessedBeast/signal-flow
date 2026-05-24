import { NextResponse } from "next/server";

import {
  executeLeadHunt,
  HuntError,
} from "@/lib/mining/hunt-pipeline";
import {
  createRouteHandlerSupabase,
  resolveRouteHandlerUserId,
} from "@/lib/supabase-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type HuntErrorResponse = {
  ok: false;
  error: string;
  step: string | null;
};

export async function POST(request: Request) {
  console.log("[HUNT TRACE] POST /api/miner/hunt");

  try {
    const supabase = await createRouteHandlerSupabase(request);
    const userId = await resolveRouteHandlerUserId(request, supabase);

    if (!userId) {
      console.error("[HUNT TRACE] Authentication failed");
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required",
          step: "auth",
        } satisfies HuntErrorResponse,
        { status: 401 }
      );
    }

    console.log("[HUNT TRACE] Executing lead hunt for user:", userId);
    const result = await executeLeadHunt(userId);
    console.log("[HUNT TRACE] Hunt completed:", result);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof HuntError) {
      console.error(
        "[HUNT TRACE] HuntError:",
        error.message,
        "step:",
        error.step
      );
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          step: error.step ?? null,
        } satisfies HuntErrorResponse,
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "Unexpected hunt failure";

    console.error("[HUNT TRACE] Unhandled hunt failure:", error);

    return NextResponse.json(
      {
        ok: false,
        error: message,
        step: null,
      } satisfies HuntErrorResponse,
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "Method not allowed. Use POST to run the lead miner.",
      step: "method",
    } satisfies HuntErrorResponse,
    { status: 405 }
  );
}
