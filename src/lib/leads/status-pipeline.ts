import { z } from "zod";

import { DISCOVERY_LEADS_TABLE } from "@/lib/discovery/lead-bank";
import { resolveAuthenticatedUserId } from "@/lib/onboard-pipeline";
import type { LeadStatus } from "@/lib/signalflow-types";
import { supabaseServer } from "@/lib/supabase-server";

const statusBodySchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(["replied", "archived"]),
});

export class StatusError extends Error {
  constructor(
    message: string,
    public readonly status: number = 500,
    public readonly step?: string
  ) {
    super(message);
    this.name = "StatusError";
  }
}

export type StatusResult = {
  ok: true;
  leadId: string;
  status: LeadStatus;
};

export { resolveAuthenticatedUserId };

export function parseStatusBody(body: unknown): {
  leadId: string;
  status: "replied" | "archived";
} {
  const parsed = statusBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new StatusError(
      "Invalid body: leadId and status ('replied' | 'archived') required",
      400,
      "body"
    );
  }
  return parsed.data;
}

export async function updateLeadStatus(
  userId: string,
  leadId: string,
  status: "replied" | "archived"
): Promise<StatusResult> {
  const { data, error } = await supabaseServer
    .from(DISCOVERY_LEADS_TABLE)
    .update({ status })
    .eq("id", leadId)
    .eq("user_id", userId)
    .select("id, status")
    .maybeSingle();

  if (error) {
    throw new StatusError(
      `Failed to update lead status: ${error.message}`,
      500,
      "update"
    );
  }

  if (!data) {
    throw new StatusError("Lead not found", 404, "lead");
  }

  return {
    ok: true,
    leadId: data.id as string,
    status: data.status as LeadStatus,
  };
}
