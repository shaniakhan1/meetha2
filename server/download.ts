/**
 * GET /api/download/:generationId
 *
 * Serves the generated image for download.
 * - Free tier: composites a subtle "meetha" watermark (bottom-right, white, semi-transparent)
 * - Starter / Pro: serves the original image unmodified
 */
import type { Request, Response } from "express";
import sharp from "sharp";
import { authenticateRequest } from "./_core/auth";
import { getSupabase } from "./_core/supabase";
import { storageGetSignedUrl } from "./storage";

// SVG watermark: lowercase "meetha" in a serif-style font, white, right-aligned
function buildWatermarkSvg(width: number): Buffer {
  const fontSize = Math.max(18, Math.round(width * 0.038)); // ~3.8% of image width
  const padding = Math.round(fontSize * 0.8);
  // Approximate text width: ~0.55 * fontSize per character, 6 chars = "meetha"
  const textWidth = Math.round(fontSize * 0.55 * 6);
  const svgWidth = textWidth + padding * 2;
  const svgHeight = fontSize + padding * 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
    <style>
      text {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: ${fontSize}px;
        font-weight: 400;
        letter-spacing: ${Math.round(fontSize * 0.12)}px;
        fill: white;
        fill-opacity: 0.55;
      }
    </style>
    <text x="${padding}" y="${fontSize + Math.round(padding * 0.5)}" text-anchor="start">meetha</text>
  </svg>`;

  return Buffer.from(svg);
}

export async function handleDownload(req: Request, res: Response) {
  const { generationId } = req.params;

  if (!generationId || isNaN(Number(generationId))) {
    return res.status(400).json({ error: "Invalid generation ID" });
  }

  // Resolve the current user (may be null for unauthenticated)
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
  // image_url is stored as a relative /manus-storage/{key} path — resolve to a signed S3 URL
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
  // Free tier: always watermark
  // Starter/Pro: watermark only if share_badge_enabled is true (default null = no badge for paid)
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
  // Free tier: always watermark. Paid: watermark only when explicitly opted in (shareBadgeEnabled === true)
  const applyWatermark = tier === "free" || shareBadgeEnabled === true;

  if (!applyWatermark) {
    // Serve original image
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="meetha-${generationId}.jpg"`
    );
    return res.send(imageBuffer);
  }

  // Composite watermark onto image
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const imgWidth = metadata.width ?? 1080;

    const watermarkSvg = buildWatermarkSvg(imgWidth);
    const watermarkMeta = await sharp(watermarkSvg).metadata();
    const wmWidth = watermarkMeta.width ?? 120;
    const wmHeight = watermarkMeta.height ?? 40;

    // Position: bottom-right with a small margin
    const margin = Math.round(imgWidth * 0.03);
    const imgHeight = metadata.height ?? 1920;
    const left = imgWidth - wmWidth - margin;
    const top = imgHeight - wmHeight - margin;

    const watermarked = await image
      .composite([
        {
          input: watermarkSvg,
          top: Math.max(0, top),
          left: Math.max(0, left),
        },
      ])
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
