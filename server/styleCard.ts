/**
 * GET /api/style-card/:generationId
 *
 * Generates a shareable branded style card JPEG:
 * - The generation image fills the full card
 * - A subtle "MEETHA" watermark rendered via @napi-rs/canvas (no SVG font issues)
 * - Optional styling brief rows rendered below the image (passed as query params)
 * - Returned as image/jpeg for direct sharing / saving
 *
 * Font approach: uses @napi-rs/canvas with GlobalFonts.registerFromPath().
 * This bypasses librsvg entirely and renders text correctly on any server.
 * Font files live in server/fonts/ and are bundled with the deployment.
 */
import path from "path";
import { fileURLToPath } from "url";
import type { Request, Response } from "express";
import sharp from "sharp";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { authenticateRequest } from "./_core/auth";
import { getSupabase } from "./_core/supabase";
import { storageGetSignedUrl } from "./storage";

// ESM-safe __dirname: works in both tsx (dev) and esbuild ESM (production)
const _thisDir = (() => {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return typeof __dirname !== "undefined" ? __dirname : process.cwd();
  }
})();

// Register fonts once at module load time
let _fontsRegistered = false;
function ensureFonts() {
  if (_fontsRegistered) return;
  const fontsDir = path.join(_thisDir, "fonts");
  GlobalFonts.registerFromPath(path.join(fontsDir, "LiberationSans-Regular.ttf"), "MeethaFont");
  GlobalFonts.registerFromPath(path.join(fontsDir, "LiberationSans-Bold.ttf"), "MeethaFont");
  _fontsRegistered = true;
}

interface StylingBrief {
  color_palette?: string;
  metals?: string;
  fabrics?: string;
  makeup?: string;
  lighting?: string;
  hair?: string;
}

/**
 * Render the brief panel using @napi-rs/canvas.
 * Returns a PNG buffer of the panel.
 */
function renderBriefPanel(
  rows: { label: string; value: string }[],
  imgWidth: number
): Buffer {
  ensureFonts();

  const rowH = Math.round(imgWidth * 0.085);
  const padX = Math.round(imgWidth * 0.06);
  const labelW = Math.round(imgWidth * 0.28);
  const fontSize = Math.round(imgWidth * 0.028);
  const labelFontSize = Math.round(imgWidth * 0.022);
  const topPad = Math.round(imgWidth * 0.05);
  const panelH = rows.length * rowH + topPad * 2;

  const canvas = createCanvas(imgWidth, panelH);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#1A0F09";
  ctx.fillRect(0, 0, imgWidth, panelH);

  // Top border line
  ctx.strokeStyle = "rgba(200, 169, 110, 0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, 1);
  ctx.lineTo(imgWidth - padX, 1);
  ctx.stroke();

  rows.forEach((row, i) => {
    const y = topPad + i * rowH;
    const midY = y + rowH / 2;

    // Divider line between rows
    if (i > 0) {
      ctx.strokeStyle = "rgba(200, 169, 110, 0.25)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(imgWidth - padX, y);
      ctx.stroke();
    }

    // Label (gold, bold, letter-spaced)
    ctx.fillStyle = "rgba(200, 169, 110, 0.9)";
    ctx.font = `bold ${labelFontSize}px MeethaFont`;
    ctx.fillText(row.label, padX, midY + labelFontSize * 0.38);

    // Value (cream white)
    ctx.fillStyle = "rgba(245, 240, 232, 0.95)";
    ctx.font = `${fontSize}px MeethaFont`;
    const maxValueW = imgWidth - padX - labelW - padX;
    const truncated = truncateToWidth(ctx, row.value, maxValueW);
    ctx.fillText(truncated, padX + labelW, midY + fontSize * 0.38);
  });

  // Bottom border line
  ctx.strokeStyle = "rgba(200, 169, 110, 0.2)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(padX, panelH - 1);
  ctx.lineTo(imgWidth - padX, panelH - 1);
  ctx.stroke();

  return canvas.toBuffer("image/png") as Buffer;
}

/**
 * Render the MEETHA watermark using @napi-rs/canvas.
 * Returns a PNG buffer the same size as the image (transparent background).
 */
function renderWatermark(imgWidth: number, imgHeight: number): Buffer {
  ensureFonts();

  const canvas = createCanvas(imgWidth, imgHeight);
  const ctx = canvas.getContext("2d");

  // Transparent background
  ctx.clearRect(0, 0, imgWidth, imgHeight);

  const fontSize = Math.round(imgWidth * 0.028);
  const pad = Math.round(imgWidth * 0.04);

  ctx.font = `${fontSize}px MeethaFont`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.30)";
  ctx.textAlign = "right";
  ctx.fillText("MEETHA", imgWidth - pad, imgHeight - pad);

  return canvas.toBuffer("image/png") as Buffer;
}

/** Truncate text to fit within maxWidth pixels */
function truncateToWidth(ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + "...").width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "...";
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

    // --- Watermark: canvas-rendered PNG overlay ---
    const wmBuffer = renderWatermark(imgWidth, imgHeight);

    // Composite watermark onto photo
    const photoWithWatermark = await sharp(imageBuffer)
      .composite([{ input: wmBuffer, top: 0, left: 0 }])
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

      if (rows.length > 0) {
        briefPanelBuffer = renderBriefPanel(rows, imgWidth);
        const panelMeta = await sharp(briefPanelBuffer).metadata();
        briefPanelH = panelMeta.height ?? 0;
      }
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
