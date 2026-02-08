import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

let _client: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client using the service role key.
 * Service role bypasses RLS -- needed for the MCP server to manage atoms.
 */
export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars",
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _client;
}
