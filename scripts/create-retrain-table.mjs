import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const sql = `
CREATE TABLE IF NOT EXISTS retrain_purchases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  stripe_session_id TEXT NOT NULL UNIQUE,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS retrain_purchases_user_id_idx ON retrain_purchases(user_id);
`;

const { data, error } = await supabase.rpc("exec_sql", { sql }).catch(() => ({ data: null, error: { message: "rpc not available" } }));

if (error) {
  // Try direct REST approach
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql }),
  });
  const text = await res.text();
  console.log("REST response:", res.status, text);
} else {
  console.log("Table created:", data);
}
