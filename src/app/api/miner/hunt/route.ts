import { NextResponse } from "next/server";

import {
  executeHuntLoop,
  HuntError,
  resolveAuthenticatedUserId,
} from "@/lib/mining/hunt-pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Authentication required", step: "auth" },
        { status: 401 }
      );
    }

    const result = await executeHuntLoop(userId);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof HuntError) {
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
      error instanceof Error ? error.message : "Unexpected hunt failure";

    console.error("[miner/hunt]", error);

    return NextResponse.json(
      { ok: false, error: message, step: null },
      { status: 500 }
    );
  }
}
