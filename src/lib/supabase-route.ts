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

const ROUTE_AUTH_OPTIONS = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

/**
 * Clean client for JWT verification only — never set accessToken here.
 * getUser(bearer) must run on this instance, not on the RLS data client.
 */
function createAuthVerificationClient(): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
  return createClient(url, anonKey, {
    auth: ROUTE_AUTH_OPTIONS,
  });
}

/**
 * PostgREST / RLS client — JWT forwarded via Authorization header only.
 */
function createBearerDataClient(bearer: string): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${bearer}`,
      },
    },
    auth: ROUTE_AUTH_OPTIONS,
  });
}

async function createCookieDataClient(): Promise<SupabaseClient> {
  const { url, anonKey } = getSupabaseEnv();
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

/**
 * Route-handler Supabase client for database operations (RLS-scoped).
 * Bearer: Authorization header only. Cookie: SSR session client.
 */
export async function createRouteHandlerSupabase(
  request: Request
): Promise<SupabaseClient> {
  const bearer = extractBearerToken(request);

  if (bearer) {
    console.log("[AUTH] Data client: Authorization Bearer (header only)");
    return createBearerDataClient(bearer);
  }

  console.log("[AUTH] Data client: cookie session (SSR)");
  return createCookieDataClient();
}

export type RouteHandlerAuth =
  | { ok: true; supabase: SupabaseClient; user: User }
  | { ok: false; authError: string | null };

/**
 * Verifies the session on a clean auth client, then returns a data client for RLS writes.
 */
export async function authenticateRouteHandler(
  request: Request,
  existingDataClient?: SupabaseClient
): Promise<RouteHandlerAuth> {
  const bearer = extractBearerToken(request);

  if (bearer) {
    const authVerificationClient = createAuthVerificationClient();
    const { data, error } =
      await authVerificationClient.auth.getUser(bearer);

    if (error || !data.user) {
      console.error(
        "[AUTH] Bearer session validation failed:",
        error?.message ?? "no user on token"
      );
      return { ok: false, authError: error?.message ?? null };
    }

    const supabase = existingDataClient ?? createBearerDataClient(bearer);
    return { ok: true, supabase, user: data.user };
  }

  const supabase = existingDataClient ?? (await createCookieDataClient());
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    console.error(
      "[AUTH] Cookie session validation failed:",
      error?.message ?? "no user in cookie session"
    );
    return { ok: false, authError: error?.message ?? null };
  }

  return { ok: true, supabase, user: data.user };
}

export async function resolveRouteHandlerUserId(
  request: Request,
  supabase?: SupabaseClient
): Promise<string | null> {
  const auth = await authenticateRouteHandler(request, supabase);
  return auth.ok ? auth.user.id : null;
}
