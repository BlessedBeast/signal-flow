import { NextResponse } from "next/server";

import { parseSubscriptionTier } from "@/lib/billing/tiers";
import { generateAndPersistUserBlueprint } from "@/lib/onboard/blueprint-engine";
import { PipelineError } from "@/lib/onboard-pipeline";
import { parseClientProductDna } from "@/lib/product-dna-schema";
import { generateInitialReflectionTasksForUser } from "@/lib/reflection/reflection-pipeline";
import {
  createRouteHandlerSupabase,
  resolveRouteHandlerUserId,
} from "@/lib/supabase-route";
import type { ProductDNA } from "@/lib/signalflow-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

type VaultBody = {
  dna?: unknown;
  is_mining?: boolean;
  subscription_tier?: unknown;
};

type VaultErrorResponse = {
  ok: false;
  error: string;
  details?: string;
  step: string | null;
};

export async function POST(request: Request) {
  console.log("[VAULT TRACE] ===== Vault save pipeline started =====");

  try {
    let body: VaultBody;
    try {
      body = (await request.json()) as VaultBody;
    } catch (parseErr) {
      const details =
        parseErr instanceof Error ? parseErr.message : "Invalid JSON body";
      console.error("[VAULT TRACE] Request body parse failed:", details);
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid JSON body",
          details,
          step: "vault",
        } satisfies VaultErrorResponse,
        { status: 400 }
      );
    }

    console.log("[VAULT TRACE] Received save payload:", body);

    const supabase = await createRouteHandlerSupabase(request);
    const userId = await resolveRouteHandlerUserId(request, supabase);

    if (!userId) {
      console.error(
        "[VAULT TRACE] Authentication failed: could not resolve user from Bearer token or cookies"
      );
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required",
          details:
            "Missing or invalid session. Sign in and retry saving your vault.",
          step: "auth",
        } satisfies VaultErrorResponse,
        { status: 401 }
      );
    }

    console.log("[VAULT TRACE] Authenticated User ID attempting write:", userId);

    if (body.dna == null || typeof body.dna !== "object") {
      console.error("[VAULT TRACE] Missing or invalid dna object on payload");
      return NextResponse.json(
        {
          ok: false,
          error: "Missing product DNA payload",
          details: "Request body must include a dna object.",
          step: "vault",
        } satisfies VaultErrorResponse,
        { status: 400 }
      );
    }

    let dna: ProductDNA;
    try {
      dna = parseClientProductDna(body.dna);
      console.log("[VAULT TRACE] Product DNA schema validation passed:", {
        productName: dna.productName,
        url: dna.url,
        competitors: dna.competitors.length,
        keywords: dna.keywords.length,
        serperQueries: dna.activeSerperQueries.length,
      });
    } catch (err) {
      const details =
        err instanceof Error ? err.message : "Invalid product DNA payload";
      console.error("[VAULT TRACE] Product DNA validation failed:", details);
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid product DNA payload",
          details,
          step: "vault",
        } satisfies VaultErrorResponse,
        { status: 400 }
      );
    }

    const isMining =
      typeof body.is_mining === "boolean" ? body.is_mining : false;

    const profilePatch: Record<string, unknown> = {
      product_dna: dna,
      is_mining: isMining,
      website_url: dna.url || null,
      mining_started_at: isMining ? new Date().toISOString() : null,
    };

    if (body.subscription_tier !== undefined) {
      const requestedTier = parseSubscriptionTier(body.subscription_tier);
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", userId)
        .maybeSingle();

      const currentTier = parseSubscriptionTier(
        existingProfile?.subscription_tier
      );

      if (!existingProfile || currentTier === "hobbyist") {
        profilePatch.subscription_tier = requestedTier;
        console.log(
          "[VAULT TRACE] subscription_tier set:",
          requestedTier
        );
      }
    }

    console.log("[VAULT TRACE] Executing profiles update for user:", userId);

    const { data: updatedRows, error: dbError } = await supabase
      .from("profiles")
      .update(profilePatch)
      .eq("id", userId)
      .select("id");

    if (dbError) {
      console.error(
        "[VAULT TRACE] Database update rejected by Supabase:",
        dbError.message,
        dbError.details
      );
      return NextResponse.json(
        {
          ok: false,
          error: dbError.message,
          details: dbError.details ?? dbError.hint ?? undefined,
          step: "vault",
        } satisfies VaultErrorResponse,
        { status: 400 }
      );
    }

    if (!updatedRows?.length) {
      console.log(
        "[VAULT TRACE] No existing profile row matched update — attempting upsert insert"
      );

      const { data: upsertedRows, error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: userId,
            ...profilePatch,
          },
          { onConflict: "id" }
        )
        .select("id");

      if (upsertError) {
        console.error(
          "[VAULT TRACE] Database upsert rejected by Supabase:",
          upsertError.message,
          upsertError.details
        );
        return NextResponse.json(
          {
            ok: false,
            error: upsertError.message,
            details: upsertError.details ?? upsertError.hint ?? undefined,
            step: "vault",
          } satisfies VaultErrorResponse,
          { status: 400 }
        );
      }

      console.log("[VAULT TRACE] Database upsert succeeded:", upsertedRows);
    } else {
      console.log("[VAULT TRACE] Database update succeeded:", updatedRows);
    }

    try {
      const blueprint = await generateAndPersistUserBlueprint({
        supabase,
        userId,
        dna,
      });
      if (blueprint) {
        console.log(
          "[VAULT TRACE] Master blueprint saved:",
          blueprint.chosen_frameworks.join(", ")
        );
      }
    } catch (blueprintErr) {
      const message =
        blueprintErr instanceof Error
          ? blueprintErr.message
          : "Master blueprint generation failed";
      console.error(
        "[VAULT TRACE] Master blueprint failed (vault save still succeeded):",
        message
      );
    }

    try {
      const reflection = await generateInitialReflectionTasksForUser(
        userId,
        dna
      );
      if (reflection.ok && (reflection.inserted ?? 0) > 0) {
        console.log(
          `[VAULT TRACE] Day-1 reflection tasks seeded: ${reflection.inserted}`
        );
      } else if (!reflection.ok) {
        console.warn(
          "[VAULT TRACE] Day-1 reflection skipped:",
          reflection.error
        );
      }
    } catch (reflectionErr) {
      const message =
        reflectionErr instanceof Error
          ? reflectionErr.message
          : "Day-1 reflection failed";
      console.error(
        "[VAULT TRACE] Day-1 reflection failed (vault save still succeeded):",
        message
      );
    }

    console.log("[VAULT TRACE] ===== Vault save pipeline completed =====");
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof PipelineError) {
      console.error(
        "[VAULT TRACE] PipelineError:",
        error.message,
        error.details ?? ""
      );
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          details: error.details,
          step: error.step ?? "vault",
        } satisfies VaultErrorResponse,
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "Unexpected vault save error";

    console.error("[VAULT TRACE] Unhandled vault failure:", error);

    return NextResponse.json(
      {
        ok: false,
        error: message,
        details: message,
        step: null,
      } satisfies VaultErrorResponse,
      { status: 500 }
    );
  }
}
