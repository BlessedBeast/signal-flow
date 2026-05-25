import { NextResponse } from "next/server";

import {
  executePlugAlertsScan,
  PlugAlertsError,
} from "@/lib/velocity/alerts-pipeline";
import {
  createRouteHandlerSupabase,
  resolveRouteHandlerUserId,
} from "@/lib/supabase-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

type PlugAlertsErrorResponse = {
  ok: false;
  error: string;
  step: string | null;
};

export async function POST(request: Request) {
  console.log("[PLUG ALERTS TRACE] ===== Plug radar scan started =====");
  console.log("[PLUG ALERTS TRACE] Incoming POST /api/velocity/alerts");

  try {
    console.log("[PLUG ALERTS TRACE] Checkpoint 1: Auth verification");
    const supabase = await createRouteHandlerSupabase(request);
    const userId = await resolveRouteHandlerUserId(request, supabase);
    console.log("[PLUG ALERTS TRACE] Authenticated user:", userId);

    if (!userId) {
      console.error(
        "[PLUG ALERTS TRACE] Authentication failed: no valid session"
      );
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required",
          step: "auth",
        } satisfies PlugAlertsErrorResponse,
        { status: 401 }
      );
    }

    console.log("[PLUG ALERTS TRACE] Checkpoint 2: Execute velocity scan");
    const result = await executePlugAlertsScan(userId, supabase);

    console.log(
      "[PLUG ALERTS TRACE] ===== Plug radar scan completed successfully ====="
    );

    return NextResponse.json({ ok: true, data: result }, { status: 200 });
  } catch (error) {
    console.error(
      "[PLUG ALERTS TRACE] Fatal exception during scan:",
      error
    );

    if (error instanceof PlugAlertsError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          step: error.step ?? "plug-alerts-engine",
        } satisfies PlugAlertsErrorResponse,
        { status: error.status }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Internal plug alerts pipeline error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        step: "plug-alerts-engine",
      } satisfies PlugAlertsErrorResponse,
      { status: 500 }
    );
  }
}
