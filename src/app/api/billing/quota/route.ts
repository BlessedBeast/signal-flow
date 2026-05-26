import { NextResponse } from "next/server";

import { resolveUserBillingContext } from "@/lib/billing/user-billing";
import { authenticateRouteHandler } from "@/lib/supabase-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const auth = await authenticateRouteHandler(request);

    if (!auth.ok) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const billing = await resolveUserBillingContext(
      auth.supabase,
      auth.user.id
    );

    return NextResponse.json({
      ok: true,
      data: billing,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load billing quota";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
