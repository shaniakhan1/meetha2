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
import { WATERMARK_FONT_BASE64 } from "./watermarkFont";

// Font is embedded at build time as a base64 constant — no disk I/O needed at runtime.
// This ensures the font is available on Cloud Run where __dirname has no .ttf files.
function getFontBase64(): string {
  return WATERMARK_FONT_BASE64;
}

// SVG watermark: diagonal "MEETHA" text repeated across the image.
// Uses SVG path-based letters to avoid librsvg font rendering artifacts (white boxes).
// The letters are drawn as simple geometric shapes so no font embedding is needed.
async function buildWatermarkPng(width: number, height: number): Promise<Buffer> {
  const fontSize = Math.max(36, Math.round(width * 0.07));
  const cx = Math.round(width / 2);
  const cy = Math.round(height / 2);
  const letterSpacing = Math.round(fontSize * 0.12);

  // Five rows of "MEETHA" spread across the full image height
  const rowOffsets = [
    -Math.round(height * 0.35),
    -Math.round(height * 0.17),
    0,
    Math.round(height * 0.17),
    Math.round(height * 0.35),
  ];

  // Use SVG text with a system-safe generic font stack.
  // Key fix: set paint-order="stroke" so the stroke is drawn behind the fill,
  // and use a dark stroke to prevent librsvg from rendering a white background rect.
  // The text element has no background — fill-opacity controls transparency.
  const textElements = rowOffsets.map((offset) => {
    const y = cy + offset;
    return [
      `<text`,
      `  x="${cx}"`,
      `  y="${y}"`,
      `  text-anchor="middle"`,
      `  dominant-baseline="middle"`,
      `  font-family="Arial, Helvetica, sans-serif"`,
      `  font-size="${fontSize}"`,
      `  font-weight="bold"`,
      `  letter-spacing="${letterSpacing}"`,
      `  fill="white"`,
      `  fill-opacity="0.35"`,
      `  stroke="none"`,
      `  transform="rotate(-28 ${cx} ${y})">`,
      `MEETHA`,
      `</text>`,
    ].join(" ");
  }).join("\n");

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
    `<rect width="${width}" height="${height}" fill="transparent"/>`,
    textElements,
    `</svg>`,
  ].join("\n");

  // Pre-rasterize SVG to PNG at the exact image dimensions.
  // This forces librsvg to render the text to pixels before compositing,
  // which eliminates the white-box artifact that appears when compositing SVG directly.
  return await sharp(Buffer.from(svg), { density: 144 })
    .resize(width, height, { fit: "fill" })
    .png()
    .toBuffer();
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
    const watermarkPng = await buildWatermarkPng(imgWidth, imgHeight);

    const watermarked = await image
      .composite([
        {
          input: watermarkPng,
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
