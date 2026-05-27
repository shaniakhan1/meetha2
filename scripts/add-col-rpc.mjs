import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Try calling a raw SQL function via rpc
const { data, error } = await sb.rpc("exec_sql", {
  query: "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS transformation_card_url TEXT;"
});

if (error) {
  console.log("RPC error:", JSON.stringify(error));
  
  // Try direct REST approach
  const url = `${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": process.env.SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS transformation_card_url TEXT;" }),
  });
  console.log("Direct REST status:", res.status, await res.text());
} else {
  console.log("OK:", JSON.stringify(data));
}
