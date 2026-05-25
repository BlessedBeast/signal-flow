import { NextResponse } from "next/server";

import {
  executeSideCarGeneration,
  type PreviousSideCarTool,
  SideCarError,
} from "@/lib/labs/side-cars-pipeline";
import {
  createRouteHandlerSupabase,
  resolveRouteHandlerUserId,
} from "@/lib/supabase-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

type SideCarErrorResponse = {
  ok: false;
  error: string;
  step: string | null;
};

export async function POST(request: Request) {
  console.log("[SIDECAR TRACE] ===== Side-car generation pipeline started =====");
  console.log("[SIDECAR TRACE] Incoming POST /api/labs/side-cars");

  try {
    console.log("[SIDECAR TRACE] Checkpoint 1: Auth verification");
    const supabase = await createRouteHandlerSupabase(request);
    const userId = await resolveRouteHandlerUserId(request, supabase);
    console.log("[SIDECAR TRACE] Authenticated user:", userId);

    if (!userId) {
      console.error(
        "[SIDECAR TRACE] Authentication failed: no valid session for side-car request"
      );
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required",
          step: "auth",
        } satisfies SideCarErrorResponse,
        { status: 401 }
      );
    }

    console.log(
      "[SIDECAR TRACE] Checkpoint 2: Load exclusion memory from side_cars"
    );
    const { data: priorRows, error: priorError } = await supabase
      .from("side_cars")
      .select("tool_name, concept_pitch")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (priorError) {
      console.error(
        "[SIDECAR TRACE] Prior tools fetch failed:",
        priorError.message
      );
      return NextResponse.json(
        {
          ok: false,
          error: `Failed to load prior lead magnets: ${priorError.message}`,
          step: "exclusion-memory",
        } satisfies SideCarErrorResponse,
        { status: 500 }
      );
    }

    const previousTools: PreviousSideCarTool[] = (priorRows ?? [])
      .map((row) => ({
        toolName: typeof row.tool_name === "string" ? row.tool_name.trim() : "",
        conceptPitch:
          typeof row.concept_pitch === "string" ? row.concept_pitch.trim() : "",
      }))
      .filter((tool) => tool.toolName.length > 0);

    console.log(
      "[SIDECAR TRACE] Exclusion memory loaded — tools:",
      previousTools.length
    );

    console.log(
      "[SIDECAR TRACE] Checkpoint 3: Execute side-car generation pipeline"
    );
    const parsingResult = await executeSideCarGeneration(
      userId,
      supabase,
      previousTools
    );

    console.log(
      "[SIDECAR TRACE] ===== Side-car generation pipeline completed successfully ====="
    );

    return NextResponse.json({ ok: true, data: parsingResult }, { status: 200 });
  } catch (error) {
    console.error(
      "[SIDECAR TRACE] Fatal exception encountered during execution:",
      error
    );

    if (error instanceof SideCarError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          step: error.step ?? "sidecar-engine",
        } satisfies SideCarErrorResponse,
        { status: error.status }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Internal side-car generation pipeline error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        step: "sidecar-engine",
      } satisfies SideCarErrorResponse,
      { status: 500 }
    );
  }
}
