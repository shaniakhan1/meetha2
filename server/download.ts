/**
 * GET /api/download/:generationId
 *
 * Serves the generated image for download.
 * - Free tier: composites a subtle "MEETHA" text watermark via @napi-rs/canvas
 * - Starter / Pro: serves the original image unmodified (or with badge if opted in)
 *
 * Font approach: uses @napi-rs/canvas with GlobalFonts.registerFromPath().
 * This bypasses librsvg/SVG font issues and renders correctly on any server.
 */
import path from "path";
import { fileURLToPath } from "url";
import type { Request, Response } from "express";
import sharp from "sharp";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { authenticateRequest } from "./_core/auth";
import { getSupabase } from "./_core/supabase";
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

/**
 * Build a canvas-rendered watermark overlay.
 * Returns a PNG buffer (transparent background) with "MEETHA" bottom-right.
 */
function buildCanvasWatermark(imgWidth: number, imgHeight: number): Buffer {
  ensureFonts();
  const canvas = createCanvas(imgWidth, imgHeight);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, imgWidth, imgHeight);
  const fontSize = Math.round(imgWidth * 0.038);
  const pad = Math.round(imgWidth * 0.04);
  ctx.font = `bold ${fontSize}px MeethaFont`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.textAlign = "right";
  ctx.fillText("MEETHA", imgWidth - pad, imgHeight - pad);
  return canvas.toBuffer("image/png") as Buffer;
}

export async function handleDownload(req: Request, res: Response) {
  const { generationId } = req.params;

  if (!generationId || isNaN(Number(generationId))) {
    return res.status(400).json({ error: "Invalid generation ID" });
  }

  // Resolve the current user
  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Fetch the generation record
  const genResult = await getSupabase()
    .from("generations")
    .select("id, user_id, image_url")
    .eq("id", Number(generationId))
    .single();
  const generation = genResult.data as { id: number; user_id: number; image_url: string } | null;
  const error = genResult.error;

  if (error || !generation) {
    return res.status(404).json({ error: "Generation not found" });
  }

  // Only the owner can download
  if (generation.user_id !== user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Fetch the image bytes
  let imageBuffer: Buffer;
  try {
    let fetchUrl = generation.image_url as string;
    if (fetchUrl.startsWith("/manus-storage/")) {
      const key = fetchUrl.replace("/manus-storage/", "");
      fetchUrl = await storageGetSignedUrl(key);
    }
    const imageRes = await fetch(fetchUrl);
    if (!imageRes.ok) throw new Error(`Image fetch failed: ${imageRes.status}`);
    const arrayBuffer = await imageRes.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("[Download] Image fetch error:", err);
    return res.status(502).json({ error: "Failed to fetch image" });
  }

  // Determine if watermark should be applied
  const creditsResult = await getSupabase()
    .from("credits")
    .select("tier")
    .eq("user_id", user.id)
    .single();
  const credits = creditsResult.data as { tier: string } | null;

  const profileResult = await getSupabase()
    .from("profiles")
    .select("share_badge_enabled")
    .eq("user_id", user.id)
    .single();
  const profile = profileResult.data as { share_badge_enabled: boolean | null } | null;

  const tier = credits?.tier ?? "free";
  const shareBadgeEnabled = profile?.share_badge_enabled;
  // Free tier: always watermark. Paid: watermark only when explicitly opted in
  const applyWatermark = tier === "free" || shareBadgeEnabled === true;

  if (!applyWatermark) {
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="meetha-${generationId}.jpg"`
    );
    return res.send(imageBuffer);
  }

  // Composite canvas watermark onto image
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const imgWidth = metadata.width ?? 1080;
    const imgHeight = metadata.height ?? 1920;

    const wmBuffer = buildCanvasWatermark(imgWidth, imgHeight);

    const watermarked = await image
      .composite([{ input: wmBuffer, top: 0, left: 0 }])
      .jpeg({ quality: 92 })
      .toBuffer();

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="meetha-${generationId}.jpg"`
    );
    return res.send(watermarked);
  } catch (err) {
    console.error("[Download] Watermark compositing error:", err);
    // Fallback: serve original without watermark rather than failing
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="meetha-${generationId}.jpg"`
    );
    return res.send(imageBuffer);
  }
}
