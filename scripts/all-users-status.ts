import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.SUPABASE_URL as string;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const sb = createClient(url, key);

  const { data: users, error: userErr } = await sb
    .from("users")
    .select("id, email, name, created_at")
    .order("created_at", { ascending: false });

  if (userErr) { console.log("User error:", userErr); return; }
  console.log(`Total users: ${users?.length ?? 0}\n`);
  if (!users || users.length === 0) return;

  const { data: profiles } = await sb
    .from("profiles")
    .select("user_id, lora_status, lora_training_request_id, archetype, mood, uploaded_photo_count");

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

  for (const user of users) {
    const p = profileMap.get(user.id);
    const status = p
      ? `lora_status=${p.lora_status ?? "null"} | photos=${p.uploaded_photo_count ?? 0} | archetype=${p.archetype ?? "none"}`
      : "NO PROFILE (never completed onboarding)";
    console.log(`[${user.id}] ${user.email} | name: ${user.name}`);
    console.log(`  joined: ${new Date(user.created_at).toISOString()}`);
    console.log(`  ${status}`);
    if (p?.lora_training_request_id) console.log(`  training_id: ${p.lora_training_request_id}`);
    console.log();
  }
}

main().catch(console.error);
