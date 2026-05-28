import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { error } = await sb.from("event_log").select("id").limit(1);
if (!error) {
  console.log("TABLE EXISTS");
} else {
  console.log("TABLE MISSING:", error.message);
}
