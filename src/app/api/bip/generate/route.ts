import { NextResponse } from "next/server";

import {
  BipError,
  executeBipGenerate,
  resolveAuthenticatedUserId,
} from "@/lib/bip/generate-pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Authentication required", step: "auth" },
        { status: 401 }
      );
    }

    const result = await executeBipGenerate(userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof BipError) {
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
      error instanceof Error ? error.message : "Unexpected generation failure";

    console.error("[bip/generate]", error);

    return NextResponse.json(
      { ok: false, error: message, step: null },
      { status: 500 }
    );
  }
}
