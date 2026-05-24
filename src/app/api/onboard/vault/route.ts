import { NextResponse } from "next/server";

import {
  persistProductDnaToVault,
  PipelineError,
  resolveAuthenticatedUserId,
} from "@/lib/onboard-pipeline";
import { parseClientProductDna } from "@/lib/product-dna-schema";

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

    let body: { dna?: unknown; is_mining?: boolean };
    try {
      body = (await request.json()) as { dna?: unknown; is_mining?: boolean };
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body", step: "vault" },
        { status: 400 }
      );
    }

    if (body.dna == null || typeof body.dna !== "object") {
      throw new PipelineError("Missing product DNA payload", 400, "vault");
    }

    let dna;
    try {
      dna = parseClientProductDna(body.dna);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Invalid product DNA payload";
      throw new PipelineError(message, 400, "vault");
    }

    const isMining =
      typeof body.is_mining === "boolean" ? body.is_mining : false;

    await persistProductDnaToVault(userId, dna, { isMining });

    return NextResponse.json({ ok: true }, { status: 200 });
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
      error instanceof Error ? error.message : "Unexpected vault save error";

    console.error("[onboard/vault]", error);

    return NextResponse.json(
      { ok: false, error: message, step: null },
      { status: 500 }
    );
  }
}
