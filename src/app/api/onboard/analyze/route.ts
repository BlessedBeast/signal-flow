import { NextResponse } from "next/server";

import {
  extractProductDNAWithOpenAI,
  normalizeTargetUrl,
  pipelineErrorLabel,
  PipelineError,
  resolveAuthenticatedUserId,
  scrapeWithJina,
} from "@/lib/onboard-pipeline";
import type { ProductDNA } from "@/lib/signalflow-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

type AnalyzeResponse = {
  ok: true;
  dna: ProductDNA;
};

type AnalyzeErrorResponse = {
  ok: false;
  error: string;
  details: string;
  step: string | null;
};

function analyzeErrorResponse(
  error: string,
  details: string,
  status: number,
  step: string | null = null
) {
  const payload: AnalyzeErrorResponse = {
    ok: false,
    error,
    details,
    step,
  };
  return NextResponse.json(payload, { status });
}

export async function POST(request: Request) {
  console.log("[ANALYZE TRACE] ===== Analyze pipeline started =====");

  try {
    console.log("[ANALYZE TRACE] Checkpoint 1: USER AUTHENTICATION");
    const userId = await resolveAuthenticatedUserId(request, { trace: true });
    if (!userId) {
      return analyzeErrorResponse(
        "Authentication Failed",
        "Missing or invalid authorization token. Sign in and retry analysis.",
        401,
        "auth"
      );
    }

    console.log("[ANALYZE TRACE] Checkpoint 2: PAYLOAD CHECK");
    let body: { url?: string };
    try {
      body = (await request.json()) as { url?: string };
    } catch (parseErr) {
      const details =
        parseErr instanceof Error ? parseErr.message : "Invalid JSON body";
      console.error("[ANALYZE TRACE] Request body parse failed:", details);
      return analyzeErrorResponse("Invalid Request Body", details, 400);
    }

    const incomingUrl = body.url ?? "";
    console.log("[ANALYZE TRACE] Incoming website URL:", incomingUrl);

    const normalizedUrl = normalizeTargetUrl(incomingUrl);
    console.log("[ANALYZE TRACE] Normalized target URL:", normalizedUrl);

    const markdown = await scrapeWithJina(normalizedUrl);

    const dna = await extractProductDNAWithOpenAI(normalizedUrl, markdown);

    const payload: AnalyzeResponse = {
      ok: true,
      dna,
    };

    console.log(
      "[ANALYZE TRACE] ===== Analyze pipeline completed successfully ====="
    );
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    if (error instanceof PipelineError) {
      const label = pipelineErrorLabel(error);
      const details = error.details ?? error.message;
      console.error(
        `[ANALYZE TRACE] PipelineError at step "${error.step ?? "unknown"}":`,
        label,
        details
      );
      return analyzeErrorResponse(
        label,
        details,
        error.status,
        error.step ?? null
      );
    }

    const message =
      error instanceof Error ? error.message : "Unexpected server error";

    console.error("[ANALYZE TRACE] Unhandled analyze failure:", error);

    return analyzeErrorResponse("Analysis Failed", message, 500);
  }
}
