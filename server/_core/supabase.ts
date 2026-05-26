/**
 * Supabase server-side client (service role - full access, bypasses RLS)
 * Use this for all server-side DB operations.
 */
import { createClient } from "@supabase/supabase-js";
import { ENV } from "./env";

let _client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!_client) {
    if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
    }
    _client = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });
  }
  return _client;
}
