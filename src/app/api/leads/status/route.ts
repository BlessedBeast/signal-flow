import { NextResponse } from "next/server";

import {
  parseStatusBody,
  resolveAuthenticatedUserId,
  StatusError,
  updateLeadStatus,
} from "@/lib/leads/status-pipeline";

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

    const { leadId, status } = parseStatusBody(body);
    const result = await updateLeadStatus(userId, leadId, status);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof StatusError) {
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
      error instanceof Error ? error.message : "Unexpected status update failure";

    console.error("[leads/status]", error);

    return NextResponse.json(
      { ok: false, error: message, step: null },
      { status: 500 }
    );
  }
}
