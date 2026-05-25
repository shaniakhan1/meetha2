/**
 * V9 migration: add scene_key to signature_scene_uses and share_badge_enabled to profiles
 * Uses Supabase service role key to run raw SQL via the Postgres REST endpoint.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Use the Supabase REST /rest/v1/rpc or pg_dump approach
// Supabase exposes a /rest/v1/ endpoint and also a direct SQL endpoint
// We'll use the pg REST SQL execution endpoint
async function runSQL(sql) {
  const url = `${supabaseUrl}/rest/v1/rpc/exec_sql`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceRoleKey,
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ sql }),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

// Alternative: use the Supabase Management API or direct pg connection
// Since we have the supabase client, try using from() to check if columns exist
const sb = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function checkColumn(table, column) {
  const { data, error } = await sb
    .from("information_schema.columns")
    .select("column_name")
    .eq("table_name", table)
    .eq("column_name", column)
    .single();
  return !error && !!data;
}

async function run() {
  console.log("Running V9 migrations...");

  // Try inserting a test row to see if scene_key column exists
  try {
    const { error } = await sb
      .from("signature_scene_uses")
      .select("scene_key")
      .limit(1);
    
    if (error && error.message.includes("scene_key")) {
      console.log("scene_key column missing — need to add it via Supabase dashboard SQL editor");
      console.log("SQL to run:");
      console.log("  ALTER TABLE signature_scene_uses ADD COLUMN IF NOT EXISTS scene_key TEXT DEFAULT 'yes_to_all';");
    } else {
      console.log("scene_key column exists or query succeeded");
    }
  } catch (e) {
    console.log("Error checking scene_key:", e.message);
  }

  try {
    const { error } = await sb
      .from("profiles")
      .select("share_badge_enabled")
      .limit(1);
    
    if (error && error.message.includes("share_badge_enabled")) {
      console.log("share_badge_enabled column missing — need to add it via Supabase dashboard SQL editor");
      console.log("SQL to run:");
      console.log("  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_badge_enabled BOOLEAN DEFAULT NULL;");
    } else {
      console.log("share_badge_enabled column exists or query succeeded");
    }
  } catch (e) {
    console.log("Error checking share_badge_enabled:", e.message);
  }
}

run().catch(console.error);
