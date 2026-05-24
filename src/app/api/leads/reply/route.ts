import { NextResponse } from "next/server";

import {
  executeReplyGeneration,
  parseReplyBody,
  ReplyError,
  resolveAuthenticatedUserId,
} from "@/lib/leads/reply-pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

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

    const { leadId, prospectResponse } = parseReplyBody(body);
    const result = await executeReplyGeneration(
      userId,
      leadId,
      prospectResponse
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ReplyError) {
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
      error instanceof Error ? error.message : "Unexpected reply failure";

    console.error("[leads/reply]", error);

    return NextResponse.json(
      { ok: false, error: message, step: null },
      { status: 500 }
    );
  }
}
