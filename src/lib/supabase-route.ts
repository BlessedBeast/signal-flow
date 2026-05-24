import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
    return createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${bearer}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
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

export async function resolveRouteHandlerUserId(
  request: Request,
  supabase: SupabaseClient
): Promise<string | null> {
  const bearer = extractBearerToken(request);
  if (bearer) {
    const { data, error } = await supabase.auth.getUser(bearer);
    if (error || !data.user?.id) {
      console.error(
        "[VAULT TRACE] Bearer session validation failed:",
        error?.message ?? "no user on token"
      );
      return null;
    }
    return data.user.id;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    console.error(
      "[VAULT TRACE] Cookie session validation failed:",
      error?.message ?? "no user in cookie session"
    );
    return null;
  }

  return data.user.id;
}
