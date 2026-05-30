import { NextResponse } from "next/server";

import { parseSubscriptionTier } from "@/lib/billing/tiers";
import { fetchUserSubscriptionTier } from "@/lib/billing/user-billing";
import {
  buildProfilePatchRow,
  buildProfileUpsertRow,
  type ProfilePatchRow,
} from "@/lib/onboard/onboard-mappers";
import { generateAndPersistUserBlueprint } from "@/lib/onboard/blueprint-engine";
import { PipelineError } from "@/lib/onboard-pipeline";
import { parseClientProductDna } from "@/lib/product-dna-schema";
import { generateInitialReflectionTasksForUser } from "@/lib/reflection/reflection-pipeline";
import { executeLeadHunt } from "@/lib/mining/hunt-pipeline";
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
  persona_context?: unknown;
};

type VaultErrorResponse = {
  ok: false;
  error: string;
  details?: string;
  step: string | null;
};

function triggerDayOneWarmup(userId: string, dna: ProductDNA) {
  // Fire-and-forget warmup so dashboard first-load lands with hydrated leads/tasks.
  void executeLeadHunt(userId)
    .then((result) => {
      console.log(
        `[VAULT TRACE] Day-1 lead warmup completed: released=${result.released}, queued=${result.queued}`
      );
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[VAULT TRACE] Day-1 lead warmup failed:", message);
    });

  void generateInitialReflectionTasksForUser(userId, dna)
    .then((reflection) => {
      if (reflection.ok) {
        console.log(
          `[VAULT TRACE] Day-1 reflection warmup completed: inserted=${reflection.inserted ?? 0}`
        );
      } else {
        console.warn("[VAULT TRACE] Day-1 reflection warmup skipped:", reflection.error);
      }
    })
    .catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[VAULT TRACE] Day-1 reflection warmup failed:", message);
    });
}

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

    const tier = await fetchUserSubscriptionTier(supabase, userId);

    let dna: ProductDNA;
    try {
      dna = parseClientProductDna(body.dna, tier);
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

    const profilePatch: ProfilePatchRow = buildProfilePatchRow({
      dna,
      isMining,
    });
    if (body.persona_context !== undefined) {
      profilePatch.persona_context = body.persona_context;
    }

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .maybeSingle();

    const currentTier = parseSubscriptionTier(existingProfile?.subscription_tier);

    if (body.subscription_tier !== undefined) {
      const requestedTier = parseSubscriptionTier(body.subscription_tier);

      if (!existingProfile || currentTier === "free") {
        profilePatch.subscription_tier = requestedTier;
        console.log(
          "[VAULT TRACE] subscription_tier set:",
          requestedTier
        );
      }
    } else if (!existingProfile) {
      profilePatch.subscription_tier = "free";
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
          buildProfileUpsertRow(userId, profilePatch),
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

    triggerDayOneWarmup(userId, dna);

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
