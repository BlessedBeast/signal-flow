import { NextResponse } from "next/server";

import {
  executePlugAlertsScan,
  fetchUserPlugAlerts,
  PlugAlertsError,
} from "@/lib/velocity/alerts-pipeline";
import { authenticateRouteHandler } from "@/lib/supabase-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

type PlugAlertsErrorResponse = {
  ok: false;
  error: string;
  step: string | null;
};

type PlugAlertsSuccessResponse = {
  ok: true;
  data: Awaited<ReturnType<typeof fetchUserPlugAlerts>>;
};

function jsonResponse<T>(body: T, status: number): NextResponse<T> {
  return NextResponse.json(body, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function plugAlertsErrorResponse(error: unknown): NextResponse<PlugAlertsErrorResponse> {
  if (error instanceof PlugAlertsError) {
    console.error("[PLUG ALERTS API]", error.message, { step: error.step });
    return jsonResponse(
      {
        ok: false,
        error: error.message,
        step: error.step ?? "plug-alerts-engine",
      },
      error.status
    );
  }

  const message =
    error instanceof Error
      ? error.message
      : "Unknown pipeline explosion";

  console.error("[PLUG ALERTS API] Unhandled error:", error);

  return jsonResponse(
    {
      ok: false,
      error: message,
      step: "plug-alerts-engine",
    },
    500
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const auth = await authenticateRouteHandler(request);
    if (!auth.ok) {
      return jsonResponse(
        {
          ok: false,
          error: "Authentication required",
          step: "auth",
        },
        401
      );
    }

    const result = await fetchUserPlugAlerts(auth.user.id, auth.supabase);
    return jsonResponse({ ok: true, data: result } satisfies PlugAlertsSuccessResponse, 200);
  } catch (error) {
    return plugAlertsErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    console.log("[PLUG ALERTS TRACE] Incoming POST /api/velocity/alerts");

    const auth = await authenticateRouteHandler(request);
    if (!auth.ok) {
      console.error("[PLUG ALERTS TRACE] Authentication failed");
      return jsonResponse(
        {
          ok: false,
          error: "Authentication required",
          step: "auth",
        },
        401
      );
    }

    console.log("[PLUG ALERTS TRACE] Authenticated user:", auth.user.id);

    const result = await executePlugAlertsScan(auth.user.id, auth.supabase);

    console.log("[PLUG ALERTS TRACE] Scan completed successfully");

    return jsonResponse({ ok: true, data: result } satisfies PlugAlertsSuccessResponse, 200);
  } catch (error) {
    console.error("[PLUG ALERTS TRACE] Fatal exception during scan:", error);
    return plugAlertsErrorResponse(error);
  }
}
