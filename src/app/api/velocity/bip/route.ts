import { NextResponse } from "next/server";

import {
  BipPipelineError,
  executeBipGenerate,
  fetchBipLedgerTimeline,
  parseBipGenerateBody,
} from "@/lib/velocity/bip-pipeline";
import {
  createRouteHandlerSupabase,
  resolveRouteHandlerUserId,
} from "@/lib/supabase-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

type BipErrorResponse = {
  ok: false;
  error: string;
  step: string | null;
};

export async function GET(request: Request) {
  try {
    const supabase = await createRouteHandlerSupabase(request);
    const userId = await resolveRouteHandlerUserId(request, supabase);

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required",
          step: "auth",
        } satisfies BipErrorResponse,
        { status: 401 }
      );
    }

    const result = await fetchBipLedgerTimeline(supabase, userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof BipPipelineError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          step: error.step ?? "bip-timeline",
        } satisfies BipErrorResponse,
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to load BIP timeline";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        step: "bip-timeline",
      } satisfies BipErrorResponse,
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  console.log("[BIP TRACE] POST /api/velocity/bip");

  try {
    const supabase = await createRouteHandlerSupabase(request);
    const userId = await resolveRouteHandlerUserId(request, supabase);

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required",
          step: "auth",
        } satisfies BipErrorResponse,
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid JSON body",
          step: "body",
        } satisfies BipErrorResponse,
        { status: 400 }
      );
    }

    const { postType, currentFocus } = parseBipGenerateBody(body);

    const result = await executeBipGenerate(userId, supabase, {
      postType,
      currentFocus,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[BIP TRACE] Fatal error:", error);

    if (error instanceof BipPipelineError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          step: error.step ?? "bip-engine",
        } satisfies BipErrorResponse,
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "BIP generation failed";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        step: "bip-engine",
      } satisfies BipErrorResponse,
      { status: 500 }
    );
  }
}
