/**
 * GET /api/download/:generationId
 *
 * Serves the generated image for download.
 * - Free tier: composites the Meetha logo as a bottom-center watermark
 * - Starter / Pro: serves the original image unmodified
 */
import path from "path";
import type { Request, Response } from "express";
import sharp from "sharp";
import { authenticateRequest } from "./_core/auth";
import { getSupabase } from "./_core/supabase";
import { storageGetSignedUrl } from "./storage";

// Watermark logo: the Meetha wordmark PNG stored in S3/storage.
// We fetch it once and cache it in memory for the process lifetime.
let _watermarkBuffer: Buffer | null = null;

async function getWatermarkBuffer(): Promise<Buffer> {
  if (_watermarkBuffer) return _watermarkBuffer;
  // Fetch the pre-uploaded transparent Meetha wordmark PNG from our CDN
  const url =
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/meetha-watermark-3X9t8k979xcd7uGLhS3sPN.png";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Watermark fetch failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  _watermarkBuffer = buf;
  return buf;
}

/**
 * Build a watermark overlay:
 * - Fetches the Meetha wordmark PNG
 * - Resizes it to ~40% of the image width
 * - Places it bottom-center with 5% margin
 * - Applies 55% opacity
 */
async function buildWatermarkOverlay(
  imgWidth: number,
  imgHeight: number
): Promise<{ input: Buffer; top: number; left: number }> {
  const rawWm = await getWatermarkBuffer();

  // Target width: 40% of image width, minimum 200px
  const targetW = Math.max(200, Math.round(imgWidth * 0.4));
  const wmMeta = await sharp(rawWm).metadata();
  const wmAspect = (wmMeta.width ?? 800) / (wmMeta.height ?? 449);
  const targetH = Math.round(targetW / wmAspect);

  // Resize + apply opacity via composite with a transparent base
  const resized = await sharp(rawWm)
    .resize(targetW, targetH, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Reduce opacity to 55% by scaling the alpha channel
  const { data, info } = resized;
  for (let i = 3; i < data.length; i += 4) {
    data[i] = Math.round(data[i] * 0.55);
  }
  const wmBuffer = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  // Position: bottom-center, 5% margin from bottom
  const marginBottom = Math.round(imgHeight * 0.05);
  const top = imgHeight - targetH - marginBottom;
  const left = Math.round((imgWidth - targetW) / 2);

  return { input: wmBuffer, top: Math.max(0, top), left: Math.max(0, left) };
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
    .select("id, userId, imageUrl")
    .eq("id", Number(generationId))
    .single();
  const generation = genResult.data as { id: number; userId: number; imageUrl: string } | null;
  const error = genResult.error;

  if (error || !generation) {
    return res.status(404).json({ error: "Generation not found" });
  }

  // Only the owner can download
  if (generation.userId !== user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Fetch the image bytes
  let imageBuffer: Buffer;
  try {
    let fetchUrl = generation.imageUrl as string;
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
    .eq("userId", user.id)
    .single();
  const credits = creditsResult.data as { tier: string } | null;

  const profileResult = await getSupabase()
    .from("profiles")
    .select("share_badge_enabled")
    .eq("userId", user.id)
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

  // Composite watermark onto image
  try {
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const imgWidth = metadata.width ?? 1080;
    const imgHeight = metadata.height ?? 1920;

    const wmOverlay = await buildWatermarkOverlay(imgWidth, imgHeight);

    const watermarked = await image
      .composite([wmOverlay])
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
