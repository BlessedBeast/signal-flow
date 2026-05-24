import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let supabaseBrowserInstance: SupabaseClient | null = null;

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC Supabase environment variables.");
  }

  return { url, anonKey };
}

export function createBrowserSupabase(): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();

  if (typeof window === "undefined") {
    return createBrowserClient(url, anonKey);
  }

  if (!supabaseBrowserInstance) {
    supabaseBrowserInstance = createBrowserClient(url, anonKey);
  }

  return supabaseBrowserInstance;
}
