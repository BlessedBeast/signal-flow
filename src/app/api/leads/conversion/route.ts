import { NextResponse } from "next/server";

import {
  ConversionError,
  executeConversionOutcome,
  parseConversionBody,
} from "@/lib/leads/flywheel-pipeline";
import { resolveAuthenticatedUserId } from "@/lib/onboard-pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Authentication required", step: "auth" },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body", step: "body" },
        { status: 400 }
      );
    }

    const { leadId, outcome } = parseConversionBody(body);
    const result = await executeConversionOutcome(userId, leadId, outcome);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ConversionError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          step: error.step ?? null,
        },
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "Unexpected conversion failure";

    console.error("[leads/conversion]", error);

    return NextResponse.json(
      { ok: false, error: message, step: null },
      { status: 500 }
    );
  }
}
