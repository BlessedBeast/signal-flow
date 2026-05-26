import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { DISCOVERY_LEADS_TABLE } from "@/lib/discovery/constants";
import { mapDbLeadToClient, type DbLeadRow } from "@/lib/leads/map-db-lead";
import { resolveAuthenticatedUserId } from "@/lib/onboard-pipeline";
import type { IntentTier, Lead } from "@/lib/signalflow-types";
import { parsePlatform } from "@/lib/signalflow-types";
import { supabaseServer } from "@/lib/supabase-server";

const ingestAlertBodySchema = z.object({
  content: z.string().min(1),
  platform: z.string().min(1),
  source_url: z.string().url(),
  author: z.string().min(1),
  intent_score: z.number().int().min(0).max(100),
  tier: z.enum(["HOT", "WARM", "COLD"]),
  plugText: z.string().nullable().optional(),
});

export type IngestAlertPayload = z.infer<typeof ingestAlertBodySchema>;

export class IngestAlertError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly step?: string
  ) {
    super(message);
    this.name = "IngestAlertError";
  }
}

export { resolveAuthenticatedUserId };

export function parseIngestAlertBody(body: unknown): IngestAlertPayload {
  const parsed = ingestAlertBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new IngestAlertError(
      "Invalid body: content, platform, source_url, author, intent_score, and tier are required",
      400,
      "body"
    );
  }
  return parsed.data;
}

function resolveIngestStatus(
  tier: IntentTier,
  plugText: string | null | undefined
): "active" | "drafted" {
  if (tier === "HOT" && plugText?.trim()) {
    return "drafted";
  }
  return "active";
}

export async function upsertDiscoveryLeadFromPlugMatch(
  supabase: SupabaseClient,
  userId: string,
  payload: IngestAlertPayload
): Promise<Lead> {
  const platform = parsePlatform(payload.platform);
  const plugDraft = payload.plugText?.trim() || null;
  const status = resolveIngestStatus(payload.tier, plugDraft);
  const aiDraft = payload.tier === "HOT" ? plugDraft : null;
  const releasedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from(DISCOVERY_LEADS_TABLE)
    .upsert(
      {
        user_id: userId,
        source_url: payload.source_url.trim(),
        platform,
        content: payload.content.trim(),
        intent_score: payload.intent_score,
        status,
        ai_draft_content: aiDraft,
        conversation_history: [],
        released_at: releasedAt,
      },
      { onConflict: "user_id,source_url" }
    )
    .select(
      "id, user_id, platform, source_url, content, intent_score, status, ai_draft_content, conversation_history, created_at, released_at"
    )
    .single();

  if (error) {
    throw new IngestAlertError(
      `Failed to ingest plug alert lead: ${error.message}`,
      500,
      "upsert"
    );
  }

  if (!data) {
    throw new IngestAlertError("Ingest returned no lead row", 500, "upsert");
  }

  const clientRow: DbLeadRow = {
    id: data.id as string,
    user_id: userId,
    platform: data.platform as string | null,
    source_url: data.source_url as string,
    content: data.content as string | null,
    intent_score: data.intent_score as number | null,
    status: data.status as string,
    ai_draft_content: data.ai_draft_content as string | null,
    conversation_history: data.conversation_history,
    created_at: data.created_at as string,
    released_at: data.released_at as string | null,
  };

  const lead = mapDbLeadToClient(clientRow);

  return {
    ...lead,
    author: payload.author.trim(),
  };
}

export async function ingestPlugAlertLead(
  userId: string,
  payload: IngestAlertPayload
): Promise<Lead> {
  return upsertDiscoveryLeadFromPlugMatch(
    supabaseServer,
    userId,
    payload
  );
}
