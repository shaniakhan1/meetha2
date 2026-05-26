/**
 * GET /api/style-card/:generationId
 *
 * Generates a shareable branded style card JPEG:
 * - The generation image fills the full card
 * - A subtle "MEETHA" watermark overlay at the bottom-right
 * - Optional styling brief rows rendered below the image (passed as query params)
 * - Returned as image/jpeg for direct sharing / saving
 *
 * Font approach: fonts are embedded as base64 data URIs in SVG @font-face rules.
 * This guarantees text renders correctly on any server regardless of installed fonts.
 * Font files live in server/fonts/ and are bundled with the deployment.
 */
import path from "path";
import fs from "fs";
import type { Request, Response } from "express";
import sharp from "sharp";
import { authenticateRequest } from "./_core/auth";
import { getSupabase } from "./_core/supabase";
import { storageGetSignedUrl } from "./storage";

interface StylingBrief {
  color_palette?: string;
  metals?: string;
  fabrics?: string;
  makeup?: string;
  lighting?: string;
  hair?: string;
}

// Load fonts once at module level and embed as base64 in SVG @font-face
// This ensures text renders on production servers that may not have these fonts installed
let _fontRegularB64: string | null = null;
let _fontBoldB64: string | null = null;

function getFontBase64(variant: "Regular" | "Bold"): string {
  if (variant === "Regular") {
    if (!_fontRegularB64) {
      const p = path.join(__dirname, "fonts", "LiberationSans-Regular.ttf");
      _fontRegularB64 = fs.readFileSync(p).toString("base64");
    }
    return _fontRegularB64;
  } else {
    if (!_fontBoldB64) {
      const p = path.join(__dirname, "fonts", "LiberationSans-Bold.ttf");
      _fontBoldB64 = fs.readFileSync(p).toString("base64");
    }
    return _fontBoldB64;
  }
}

function fontFaceBlock(): string {
  const regular = getFontBase64("Regular");
  const bold = getFontBase64("Bold");
  return `<defs><style>
    @font-face { font-family: 'MeethaFont'; font-weight: normal; src: url('data:font/truetype;base64,${regular}'); }
    @font-face { font-family: 'MeethaFont'; font-weight: bold; src: url('data:font/truetype;base64,${bold}'); }
  </style></defs>`;
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

    // --- Watermark: embedded-font SVG text overlay ---
    const wmFontSize = Math.round(imgWidth * 0.028);
    const wmPad = Math.round(imgWidth * 0.04);
    const wmLetterSpacing = Math.round(imgWidth * 0.006);
    const wmSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imgWidth}" height="${imgHeight}">
      ${fontFaceBlock()}
      <text
        x="${imgWidth - wmPad}"
        y="${imgHeight - wmPad}"
        font-family="MeethaFont"
        font-size="${wmFontSize}"
        fill="white"
        opacity="0.30"
        text-anchor="end"
        letter-spacing="${wmLetterSpacing}">MEETHA</text>
    </svg>`;

    // Composite watermark onto photo
    const photoWithWatermark = await sharp(imageBuffer)
      .composite([{ input: Buffer.from(wmSvg), top: 0, left: 0 }])
      .png()
      .toBuffer();

    // --- Brief panel (if styling data provided) ---
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

      const rowH = Math.round(imgWidth * 0.075);
      const padX = Math.round(imgWidth * 0.06);
      const labelW = Math.round(imgWidth * 0.26);
      const fontSize = Math.round(imgWidth * 0.026);
      const labelFontSize = Math.round(imgWidth * 0.021);
      const topPad = Math.round(imgWidth * 0.04);
      briefPanelH = rows.length * rowH + topPad * 2;

      const rowsSvg = rows
        .map((r, i) => {
          const y = topPad + i * rowH;
          const midY = y + rowH / 2;
          const line =
            i > 0
              ? `<line x1="${padX}" y1="${y}" x2="${imgWidth - padX}" y2="${y}" stroke="#C8A96E" stroke-width="0.5" opacity="0.3"/>`
              : "";
          return `
            ${line}
            <text x="${padX}" y="${midY + labelFontSize * 0.35}" font-family="MeethaFont" font-weight="bold" font-size="${labelFontSize}" fill="#C8A96E" opacity="0.9" letter-spacing="2">${escSvg(r.label)}</text>
            <text x="${padX + labelW}" y="${midY + fontSize * 0.35}" font-family="MeethaFont" font-size="${fontSize}" fill="#F5F0E8" opacity="0.95">${escSvg(truncate(r.value, 52))}</text>
          `;
        })
        .join("");

      const panelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imgWidth}" height="${briefPanelH}">
        ${fontFaceBlock()}
        <rect width="${imgWidth}" height="${briefPanelH}" fill="#1A0F09"/>
        <line x1="${padX}" y1="0" x2="${imgWidth - padX}" y2="0" stroke="#C8A96E" stroke-width="0.8" opacity="0.4"/>
        ${rowsSvg}
        <line x1="${padX}" y1="${briefPanelH - 1}" x2="${imgWidth - padX}" y2="${briefPanelH - 1}" stroke="#C8A96E" stroke-width="0.5" opacity="0.2"/>
      </svg>`;

      briefPanelBuffer = await sharp(Buffer.from(panelSvg))
        .resize(imgWidth, briefPanelH, { fit: "fill" })
        .png()
        .toBuffer();
    }

    // --- Assemble final card ---
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
  return s.length > maxLen ? s.slice(0, maxLen - 1) + "..." : s;
}
