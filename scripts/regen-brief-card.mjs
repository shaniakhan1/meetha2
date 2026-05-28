// Regenerate identity brief card for users with broken hero images
import { createClient } from "@supabase/supabase-js";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Minimal card renderer that just tests if hero image loads
async function testHeroLoad(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, status: res.status };
    const buf = Buffer.from(await res.arrayBuffer());
    const img = await loadImage(buf);
    return { ok: true, size: buf.length, dims: `${img.width}x${img.height}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  // Get user 10's data
  const { data: profile } = await sb.from("profiles").select("user_id, aesthetic_brief, identity_brief_card_url").eq("user_id", 10).single();
  const { data: gens } = await sb.from("generations").select("image_url, created_at").eq("user_id", 10).order("created_at", { ascending: false }).limit(3);
  
  console.log("Profile brief keys:", profile?.aesthetic_brief ? Object.keys(profile.aesthetic_brief) : "NULL");
  console.log("Current card URL:", profile?.identity_brief_card_url);
  console.log("Recent generations:", gens?.map(g => g.image_url?.substring(0, 80)));
  
  if (gens && gens.length > 0) {
    const rawUrl = gens[0].image_url;
    const fullUrl = rawUrl.startsWith("http") ? rawUrl : "https://meetha.studio" + rawUrl;
    console.log("\nTesting hero image load from:", fullUrl.substring(0, 80));
    const result = await testHeroLoad(fullUrl);
    console.log("Hero load result:", result);
  }
}

main().catch(console.error);
