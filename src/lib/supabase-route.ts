import { createServerClient } from "@supabase/ssr";
import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return { url, anonKey };
}

function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  const token = auth.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Route-handler Supabase client scoped to the incoming request session.
 * Prefers Authorization Bearer (current SPA pattern), then cookie session.
 */
export async function createRouteHandlerSupabase(
  request: Request
): Promise<SupabaseClient> {
  const { url, anonKey } = getSupabaseEnv();
  const bearer = extractBearerToken(request);

  if (bearer) {
    console.log("[AUTH] Supabase client context: Authorization Bearer");
    // accessToken + Authorization header bind the JWT to PostgREST so auth.uid() matches RLS.
    return createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      },
      accessToken: async () => bearer,
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  console.log("[AUTH] Supabase client context: cookie session (SSR)");
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll may fail outside a mutable Server Action / Route Handler.
        }
      },
    },
  });
}

export type RouteHandlerAuth =
  | { ok: true; supabase: SupabaseClient; user: User }
  | { ok: false; authError: string | null };

/** Validates the request session and returns a user-scoped Supabase client for RLS writes. */
export async function authenticateRouteHandler(
  request: Request,
  existingClient?: SupabaseClient
): Promise<RouteHandlerAuth> {
  const supabase = existingClient ?? (await createRouteHandlerSupabase(request));
  const bearer = extractBearerToken(request);
  const { data, error } = bearer
    ? await supabase.auth.getUser(bearer)
    : await supabase.auth.getUser();

  if (error || !data.user) {
    console.error(
      "[AUTH] Route handler session validation failed:",
      error?.message ?? "no user on session"
    );
    return { ok: false, authError: error?.message ?? null };
  }

  return { ok: true, supabase, user: data.user };
}

export async function resolveRouteHandlerUserId(
  request: Request,
  supabase: SupabaseClient
): Promise<string | null> {
  const auth = await authenticateRouteHandler(request, supabase);
  return auth.ok ? auth.user.id : null;
}
