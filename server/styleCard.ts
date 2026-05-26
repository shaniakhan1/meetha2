/**
 * GET /api/style-card/:generationId
 *
 * Generates a shareable branded style card PNG:
 * - The generation image fills the top portion
 * - A dark footer panel shows archetype, palette, and MEETHA branding
 * - Returned as image/jpeg for direct sharing / saving
 */
import type { Request, Response } from "express";
import sharp from "sharp";
import { authenticateRequest } from "./_core/auth";
import { getSupabase } from "./_core/supabase";
import { storageGetSignedUrl } from "./storage";
import { ARCHETYPE_LABELS } from "../shared/types";

type AestheticBrief = {
  palette?: string;
  metals?: string;
  makeup?: string;
  lighting?: string;
  hair?: string;
  fabrics?: string;
};

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

  // Fetch profile for archetype + brief
  const profileResult = await getSupabase()
    .from("profiles")
    .select("archetype, aesthetic_brief")
    .eq("user_id", user.id)
    .single();
  const profile = profileResult.data as {
    archetype: string | null;
    aesthetic_brief: AestheticBrief | null;
  } | null;

  const archetypeKey = profile?.archetype ?? "luxury_minimal";
  const archetypeLabel = (ARCHETYPE_LABELS as Record<string, string>)[archetypeKey] ?? archetypeKey;
  const palette = profile?.aesthetic_brief?.palette ?? "";
  const metals = profile?.aesthetic_brief?.metals ?? "";

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

    // Footer height: ~22% of image height, min 220px
    const footerH = Math.max(220, Math.round(imgHeight * 0.22));
    const cardH = imgHeight + footerH;

    // Truncate long text
    const truncate = (s: string, max: number) =>
      s.length > max ? s.slice(0, max - 1) + "\u2026" : s;

    const paletteLine = truncate(palette, 72);
    const metalsLine = metals ? truncate(metals, 60) : "";

    const labelFontSize = Math.max(11, Math.round(imgWidth * 0.013));
    const valueFontSize = Math.max(13, Math.round(imgWidth * 0.016));
    const archetypeFontSize = Math.max(18, Math.round(imgWidth * 0.028));
    const brandFontSize = Math.max(14, Math.round(imgWidth * 0.018));

    const padX = Math.round(imgWidth * 0.07);
    const padTop = Math.round(footerH * 0.18);

    // Build footer SVG
    const footerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imgWidth}" height="${footerH}">
  <rect width="${imgWidth}" height="${footerH}" fill="#1a0f09"/>
  <line x1="${padX}" y1="${Math.round(footerH * 0.08)}" x2="${imgWidth - padX}" y2="${Math.round(footerH * 0.08)}" stroke="#8B6914" stroke-width="0.5" opacity="0.5"/>

  <!-- Archetype -->
  <text x="${padX}" y="${padTop + archetypeFontSize}"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="${archetypeFontSize}"
    font-weight="300"
    fill="#f5efe6"
    letter-spacing="1">
    ${archetypeLabel}
  </text>

  <!-- Palette label -->
  <text x="${padX}" y="${padTop + archetypeFontSize + Math.round(footerH * 0.14)}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${labelFontSize}"
    fill="#8B6914"
    letter-spacing="2"
    text-transform="uppercase">
    PALETTE
  </text>

  <!-- Palette value -->
  <text x="${padX}" y="${padTop + archetypeFontSize + Math.round(footerH * 0.14) + valueFontSize + 4}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${valueFontSize}"
    font-weight="300"
    fill="#c4a882">
    ${paletteLine}
  </text>

  ${metalsLine ? `
  <!-- Metals label -->
  <text x="${padX}" y="${padTop + archetypeFontSize + Math.round(footerH * 0.14) + valueFontSize + 4 + Math.round(footerH * 0.14)}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${labelFontSize}"
    fill="#8B6914"
    letter-spacing="2">
    METALS
  </text>
  <!-- Metals value -->
  <text x="${padX}" y="${padTop + archetypeFontSize + Math.round(footerH * 0.14) + valueFontSize + 4 + Math.round(footerH * 0.14) + valueFontSize + 4}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${valueFontSize}"
    font-weight="300"
    fill="#c4a882">
    ${metalsLine}
  </text>
  ` : ""}

  <!-- MEETHA brand -->
  <text x="${imgWidth - padX}" y="${footerH - Math.round(footerH * 0.12)}"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="${brandFontSize}"
    fill="#8B6914"
    letter-spacing="4"
    text-anchor="end">
    MEETHA
  </text>

  <line x1="${padX}" y1="${footerH - Math.round(footerH * 0.06)}" x2="${imgWidth - padX}" y2="${footerH - Math.round(footerH * 0.06)}" stroke="#8B6914" stroke-width="0.5" opacity="0.3"/>
</svg>`;

    const footerPng = await sharp(Buffer.from(footerSvg), { density: 144 })
      .resize(imgWidth, footerH, { fit: "fill" })
      .png()
      .toBuffer();

    // Composite: image on top, footer below
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
        { input: footerPng, top: imgHeight, left: 0 },
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
