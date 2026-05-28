// Regenerate identity brief card for user 10 with proper hero image
import { createClient } from "@supabase/supabase-js";
import { renderIdentityBriefCard } from "../server/identityBriefCard.ts";
import { storagePut } from "../server/storage.ts";

const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: profile } = await sb.from("profiles").select("aesthetic_brief").eq("user_id", 10).single();
  const { data: gens } = await sb.from("generations").select("image_url").eq("user_id", 10).order("created_at", { ascending: false }).limit(1);

  const brief = profile?.aesthetic_brief as Parameters<typeof renderIdentityBriefCard>[0];
  const rawHeroUrl = (gens as any)?.[0]?.image_url ?? null;

  if (!brief) { console.log("No brief found"); return; }

  let heroBuffer: Buffer | null = null;
  if (rawHeroUrl) {
    const heroFullUrl = rawHeroUrl.startsWith("http") ? rawHeroUrl : `https://meetha.studio${rawHeroUrl}`;
    console.log("Fetching hero:", heroFullUrl.substring(0, 80));
    const imgRes = await fetch(heroFullUrl);
    if (imgRes.ok) {
      heroBuffer = Buffer.from(await imgRes.arrayBuffer());
      console.log("Hero fetched, size:", heroBuffer.length);
    }
  }

  console.log("Rendering card...");
  const cardBuffer = await renderIdentityBriefCard(brief, heroBuffer);
  const key = `identity-brief/10-regen-${Date.now()}.png`;
  const { url } = await storagePut(key, cardBuffer, "image/png");
  await sb.from("profiles").update({ identity_brief_card_url: url }).eq("user_id", 10);
  console.log("Done! Card URL:", url);
}

main().catch(console.error);
