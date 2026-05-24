import { NextResponse } from "next/server";

import {
  extractProductDNAWithOpenAI,
  normalizeTargetUrl,
  PipelineError,
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

export async function POST(request: Request) {
  try {
    let body: { url?: string };
    try {
      body = (await request.json()) as { url?: string };
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const normalizedUrl = normalizeTargetUrl(body.url ?? "");

    // STEP A — Jina scrape
    const markdown = await scrapeWithJina(normalizedUrl);

    // STEP B — OpenAI extraction
    const dna = await extractProductDNAWithOpenAI(normalizedUrl, markdown);

    const payload: AnalyzeResponse = {
      ok: true,
      dna,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    if (error instanceof PipelineError) {
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
      error instanceof Error ? error.message : "Unexpected server error";

    console.error("[onboard/analyze]", error);

    return NextResponse.json(
      { ok: false, error: message, step: null },
      { status: 500 }
    );
  }
}
