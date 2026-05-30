import { NextResponse } from "next/server";
import { z } from "zod";

import {
  FrameworkEngineError,
  generateProactivePost,
} from "@/lib/frameworks/framework-engine";
import {
  createRouteHandlerSupabase,
  resolveRouteHandlerUserId,
} from "@/lib/supabase-route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const requestSchema = z.object({
  frameworkSlug: z.string().min(1),
  advancePlaybookStep: z.boolean().optional().default(true),
});

type GeneratePostErrorResponse = {
  ok: false;
  error: string;
  step: string | null;
};

export async function POST(request: Request) {
  try {
    const supabase = await createRouteHandlerSupabase(request);
    const userId = await resolveRouteHandlerUserId(request, supabase);

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required",
          step: "auth",
        } satisfies GeneratePostErrorResponse,
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid JSON body",
          step: "body",
        } satisfies GeneratePostErrorResponse,
        { status: 400 }
      );
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "frameworkSlug is required",
          step: "body",
        } satisfies GeneratePostErrorResponse,
        { status: 400 }
      );
    }

    const result = await generateProactivePost(
      userId,
      parsed.data.frameworkSlug,
      { advancePlaybookStep: parsed.data.advancePlaybookStep }
    );

    return NextResponse.json(
      {
        ok: true,
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof FrameworkEngineError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          step: error.step ?? "framework-engine",
        } satisfies GeneratePostErrorResponse,
        { status: error.status }
      );
    }

    const message =
      error instanceof Error ? error.message : "Post generation failed";
    return NextResponse.json(
      {
        ok: false,
        error: message,
        step: "framework-engine",
      } satisfies GeneratePostErrorResponse,
      { status: 500 }
    );
  }
}

