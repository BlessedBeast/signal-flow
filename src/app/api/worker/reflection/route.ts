import { NextResponse } from "next/server";
import { z } from "zod";

import { verifyQstashSignature } from "@/lib/qstash";
import { processUserReflection } from "@/lib/reflection/reflection-pipeline";
import { fetchCoreFrameworkCatalog } from "@/lib/onboard/blueprint-engine";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const payloadSchema = z.object({
  userId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const verifiedBody = await verifyQstashSignature(request);
    const parsed = payloadSchema.safeParse(JSON.parse(verifiedBody));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid worker payload" },
        { status: 400 }
      );
    }

    const { userId } = parsed.data;
    const [{ data: profile, error: profileError }, frameworks] = await Promise.all([
      supabaseServer
        .from("profiles")
        .select("product_dna")
        .eq("id", userId)
        .maybeSingle(),
      fetchCoreFrameworkCatalog(supabaseServer),
    ]);

    if (profileError) {
      return NextResponse.json(
        { ok: false, error: profileError.message },
        { status: 500 }
      );
    }
    if (!profile?.product_dna) {
      return NextResponse.json(
        { ok: true, userId, skipped: true, reason: "missing product_dna" },
        { status: 200 }
      );
    }

    const result = await processUserReflection({
      userId,
      productDna: profile.product_dna,
      frameworks: frameworks as unknown as Record<string, unknown>[],
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Worker execution failed";
    return NextResponse.json({ ok: false, error: message }, { status: 401 });
  }
}

