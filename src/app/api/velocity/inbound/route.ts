import { NextResponse } from "next/server";

import {
  executeInboundGeneration,
  InboundError,
  parseInboundBody,
} from "@/lib/velocity/inbound-pipeline";
import { authenticateRouteHandler } from "@/lib/supabase-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

type InboundErrorResponse = {
  ok: false;
  error: string;
  step: string | null;
};

export async function POST(request: Request) {
  console.log("[INBOUND TRACE] ===== Inbound reply pipeline started =====");
  console.log("[INBOUND TRACE] Incoming POST /api/velocity/inbound");

  try {
    console.log("[INBOUND TRACE] Checkpoint 1: Auth verification");
    const auth = await authenticateRouteHandler(request);
    if (!auth.ok) {
      console.error(
        "[INBOUND TRACE] Authentication failed:",
        auth.authError ?? "no valid session"
      );
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized",
          step: "auth",
        } satisfies InboundErrorResponse,
        { status: 401 }
      );
    }

    const { supabase, user } = auth;
    console.log("[INBOUND TRACE] Authenticated user:", user.id);

    let body: unknown;
    try {
      body = await request.json();
      console.log("[INBOUND TRACE] Request body parsed:", {
        platform: (body as { platform?: string })?.platform,
        posture: (body as { posture?: string })?.posture,
        originalThreadLength:
          typeof (body as { originalThread?: string })?.originalThread ===
          "string"
            ? (body as { originalThread: string }).originalThread.length
            : 0,
      });
    } catch (parseErr) {
      console.error("[INBOUND TRACE] Request body JSON parse failed:", parseErr);
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid JSON body",
          step: "body",
        } satisfies InboundErrorResponse,
        { status: 400 }
      );
    }

    const { platform, originalThread, posture } = parseInboundBody(body);
    console.log(
      "[INBOUND TRACE] Checkpoint 2: Validated input — platform:",
      platform,
      "| posture:",
      posture
    );

    const parsingResult = await executeInboundGeneration(user.id, supabase, {
      platform,
      originalThread,
      posture,
    });

    console.log(
      "[INBOUND TRACE] ===== Inbound reply pipeline completed successfully ====="
    );

    return NextResponse.json(
      { ok: true, data: parsingResult.data },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "[INBOUND TRACE] Fatal exception encountered during execution:",
      error
    );

    if (error instanceof InboundError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          step: error.step ?? "inbound-engine",
        } satisfies InboundErrorResponse,
        { status: error.status }
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Internal inbound generation pipeline error";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        step: "inbound-engine",
      } satisfies InboundErrorResponse,
      { status: 500 }
    );
  }
}
