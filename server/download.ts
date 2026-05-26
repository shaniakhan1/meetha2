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

// SVG watermark: diagonal "meetha" text repeated across the image.
// librsvg (used by Sharp) does NOT support tspan x/dy or letter-spacing — they render as boxes.
// We use plain <text> elements only, one per row, with text-anchor="middle" and a rotate transform.
function buildWatermarkSvg(width: number, height: number): Buffer {
  const fontSize = Math.max(48, Math.round(width * 0.085));
  const cx = Math.round(width / 2);
  const cy = Math.round(height / 2);

  // Five rows of "MEETHA" spread across the full image height
  const rowOffsets = [
    -Math.round(height * 0.35),
    -Math.round(height * 0.17),
    0,
    Math.round(height * 0.17),
    Math.round(height * 0.35),
  ];

  const textElements = rowOffsets.map((offset) => {
    const y = cy + offset;
    return [
      `<text`,
      `  x="${cx}"`,
      `  y="${y}"`,
      `  text-anchor="middle"`,
      `  dominant-baseline="middle"`,
      `  font-family="Georgia, serif"`,
      `  font-size="${fontSize}"`,
      `  font-weight="bold"`,
      `  fill="white"`,
      `  fill-opacity="0.38"`,
      `  transform="rotate(-28 ${cx} ${y})">`,
      `MEETHA`,
      `</text>`,
    ].join(" ");
  }).join("\n");

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
    textElements,
    `</svg>`,
  ].join("\n");

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

    const imgHeight = metadata.height ?? 1920;
    const watermarkSvg = buildWatermarkSvg(imgWidth, imgHeight);

    const watermarked = await image
      .composite([
        {
          input: watermarkSvg,
          top: 0,
          left: 0,
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
