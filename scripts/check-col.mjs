import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await sb
  .from("profiles")
  .select("user_id, transformation_card_url")
  .limit(5);

if (error) {
  console.log("ERROR:", JSON.stringify(error));
} else {
  console.log("OK - rows:", JSON.stringify(data));
}
