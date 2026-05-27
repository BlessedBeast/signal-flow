import { NextResponse } from "next/server";

import { runPublicMicroAudit } from "@/lib/micro-audit/pipeline";
import {
  pipelineErrorLabel,
  PipelineError,
} from "@/lib/onboard-pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

type TeaserSuccess = {
  ok: true;
  teaser: {
    productName: string;
    primaryLeakPlatform: string;
    missedTrafficVolume: string;
    highestIntentThreadTitle: string;
    url: string;
  };
  dna: import("@/lib/signalflow-types").ProductDNA;
  previewLeads: import("@/lib/micro-audit/types").MicroAuditPreviewLead[];
};

type TeaserError = {
  ok: false;
  error: string;
  details: string;
  step: string | null;
};

export async function POST(request: Request) {
  try {
    let body: { url?: string };
    try {
      body = (await request.json()) as { url?: string };
    } catch (parseErr) {
      const details =
        parseErr instanceof Error ? parseErr.message : "Invalid JSON body";
      return NextResponse.json(
        { ok: false, error: "Invalid Request Body", details, step: null },
        { status: 400 }
      );
    }

    const result = await runPublicMicroAudit(body.url ?? "");

    const payload: TeaserSuccess = {
      ok: true,
      teaser: result.teaser,
      dna: result.dna,
      previewLeads: result.previewLeads,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    if (error instanceof PipelineError) {
      return NextResponse.json(
        {
          ok: false,
          error: pipelineErrorLabel(error),
          details: error.details ?? error.message,
          step: error.step ?? null,
        } satisfies TeaserError,
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "Micro-audit failed";

    return NextResponse.json(
      {
        ok: false,
        error: "Micro-Audit Failed",
        details: message,
        step: null,
      } satisfies TeaserError,
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "Method not allowed",
      details: "POST a JSON body with { url } to run the public micro-audit.",
      step: null,
    },
    { status: 405 }
  );
}
