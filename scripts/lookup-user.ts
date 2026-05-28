import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const sb = createClient(url, key);

  const email = process.argv[2] || "sarah@flpmarketinggroup.com";

  const { data: users, error } = await sb
    .from("users")
    .select("id, email, name, created_at")
    .eq("email", email);

  console.log("Users:", JSON.stringify(users, null, 2));
  if (error) console.log("User error:", error);

  if (users && users[0]) {
    const { data: profile, error: profErr } = await sb
      .from("profiles")
      .select("*")
      .eq("user_id", users[0].id)
      .single();
    console.log("Profile:", JSON.stringify(profile, null, 2));
    if (profErr) console.log("Profile error:", profErr);
  }
}

main().catch(console.error);
