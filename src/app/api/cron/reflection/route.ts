import { NextResponse } from "next/server";

import { runReflectionCron } from "@/lib/reflection/reflection-pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const url = new URL(request.url);
  const param = url.searchParams.get("secret");
  return param === secret;
}

export async function GET(request: Request) {
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
    const { processed, results } = await runReflectionCron();

    const succeeded = results.filter((r) => r.ok).length;
    console.log(
      `\x1b[36m[REFLECTION CRON]\x1b[0m Finished — ${succeeded}/${processed} users reflected`
    );

    return NextResponse.json(
      {
        ok: true,
        processed,
        succeeded,
        results,
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

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Method not allowed. GET with ?secret=CRON_SECRET query parameter.",
    },
    { status: 405 }
  );
}
