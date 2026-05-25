import { NextResponse } from "next/server";

import {
  IngestAlertError,
  ingestPlugAlertLead,
  parseIngestAlertBody,
  resolveAuthenticatedUserId,
} from "@/lib/leads/ingest-alert-pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type IngestAlertErrorResponse = {
  ok: false;
  error: string;
  step: string | null;
};

export async function POST(request: Request) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required",
          step: "auth",
        } satisfies IngestAlertErrorResponse,
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
        } satisfies IngestAlertErrorResponse,
        { status: 400 }
      );
    }

    const payload = parseIngestAlertBody(body);
    const lead = await ingestPlugAlertLead(userId, payload);

    return NextResponse.json(
      {
        ok: true,
        lead: { ...lead, url: lead.source_url },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof IngestAlertError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          step: error.step ?? "ingest-alert",
        } satisfies IngestAlertErrorResponse,
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to ingest plug alert";

    return NextResponse.json(
      {
        ok: false,
        error: message,
        step: "ingest-alert",
      } satisfies IngestAlertErrorResponse,
      { status: 500 }
    );
  }
}
