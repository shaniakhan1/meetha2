/**
 * GET /api/style-card/:generationId
 *
 * Generates a shareable branded style card JPEG:
 * - The generation image fills the full card
 * - A subtle semi-transparent "MEETHA" text overlay at the bottom (no dark box)
 * - Optional styling brief rows rendered below the image (passed as query params)
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

interface StylingBrief {
  color_palette?: string;
  metals?: string;
  fabrics?: string;
  makeup?: string;
  lighting?: string;
  hair?: string;
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

  // Parse optional styling brief from query params
  const brief: StylingBrief = {
    color_palette: req.query.color_palette as string | undefined,
    metals: req.query.metals as string | undefined,
    fabrics: req.query.fabrics as string | undefined,
    makeup: req.query.makeup as string | undefined,
    lighting: req.query.lighting as string | undefined,
    hair: req.query.hair as string | undefined,
  };
  const hasBrief = Object.values(brief).some((v) => v && v.trim());

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

    // Build brief panel if styling data was provided
    let briefPanelBuffer: Buffer | null = null;
    let briefPanelH = 0;

    if (hasBrief) {
      const rows: { label: string; value: string }[] = [
        { label: "COLOR PALETTE", value: brief.color_palette ?? "" },
        { label: "METALS", value: brief.metals ?? "" },
        { label: "FABRICS", value: brief.fabrics ?? "" },
        { label: "MAKEUP", value: brief.makeup ?? "" },
        { label: "LIGHTING", value: brief.lighting ?? "" },
        { label: "HAIR", value: brief.hair ?? "" },
      ].filter((r) => r.value.trim());

      // Row height scales with image width
      const rowH = Math.round(imgWidth * 0.075);
      const padX = Math.round(imgWidth * 0.06);
      const fontSize = Math.round(imgWidth * 0.026);
      const labelFontSize = Math.round(imgWidth * 0.022);
      briefPanelH = rows.length * rowH + Math.round(imgWidth * 0.08); // rows + top/bottom padding

      // Build SVG panel (font-safe: uses system sans-serif which Cloud Run has via Noto)
      const rowsSvg = rows
        .map((r, i) => {
          const y = Math.round(imgWidth * 0.04) + i * rowH;
          const midY = y + Math.round(rowH / 2);
          // Separator line between rows
          const line =
            i > 0
              ? `<line x1="${padX}" y1="${y}" x2="${imgWidth - padX}" y2="${y}" stroke="#C8A96E" stroke-width="0.5" opacity="0.3"/>`
              : "";
          return `
          ${line}
          <text x="${padX}" y="${midY - fontSize * 0.3}" font-family="Georgia,serif" font-size="${labelFontSize}" fill="#C8A96E" opacity="0.85" letter-spacing="2">${escSvg(r.label)}</text>
          <text x="${padX + Math.round(imgWidth * 0.28)}" y="${midY + fontSize * 0.5}" font-family="Georgia,serif" font-size="${fontSize}" fill="#F5F0E8" opacity="0.95">${escSvg(truncate(r.value, 52))}</text>
        `;
        })
        .join("");

      const panelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imgWidth}" height="${briefPanelH}">
        <rect width="${imgWidth}" height="${briefPanelH}" fill="#1A0F09"/>
        <line x1="${padX}" y1="0" x2="${imgWidth - padX}" y2="0" stroke="#C8A96E" stroke-width="0.8" opacity="0.4"/>
        ${rowsSvg}
        <line x1="${padX}" y1="${briefPanelH - 1}" x2="${imgWidth - padX}" y2="${briefPanelH - 1}" stroke="#C8A96E" stroke-width="0.5" opacity="0.2"/>
      </svg>`;

      briefPanelBuffer = await sharp(Buffer.from(panelSvg), { density: 144 })
        .resize(imgWidth, briefPanelH, { fit: "fill" })
        .png()
        .toBuffer();
    }

    // Transparent MEETHA watermark overlay on the image (bottom-right corner)
    const brandRaw = await getBrandBuffer();
    const brandMeta = await sharp(brandRaw).metadata();
    const brandAspect = (brandMeta.width ?? 800) / (brandMeta.height ?? 449);

    // Small watermark: 22% of image width, bottom-right with padding
    const brandW = Math.max(100, Math.round(imgWidth * 0.22));
    const brandH = Math.round(brandW / brandAspect);
    const brandPad = Math.round(imgWidth * 0.04);

    const brandResized = await sharp(brandRaw)
      .resize(brandW, brandH, { fit: "fill" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data: brandData, info: brandInfo } = brandResized;
    // Make watermark white at 45% opacity (subtle, not blocking)
    for (let i = 0; i < brandData.length; i += 4) {
      // Set RGB to white
      brandData[i] = 245;
      brandData[i + 1] = 240;
      brandData[i + 2] = 232;
      // Reduce alpha to 45%
      brandData[i + 3] = Math.round(brandData[i + 3] * 0.45);
    }
    const brandPng = await sharp(brandData, {
      raw: { width: brandInfo.width, height: brandInfo.height, channels: 4 },
    })
      .png()
      .toBuffer();

    // Position: bottom-right of the photo area
    const brandLeft = imgWidth - brandW - brandPad;
    const brandTop = imgHeight - brandH - brandPad;

    // Composite the photo with the watermark overlay
    const photoWithWatermark = await sharp(imageBuffer)
      .composite([{ input: brandPng, top: brandTop, left: brandLeft }])
      .png()
      .toBuffer();

    // Build final card
    const totalH = imgHeight + briefPanelH;
    const composites: sharp.OverlayOptions[] = [
      { input: photoWithWatermark, top: 0, left: 0 },
    ];
    if (briefPanelBuffer) {
      composites.push({ input: briefPanelBuffer, top: imgHeight, left: 0 });
    }

    const card = await sharp({
      create: {
        width: imgWidth,
        height: totalH,
        channels: 3,
        background: { r: 26, g: 15, b: 9 },
      },
    })
      .composite(composites)
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

function escSvg(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(s: string, maxLen: number): string {
  return s.length > maxLen ? s.slice(0, maxLen - 1) + "…" : s;
}
