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

async function executeReflectionCron(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  console.log("\x1b[36m[REFLECTION CRON]\x1b[0m Live Reflection Engine started");

  try {
    const { data: profiles, error } = await supabaseServer
      .from("profiles")
      .select("id")
      .not("product_dna", "is", null);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const publishResults = await Promise.allSettled(
      (profiles ?? []).map((profile) =>
        publishWorkerMessage("/api/worker/reflection", {
          userId: profile.id as string,
        })
      )
    );
    const enqueued = publishResults.filter((result) => result.status === "fulfilled").length;
    const failed = publishResults.length - enqueued;
    console.log(
      `\x1b[36m[REFLECTION CRON]\x1b[0m Fan-out enqueued ${enqueued}/${publishResults.length} reflection jobs`
    );

    return NextResponse.json(
      {
        ok: true,
        mode: "fanout",
        scheduled: publishResults.length,
        enqueued,
        failed,
      },
      { status: 200 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Reflection cron failed";
    console.error("[REFLECTION CRON] Fatal error:", message);

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return executeReflectionCron(request);
}

export async function POST(request: Request) {
  return executeReflectionCron(request);
}
