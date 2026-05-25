/**
 * V9 Supabase migration:
 * 1. Create signature_scene_uses table with scene_key column
 * 2. Add share_badge_enabled to profiles
 *
 * Uses the Supabase Management API (requires a personal access token or service role).
 * We'll use the pg connection string from Supabase if available, otherwise
 * fall back to using the REST API with a raw SQL function.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Extract project ref from URL: https://{ref}.supabase.co
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error("Could not extract project ref from SUPABASE_URL:", supabaseUrl);
  process.exit(1);
}

console.log("Project ref:", projectRef);

// Use the Supabase Management API to run SQL
// This requires the service role key as a bearer token
async function runManagementSQL(sql) {
  const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

async function run() {
  console.log("Running V9 Supabase migrations...\n");

  // 1. Create signature_scene_uses table
  const r1 = await runManagementSQL(`
    CREATE TABLE IF NOT EXISTS signature_scene_uses (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      scene_key TEXT NOT NULL DEFAULT 'yes_to_all',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("signature_scene_uses table:", r1.status, r1.body.slice(0, 200));

  // 2. Add scene_key to existing signature_scene_uses if it exists without it
  const r2 = await runManagementSQL(`
    ALTER TABLE signature_scene_uses ADD COLUMN IF NOT EXISTS scene_key TEXT NOT NULL DEFAULT 'yes_to_all';
  `);
  console.log("scene_key column:", r2.status, r2.body.slice(0, 200));

  // 3. Add share_badge_enabled to profiles
  const r3 = await runManagementSQL(`
    ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_badge_enabled BOOLEAN DEFAULT NULL;
  `);
  console.log("share_badge_enabled column:", r3.status, r3.body.slice(0, 200));

  // Verify by querying
  const sb = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  
  const { error: e1 } = await sb.from("signature_scene_uses").select("scene_key").limit(1);
  console.log("\nVerification - signature_scene_uses.scene_key:", e1 ? "ERROR: " + e1.message : "OK");
  
  const { error: e2 } = await sb.from("profiles").select("share_badge_enabled").limit(1);
  console.log("Verification - profiles.share_badge_enabled:", e2 ? "ERROR: " + e2.message : "OK");
}

run().catch(console.error);
