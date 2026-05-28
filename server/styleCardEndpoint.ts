/**
 * GET /api/style-card/:generationId
 *
 * Serves the style card for a generation, always using the final selected_hook.
 *
 * Fast path: if card_url is already stored, fetch it and composite the
 * selected_hook text over the image area (no LLM call needed).
 *
 * Slow path: if card_url is not yet ready, render the full card from scratch
 * (LLM brief + canvas render). This covers the rare case where the background
 * job hasn't finished yet.
 *
 * Ownership is checked before any rendering.
 */
import path from "path";
import { fileURLToPath } from "url";
import type { Request, Response } from "express";
import sharp from "sharp";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { authenticateRequest } from "./_core/auth";
import { getSupabase } from "./_core/supabase";
import { buildStyleCard, generateIdentityBrief, SCENE_LABELS } from "./styleCard";
import { storageGetSignedUrl } from "./storage";

// ESM-safe __dirname
const _thisDir = (() => {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return typeof __dirname !== "undefined" ? __dirname : process.cwd();
  }
})();

let _fontsRegistered = false;
function ensureFonts() {
  if (_fontsRegistered) return;
  const fontsDir = path.join(_thisDir, "fonts");
  GlobalFonts.registerFromPath(path.join(fontsDir, "LiberationSans-Regular.ttf"), "MeethaFont");
  GlobalFonts.registerFromPath(path.join(fontsDir, "LiberationSans-Bold.ttf"), "MeethaFont");
  _fontsRegistered = true;
}

function sanitizeText(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, ",")
    .replace(/\u2026/g, "...")
    .replace(/[\u2022\u2023\u25E6\u2043]/g, "-")
    .replace(/[^\x00-\x7F]/g, (ch) => {
      const map: Record<string, string> = {
        "\u00E9": "e", "\u00E8": "e", "\u00EA": "e", "\u00EB": "e",
        "\u00E0": "a", "\u00E1": "a", "\u00E2": "a", "\u00E4": "a",
        "\u00F6": "o", "\u00F3": "o", "\u00F4": "o",
        "\u00FC": "u", "\u00FA": "u", "\u00FB": "u",
        "\u00F1": "n", "\u00E7": "c",
      };
      return map[ch] ?? "";
    });
}

type CanvasCtx = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

function wrapText(ctx: CanvasCtx, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Composite hook text onto an existing card image buffer.
 * The card is 1080x1350; the image area is the top ~820px.
 */
async function compositeHookOntoCard(cardBuffer: Buffer, hook: string): Promise<Buffer> {
  ensureFonts();

  const CARD_W = 1080;
  const IMAGE_H = 820;

  // Build a transparent overlay with just the hook text + scrim
  const overlayCanvas = createCanvas(CARD_W, IMAGE_H);
  const ctx = overlayCanvas.getContext("2d");

  const hookText = sanitizeText(hook);

  // Gradient scrim
  const scrim = ctx.createLinearGradient(0, IMAGE_H - 220, 0, IMAGE_H);
  scrim.addColorStop(0, "rgba(13,10,7,0)");
  scrim.addColorStop(1, "rgba(13,10,7,0.72)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, IMAGE_H - 220, CARD_W, 220);

  // Hook text
  const HOOK_FONT_SIZE = 44;
  ctx.font = `italic ${HOOK_FONT_SIZE}px MeethaFont`;
  ctx.fillStyle = "rgba(253,250,245,0.96)";
  ctx.textAlign = "center";
  const hookLines = wrapText(ctx, hookText, CARD_W - 120);
  const hookLineH = HOOK_FONT_SIZE * 1.35;
  const totalHookH = hookLines.length * hookLineH;
  let hookY = IMAGE_H - 60 - totalHookH + HOOK_FONT_SIZE;
  for (const line of hookLines.slice(0, 3)) {
    ctx.fillText(line, CARD_W / 2, hookY);
    hookY += hookLineH;
  }

  const overlayBuf = overlayCanvas.toBuffer("image/png") as Buffer;

  // Composite overlay onto the card at top-left (covers image area only)
  return sharp(cardBuffer)
    .composite([{ input: overlayBuf, top: 0, left: 0 }])
    .jpeg({ quality: 92 })
    .toBuffer();
}

async function fetchBuffer(url: string): Promise<Buffer> {
  let fetchUrl = url;
  if (fetchUrl.startsWith("/manus-storage/")) {
    const key = fetchUrl.replace("/manus-storage/", "");
    fetchUrl = await storageGetSignedUrl(key);
  }
  const res = await fetch(fetchUrl);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${fetchUrl}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function handleStyleCard(req: Request, res: Response) {
  const { generationId } = req.params;

  if (!generationId || isNaN(Number(generationId))) {
    return res.status(400).json({ error: "Invalid generation ID" });
  }

  // Authenticate
  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Fetch generation record
  const genResult = await getSupabase()
    .from("generations")
    .select("id, user_id, image_url, card_url, selected_hook, archetype, mood, scene_category")
    .eq("id", Number(generationId))
    .single();

  const generation = genResult.data as {
    id: number;
    user_id: number;
    image_url: string;
    card_url: string | null;
    selected_hook: string | null;
    archetype: string;
    mood: string;
    scene_category: string | null;
  } | null;

  if (genResult.error || !generation) {
    return res.status(404).json({ error: "Generation not found" });
  }

  // Ownership check
  if (generation.user_id !== user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Template title is the canonical overlay text. Hook phrases are no longer shown.
  const templateTitle = generation.scene_category
    ? (SCENE_LABELS[generation.scene_category] ?? null)
    : null;

  try {
    let cardBuffer: Buffer;

    if (generation.card_url) {
      // Fast path: fetch stored card.
      // The stored card was generated with the old hook overlay; re-render from
      // the original image so the new template-title layout is applied.
      // Fall through to slow path to ensure correct overlay.
      let imageUrl = generation.image_url;
      if (imageUrl.startsWith("/manus-storage/")) {
        const key = imageUrl.replace("/manus-storage/", "");
        imageUrl = await storageGetSignedUrl(key);
      }
      const profileResult = await getSupabase()
        .from("profiles")
        .select("aesthetic_descriptors, niche")
        .eq("user_id", user.id)
        .single();
      const profile = profileResult.data as { aesthetic_descriptors: string | null; niche: string | null } | null;
      const brief = await generateIdentityBrief({
        archetype: generation.archetype,
        mood: generation.mood,
        sceneCategory: generation.scene_category,
        aestheticDescriptors: profile?.aesthetic_descriptors ?? null,
        niche: profile?.niche ?? null,
      });
      cardBuffer = await buildStyleCard({
        imageUrl,
        brief,
        templateTitle,
      });
    } else {
      // Slow path: full render (background job not done yet)
      const profileResult = await getSupabase()
        .from("profiles")
        .select("aesthetic_descriptors, niche")
        .eq("user_id", user.id)
        .single();
      const profile = profileResult.data as { aesthetic_descriptors: string | null; niche: string | null } | null;

      let imageUrl = generation.image_url;
      if (imageUrl.startsWith("/manus-storage/")) {
        const key = imageUrl.replace("/manus-storage/", "");
        imageUrl = await storageGetSignedUrl(key);
      }

      const brief = await generateIdentityBrief({
        archetype: generation.archetype,
        mood: generation.mood,
        sceneCategory: generation.scene_category,
        aestheticDescriptors: profile?.aesthetic_descriptors ?? null,
        niche: profile?.niche ?? null,
      });

      cardBuffer = await buildStyleCard({
        imageUrl,
        brief,
        templateTitle,
      });
    }

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="meetha-style-card-${generationId}.jpg"`
    );
    return res.send(cardBuffer);
  } catch (err) {
    console.error("[StyleCard] Render error:", err);
    return res.status(500).json({ error: "Failed to render style card" });
  }
}
