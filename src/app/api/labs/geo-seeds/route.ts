import { NextResponse } from "next/server";

import {
  executeGeoSeedsGeneration,
  GeoSeedsError,
} from "@/lib/labs/geo-seeds-pipeline";
import { mapGeoAnchorRowsToPreviousAnchors } from "@/lib/labs/labs-mappers";
import {
  createRouteHandlerSupabase,
  resolveRouteHandlerUserId,
} from "@/lib/supabase-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

type GeoSeedsErrorResponse = {
  ok: false;
  error: string;
  step: string | null;
};

export async function POST(request: Request) {
  console.log("[GEO TRACE] ===== GEO seed generation pipeline started =====");
  console.log("[GEO TRACE] Incoming POST /api/labs/geo-seeds");

  try {
    console.log("[GEO TRACE] Checkpoint 1: Auth verification");
    const supabase = await createRouteHandlerSupabase(request);
    const userId = await resolveRouteHandlerUserId(request, supabase);
    console.log("[GEO TRACE] Authenticated user:", userId);

    if (!userId) {
      console.error(
        "[GEO TRACE] Authentication failed: no valid session for GEO request"
      );
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required",
          step: "auth",
        } satisfies GeoSeedsErrorResponse,
        { status: 401 }
      );
    }

    console.log("[GEO TRACE] Checkpoint 2: Load exclusion memory from geo_seeds");
    const { data: priorRows, error: priorError } = await supabase
      .from("geo_seeds")
      .select("keyword_anchor")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (priorError) {
      console.error(
        "[GEO TRACE] Prior anchors fetch failed:",
        priorError.message
      );
      return NextResponse.json(
        {
          ok: false,
          error: `Failed to load prior GEO anchors: ${priorError.message}`,
          step: "exclusion-memory",
        } satisfies GeoSeedsErrorResponse,
        { status: 500 }
      );
    }

    const previousAnchors = mapGeoAnchorRowsToPreviousAnchors(priorRows);

    console.log(
      "[GEO TRACE] Exclusion memory loaded — anchors:",
      previousAnchors.length
    );

    console.log("[GEO TRACE] Checkpoint 3: Execute GEO generation pipeline");
    const parsingResult = await executeGeoSeedsGeneration(
      userId,
      supabase,
      previousAnchors
    );

    console.log(
      "[GEO TRACE] ===== GEO seed generation pipeline completed successfully ====="
    );

    return NextResponse.json(
      { ok: true, data: parsingResult.seeds },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[GEO TRACE] Fatal exception encountered during execution:",
      error
    );

    if (error instanceof GeoSeedsError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          step: error.step ?? "geo-engine",
        } satisfies GeoSeedsErrorResponse,
        { status: error.status }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Internal GEO seed generation pipeline error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        step: "geo-engine",
      } satisfies GeoSeedsErrorResponse,
      { status: 500 }
    );
  }
}
