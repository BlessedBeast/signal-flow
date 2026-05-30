import { NextResponse } from "next/server";

import {
  DISCOVERY_LEADS_TABLE,
  getLeadBankStats,
} from "@/lib/discovery/lead-bank";
import { mapDbLeadToClientResponse, type DbLeadRow } from "@/lib/leads/map-db-lead";
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
      .from(DISCOVERY_LEADS_TABLE)
      .select(
        "id, user_id, platform, source_url, content, intent_score, status, ai_draft_content, media_directives, conversation_history, created_at, released_at"
      )
      .eq("user_id", userId)
      .in("status", ["active", "drafted", "replied"])
      .order("released_at", { ascending: false })
      .order("intent_score", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    const leads = (data ?? []).map((row) =>
      mapDbLeadToClientResponse(row as DbLeadRow)
    );

    const bank = await getLeadBankStats(supabaseServer, userId);

    return NextResponse.json({ ok: true, leads, bank }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load leads";
    console.error("[leads/GET]", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
