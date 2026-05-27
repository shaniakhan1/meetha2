import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Reset all transformation_card_url values to NULL so users can regenerate with the fixed renderer
const { data, error } = await supabase
  .from("profiles")
  .update({ transformation_card_url: null })
  .not("transformation_card_url", "is", null);

if (error) {
  console.error("Error resetting:", error);
  process.exit(1);
}
console.log("Reset complete. Rows affected:", data?.length ?? "unknown (update returns null for count)");

// Verify
const { data: check, error: checkErr } = await supabase
  .from("profiles")
  .select("id, transformation_card_url")
  .not("transformation_card_url", "is", null);

if (checkErr) {
  console.error("Check error:", checkErr);
} else {
  console.log("Remaining non-null transformation_card_url rows:", check?.length ?? 0);
}
