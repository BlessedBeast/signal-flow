export type ApiErrorBody = {
  ok?: false;
  error?: string;
  step?: string | null;
};

/**
 * Safely parses a fetch Response — never throws on HTML/plain-text 500 bodies.
 */
export async function parseApiJsonResponse<T>(
  res: Response,
  logLabel: string
): Promise<
  | { ok: true; data: T }
  | { ok: false; error: string; step?: string | null; status: number }
> {
  const contentType = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[${logLabel}] Server Error Details:`, errorText);

    if (contentType.includes("application/json") && errorText.trim()) {
      try {
        const body = JSON.parse(errorText) as ApiErrorBody;
        return {
          ok: false,
          error:
            body.error ??
            (errorText.slice(0, 300) || `Request failed (${res.status})`),
          step: body.step ?? null,
          status: res.status,
        };
      } catch {
        /* fall through to raw text */
      }
    }

    return {
      ok: false,
      error:
        errorText.trim().slice(0, 300) ||
        `Request failed (${res.status})`,
      status: res.status,
    };
  }

  if (!contentType.includes("application/json")) {
    const text = await res.text();
    console.error(`[${logLabel}] Non-JSON success body:`, text.slice(0, 500));
    return {
      ok: false,
      error: "Server returned a non-JSON response",
      status: res.status,
    };
  }

  try {
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (parseError) {
    console.error(`[${logLabel}] JSON parse failed:`, parseError);
    return {
      ok: false,
      error: "Server returned invalid JSON",
      status: res.status,
    };
  }
}
