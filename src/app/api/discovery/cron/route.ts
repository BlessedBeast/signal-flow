import { NextResponse } from "next/server";

import { publishWorkerMessage } from "@/lib/qstash";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function authorizeCron(request: Request): boolean {
  const vercelCronHeader = request.headers.get("x-vercel-cron");
  if (vercelCronHeader) {
    return true;
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

async function executeDiscoveryCron(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized cron invocation" },
      { status: 401 }
    );
  }

  console.log(
    "\x1b[35m[DISCOVERY CRON]\x1b[0m Founder-tier automated miner started (5 AM batch)"
  );

  const { data: profiles, error } = await supabaseServer
    .from("profiles")
    .select("id")
    .eq("subscription_tier", "founder")
    .not("product_dna", "is", null);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const founderProfiles = profiles ?? [];

  if (founderProfiles.length === 0) {
    console.log(
      "\x1b[35m[DISCOVERY CRON]\x1b[0m No founder-tier profiles eligible — free/bootstrapper skipped"
    );
  }

  const publishResults = await Promise.allSettled(
    founderProfiles.map((profile) =>
      publishWorkerMessage("/api/worker/discovery", {
        userId: profile.id as string,
      })
    )
  );
  const enqueued = publishResults.filter(
    (result) => result.status === "fulfilled"
  ).length;
  const failed = publishResults.length - enqueued;

  console.log(
    `\x1b[35m[DISCOVERY CRON]\x1b[0m Fan-out enqueued ${enqueued}/${publishResults.length} founder discovery jobs`
  );

  return NextResponse.json(
    {
      ok: true,
      mode: "founder-only-fanout",
      scheduled: publishResults.length,
      enqueued,
      failed,
      skippedTiers: ["free", "bootstrapper"],
    },
    { status: 200 }
  );
}

export async function GET(request: Request) {
  return executeDiscoveryCron(request);
}

export async function POST(request: Request) {
  return executeDiscoveryCron(request);
}
