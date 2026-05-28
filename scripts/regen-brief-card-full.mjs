// Regenerate identity brief card for user 10 with proper hero image
import { createClient } from "@supabase/supabase-js";
import { loadImage, createCanvas, GlobalFonts } from "@napi-rs/canvas";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

async function storagePut(key, buffer, contentType) {
  const res = await fetch(`${FORGE_URL}/storage/put`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FORGE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key,
      data: buffer.toString("base64"),
      contentType,
      encoding: "base64",
    }),
  });
  if (!res.ok) throw new Error(`storagePut failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return { key: json.key || key, url: json.url || `/manus-storage/${key}` };
}

// Import the renderer dynamically using tsx
async function main() {
  // Get user 10's brief and most recent generation
  const { data: profile } = await sb.from("profiles").select("aesthetic_brief").eq("user_id", 10).single();
  const { data: gens } = await sb.from("generations").select("image_url").eq("user_id", 10).order("created_at", { ascending: false }).limit(1);

  const brief = profile?.aesthetic_brief;
  const rawHeroUrl = gens?.[0]?.image_url ?? null;
  
  if (!brief) { console.log("No brief found for user 10"); return; }

  // Fetch hero image bytes
  let heroBuffer = null;
  if (rawHeroUrl) {
    const heroFullUrl = rawHeroUrl.startsWith("http") ? rawHeroUrl : "https://meetha.studio" + rawHeroUrl;
    console.log("Fetching hero image:", heroFullUrl.substring(0, 80));
    const imgRes = await fetch(heroFullUrl);
    if (imgRes.ok) {
      heroBuffer = Buffer.from(await imgRes.arrayBuffer());
      console.log("Hero image fetched, size:", heroBuffer.length);
    } else {
      console.log("Hero fetch failed:", imgRes.status);
    }
  }

  // Use tsx to import the TypeScript renderer
  const { execSync } = await import("child_process");
  
  // Write a temp runner
  const runner = `
import { renderIdentityBriefCard } from './server/identityBriefCard.ts';
import fs from 'fs';
const brief = ${JSON.stringify(brief)};
const heroPath = ${heroBuffer ? `'/tmp/hero-img.bin'` : 'null'};
const heroBuffer = heroPath ? fs.readFileSync(heroPath) : null;
const cardBuffer = await renderIdentityBriefCard(brief, heroBuffer);
fs.writeFileSync('/tmp/brief-card-output.png', cardBuffer);
console.log('Card rendered, size:', cardBuffer.length);
`;
  fs.writeFileSync("/tmp/brief-card-runner.mts", runner);
  if (heroBuffer) fs.writeFileSync("/tmp/hero-img.bin", heroBuffer);
  
  execSync("cd /home/ubuntu/meetha && node --import tsx/esm /tmp/brief-card-runner.mts", { stdio: "inherit" });
  
  const cardBuffer = fs.readFileSync("/tmp/brief-card-output.png");
  const key = `identity-brief/10-regen-${Date.now()}.png`;
  const { url } = await storagePut(key, cardBuffer, "image/png");
  
  await sb.from("profiles").update({ identity_brief_card_url: url }).eq("user_id", 10);
  console.log("Card regenerated and saved:", url);
}

main().catch(console.error);
