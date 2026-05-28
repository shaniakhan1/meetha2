/**
 * One-time migration: create event_log table in Supabase for structured monitoring.
 * Run with: node scripts/create-event-log-table.mjs
 */
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Use rpc to execute raw SQL via the service role
const { error } = await sb.rpc("exec_sql", {
  sql: `
    CREATE TABLE IF NOT EXISTS event_log (
      id bigserial PRIMARY KEY,
      event_type varchar(64) NOT NULL,
      user_id integer,
      metadata jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS event_log_event_type_created_at_idx
      ON event_log (event_type, created_at DESC);
    CREATE INDEX IF NOT EXISTS event_log_created_at_idx
      ON event_log (created_at DESC);
  `,
});

if (error) {
  // exec_sql may not be available — try direct insert approach instead
  console.log("exec_sql not available, trying alternative approach...");
  
  // Test if table already exists by trying to select from it
  const { error: selectError } = await sb
    .from("event_log")
    .select("id")
    .limit(1);
  
  if (!selectError) {
    console.log("event_log table already exists. Done.");
    process.exit(0);
  }
  
  console.error("Could not create event_log table via RPC:", error.message);
  console.log("\nPlease run this SQL in your Supabase SQL editor:");
  console.log(`
CREATE TABLE IF NOT EXISTS event_log (
  id bigserial PRIMARY KEY,
  event_type varchar(64) NOT NULL,
  user_id integer,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_log_event_type_created_at_idx
  ON event_log (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS event_log_created_at_idx
  ON event_log (created_at DESC);
  `);
  process.exit(1);
}

console.log("event_log table created successfully.");
