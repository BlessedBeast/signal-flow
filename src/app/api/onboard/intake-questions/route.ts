import { NextResponse } from "next/server";
import { z } from "zod";

import { resolveAuthenticatedUserId } from "@/lib/onboard-pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const OPENAI_MODEL = "gpt-4o";

const intakeRequestSchema = z.object({
  mirror: z.object({
    brandName: z.string().min(1),
    targetPersona: z.string().min(1),
    coreFriction: z.string().min(1),
    url: z.string().url().optional(),
    oneLiner: z.string().optional(),
  }),
  frameworkSlugs: z.array(z.string().min(1)).min(1).max(3),
});

const intakeResponseSchema = z.object({
  questions: z.array(z.string().min(16)).min(2).max(3),
});

function sanitizeOpenAiJsonResponse(rawResponse: string): string {
  let clean = rawResponse.trim();

  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
  }

  return clean;
}

function buildPrompt(input: z.infer<typeof intakeRequestSchema>): string {
  return `You are a founder-intake strategist.

You will generate 2-3 hyper-specific questions for onboarding.

INPUT CONTEXT
- Brand: ${input.mirror.brandName}
- URL: ${input.mirror.url ?? "(not provided)"}
- One-liner: ${input.mirror.oneLiner ?? "(not provided)"}
- Target persona: ${input.mirror.targetPersona}
- Core friction: ${input.mirror.coreFriction}
- Selected framework slugs: ${input.frameworkSlugs.join(", ")}

MANDATORY STRATEGIC LENSES
- StoryBrand identity mapping (character, problem, guide, plan, stakes)
- Value Equation (dream outcome, perceived likelihood, time delay, effort/sacrifice)

QUESTION QUALITY RULES
- Ask exactly 2 or 3 questions.
- Each question must be piercing, specific, and answerable in 1-3 sentences.
- Questions must uncover friction details, revenue context, proof assets, or founder-origin specifics needed to execute the selected frameworks.
- No generic prompts like "tell me more about your business".
- Keep each question under 240 characters.

Return strict JSON only:
{
  "questions": ["...", "..."]
}`;
}

export async function POST(request: Request) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = intakeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid intake payload" },
        { status: 400 }
      );
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.45,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You generate tactical founder intake questions for growth frameworks.",
          },
          { role: "user", content: buildPrompt(parsed.data) },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      return NextResponse.json(
        { ok: false, error: `OpenAI returned ${response.status}: ${detail}` },
        { status: 502 }
      );
    }

    const completion = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const rawContent = completion.choices?.[0]?.message?.content?.trim();
    if (!rawContent) {
      return NextResponse.json(
        { ok: false, error: "OpenAI returned empty intake response" },
        { status: 502 }
      );
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(sanitizeOpenAiJsonResponse(rawContent));
    } catch {
      return NextResponse.json(
        { ok: false, error: "OpenAI returned invalid intake JSON" },
        { status: 502 }
      );
    }

    const validated = intakeResponseSchema.safeParse(parsedJson);
    if (!validated.success) {
      return NextResponse.json(
        {
          ok: false,
          error: `OpenAI intake schema mismatch: ${validated.error.message}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, ...validated.data }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Intake question generation failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

