/**
 * GET /api/style-card/:generationId
 *
 * Generates a shareable branded style card JPEG:
 * - The generation image fills the top portion
 * - A dark footer panel with the Meetha wordmark burned in as a PNG (no font dependency)
 * - Returned as image/jpeg for direct sharing / saving
 *
 * Font-free approach: all text is replaced with image compositing to avoid
 * the librsvg "white boxes" artifact on Cloud Run where system fonts are absent.
 */
import type { Request, Response } from "express";
import sharp from "sharp";
import { authenticateRequest } from "./_core/auth";
import { getSupabase } from "./_core/supabase";
import { storageGetSignedUrl } from "./storage";

// Cache the Meetha wordmark PNG in memory
let _brandBuffer: Buffer | null = null;

async function getBrandBuffer(): Promise<Buffer> {
  if (_brandBuffer) return _brandBuffer;
  const url =
    "https://d2xsxph8kpxj0f.cloudfront.net/310519663380647277/W9hp3oxSnRYx5WHCSun39U/meetha-watermark-3X9t8k979xcd7uGLhS3sPN.png";
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Brand fetch failed: ${res.status}`);
  _brandBuffer = Buffer.from(await res.arrayBuffer());
  return _brandBuffer;
}

export async function handleStyleCard(req: Request, res: Response) {
  const { generationId } = req.params;

  if (!generationId || isNaN(Number(generationId))) {
    return res.status(400).json({ error: "Invalid generation ID" });
  }

  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Fetch generation
  const genResult = await getSupabase()
    .from("generations")
    .select("id, user_id, image_url")
    .eq("id", Number(generationId))
    .single();
  const generation = genResult.data as { id: number; user_id: number; image_url: string } | null;
  if (!generation || generation.user_id !== user.id) {
    return res.status(404).json({ error: "Generation not found" });
  }

  // Fetch image bytes
  let imageBuffer: Buffer;
  try {
    let fetchUrl = generation.image_url as string;
    if (fetchUrl.startsWith("/manus-storage/")) {
      const key = fetchUrl.replace("/manus-storage/", "");
      fetchUrl = await storageGetSignedUrl(key);
    }
    const imageRes = await fetch(fetchUrl);
    if (!imageRes.ok) throw new Error(`Image fetch failed: ${imageRes.status}`);
    imageBuffer = Buffer.from(await imageRes.arrayBuffer());
  } catch (err) {
    console.error("[StyleCard] Image fetch error:", err);
    return res.status(502).json({ error: "Failed to fetch image" });
  }

  try {
    const image = sharp(imageBuffer);
    const meta = await image.metadata();
    const imgWidth = meta.width ?? 1080;
    const imgHeight = meta.height ?? 1350;

    // Footer: dark panel below the image
    const footerH = Math.max(160, Math.round(imgHeight * 0.18));
    const cardH = imgHeight + footerH;

    // Build a solid dark footer rectangle (no SVG text -- font-free)
    const footerBg = await sharp({
      create: {
        width: imgWidth,
        height: footerH,
        channels: 3,
        background: { r: 26, g: 15, b: 9 },
      },
    })
      .png()
      .toBuffer();

    // Resize the Meetha wordmark to fit the footer
    const brandRaw = await getBrandBuffer();
    const brandMeta = await sharp(brandRaw).metadata();
    const brandAspect = (brandMeta.width ?? 800) / (brandMeta.height ?? 449);

    // Target: wordmark width = 35% of image width, centered vertically in footer
    const brandW = Math.max(160, Math.round(imgWidth * 0.35));
    const brandH = Math.round(brandW / brandAspect);

    // Make the wordmark white on transparent with 85% opacity
    const brandResized = await sharp(brandRaw)
      .resize(brandW, brandH, { fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data: brandData, info: brandInfo } = brandResized;
    for (let i = 3; i < brandData.length; i += 4) {
      brandData[i] = Math.round(brandData[i] * 0.85);
    }
    const brandPng = await sharp(brandData, {
      raw: { width: brandInfo.width, height: brandInfo.height, channels: 4 },
    })
      .png()
      .toBuffer();

    // Center the wordmark in the footer
    const brandLeft = Math.round((imgWidth - brandW) / 2);
    const brandTop = Math.round((footerH - brandH) / 2);

    // Thin gold separator line (SVG rect, no text -- safe)
    const lineH = 1;
    const linePad = Math.round(imgWidth * 0.07);
    const lineSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imgWidth}" height="${footerH}">
  <rect x="${linePad}" y="${Math.round(footerH * 0.08)}" width="${imgWidth - linePad * 2}" height="1" fill="#8B6914" opacity="0.5"/>
  <rect x="${linePad}" y="${footerH - Math.round(footerH * 0.08)}" width="${imgWidth - linePad * 2}" height="1" fill="#8B6914" opacity="0.3"/>
</svg>`;

    const linePng = await sharp(Buffer.from(lineSvg), { density: 144 })
      .resize(imgWidth, footerH, { fit: "fill" })
      .png()
      .toBuffer();

    // Composite footer: bg + lines + brand wordmark
    const footerComposited = await sharp(footerBg)
      .composite([
        { input: linePng, top: 0, left: 0 },
        { input: brandPng, top: brandTop, left: brandLeft },
      ])
      .png()
      .toBuffer();

    // Composite full card: image + footer
    const card = await sharp({
      create: {
        width: imgWidth,
        height: cardH,
        channels: 3,
        background: { r: 26, g: 15, b: 9 },
      },
    })
      .composite([
        { input: imageBuffer, top: 0, left: 0 },
        { input: footerComposited, top: imgHeight, left: 0 },
      ])
      .jpeg({ quality: 90 })
      .toBuffer();

    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="meetha-style-card-${generationId}.jpg"`
    );
    return res.send(card);
  } catch (err) {
    console.error("[StyleCard] Compositing error:", err);
    return res.status(500).json({ error: "Failed to generate style card" });
  }
}
