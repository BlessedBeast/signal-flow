import { NextResponse } from "next/server";

import { executeDailyReleaseForUser } from "@/lib/discovery/lead-bank";
import { executeLeadHunt } from "@/lib/mining/hunt-pipeline";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

type CronUserResult = {
  userId: string;
  ok: boolean;
  released?: number;
  queued?: number;
  error?: string;
};

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized cron invocation" },
      { status: 401 }
    );
  }

  console.log("\x1b[35m[DISCOVERY CRON]\x1b[0m Daily miner + drip-feed started");

  const { data: profiles, error } = await supabaseServer
    .from("profiles")
    .select("id, product_dna, is_mining")
    .not("product_dna", "is", null);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const results: CronUserResult[] = [];

  for (const profile of profiles ?? []) {
    const userId = profile.id as string;
    if (profile.is_mining) {
      results.push({
        userId,
        ok: false,
        error: "Skipped — mining lock active",
      });
      continue;
    }

    try {
      const hunt = await executeLeadHunt(userId);
      results.push({
        userId,
        ok: true,
        released: hunt.released,
        queued: hunt.queued,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Hunt failed";
      console.error(`[DISCOVERY CRON] Hunt failed for ${userId}:`, message);

      try {
        const release = await executeDailyReleaseForUser(userId);
        results.push({
          userId,
          ok: true,
          released: release.released,
          queued: 0,
          error: `Hunt failed — drip-only fallback: ${message}`,
        });
      } catch (releaseErr) {
        const releaseMessage =
          releaseErr instanceof Error ? releaseErr.message : "Release failed";
        results.push({ userId, ok: false, error: releaseMessage });
      }
    }
  }

  console.log(
    `\x1b[35m[DISCOVERY CRON]\x1b[0m Finished — processed ${results.length} workspaces`
  );

  return NextResponse.json(
    {
      ok: true,
      processed: results.length,
      results,
    },
    { status: 200 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      ok: false,
      error: "Method not allowed. POST with CRON_SECRET bearer token.",
    },
    { status: 405 }
  );
}
