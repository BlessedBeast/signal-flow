import { NextResponse } from "next/server";

/** @deprecated Use POST /api/velocity/bip */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error:
        "This endpoint is deprecated. Use POST /api/velocity/bip with postType and currentFocus.",
      step: "deprecated",
    },
    { status: 410 }
  );
}
