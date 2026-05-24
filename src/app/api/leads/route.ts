import { NextResponse } from "next/server";

import { mapDbLeadToClient, type DbLeadRow } from "@/lib/leads/map-db-lead";
import { resolveAuthenticatedUserId } from "@/lib/onboard-pipeline";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { data, error } = await supabaseServer
      .from("leads")
      .select(
        "id, user_id, platform, source_url, content, intent_score, status, ai_draft_content, conversation_history, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const leads = (data ?? []).map((row) =>
      mapDbLeadToClient(row as DbLeadRow)
    );

    return NextResponse.json({ ok: true, leads }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load leads";
    console.error("[leads/GET]", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
