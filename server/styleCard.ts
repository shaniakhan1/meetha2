/**
 * GET /api/style-card/:generationId
 *
 * Generates a shareable branded style card JPEG:
 * - The generation image fills the top of the card
 * - A "styled by Meetha" watermark rendered via @napi-rs/canvas
 * - The user's saved aesthetic_brief is fetched directly from the DB and
 *   rendered as a brief panel below the image (no frontend query params needed)
 * - Returned as image/jpeg for direct sharing / saving
 *
 * Architecture: server owns all data. Frontend just requests the card by ID.
 * Font approach: uses @napi-rs/canvas with GlobalFonts.registerFromPath().
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

interface AestheticBrief {
  palette?: string;
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

  // Stacked layout: label line + value line(s) per row
  // This ensures value text is never truncated regardless of image width
  const padX = Math.round(imgWidth * 0.06);
  const availW = imgWidth - padX * 2;
  const labelFontSize = Math.round(imgWidth * 0.020);
  const valueFontSize = Math.round(imgWidth * 0.026);
  const labelGap = Math.round(imgWidth * 0.012);  // gap between label and value
  const rowGap = Math.round(imgWidth * 0.022);    // gap between rows
  const topPad = Math.round(imgWidth * 0.045);
  const bottomPad = Math.round(imgWidth * 0.04);

  // Pre-measure to calculate total panel height
  const measureCanvas = createCanvas(imgWidth, 100);
  const mctx = measureCanvas.getContext("2d");

  function wrapValue(text: string, ctx2: ReturnType<ReturnType<typeof createCanvas>["getContext"]>, maxW: number, fSize: number): string[] {
    ctx2.font = `${fSize}px MeethaFont`;
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? current + " " + word : word;
      if (ctx2.measureText(test).width > maxW && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  // Calculate row heights
  const rowData = rows.map((row) => {
    const lines = wrapValue(row.value, mctx, availW, valueFontSize);
    const rowH = labelFontSize + labelGap + lines.length * (valueFontSize * 1.35);
    return { ...row, lines, rowH };
  });

  const totalContentH = rowData.reduce((sum, r) => sum + r.rowH + rowGap, 0) - rowGap;
  const panelH = topPad + totalContentH + bottomPad;

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

  let cursorY = topPad;

  rowData.forEach((row, i) => {
    // Divider line between rows
    if (i > 0) {
      ctx.strokeStyle = "rgba(200, 169, 110, 0.18)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(padX, cursorY - rowGap / 2);
      ctx.lineTo(imgWidth - padX, cursorY - rowGap / 2);
      ctx.stroke();
    }

    // Label (gold, bold, small caps style via uppercase)
    ctx.fillStyle = "rgba(200, 169, 110, 0.85)";
    ctx.font = `bold ${labelFontSize}px MeethaFont`;
    ctx.textAlign = "left";
    ctx.fillText(row.label, padX, cursorY + labelFontSize);

    // Value lines (cream white, wrapping)
    ctx.fillStyle = "rgba(245, 240, 232, 0.95)";
    ctx.font = `${valueFontSize}px MeethaFont`;
    const lineH = valueFontSize * 1.35;
    row.lines.forEach((line, li) => {
      ctx.fillText(line, padX, cursorY + labelFontSize + labelGap + valueFontSize + li * lineH);
    });

    cursorY += row.rowH + rowGap;
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
 * Render the "styled by Meetha" watermark using @napi-rs/canvas.
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
  ctx.fillText("styled by Meetha", imgWidth - pad, imgHeight - pad);

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

  // Fetch the user's aesthetic brief directly from DB (server owns the data)
  const profileResult = await getSupabase()
    .from("profiles")
    .select("aesthetic_brief")
    .eq("user_id", user.id)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const savedBrief = (profileResult.data as any)?.aesthetic_brief as AestheticBrief | null | undefined;

  // Also accept query params as override (for backward compat and live aestheticRead)
  const qp = req.query;
  const brief: AestheticBrief = {
    palette: (qp.color_palette as string) || savedBrief?.palette || undefined,
    metals: (qp.metals as string) || savedBrief?.metals || undefined,
    fabrics: (qp.fabrics as string) || savedBrief?.fabrics || undefined,
    makeup: (qp.makeup as string) || savedBrief?.makeup || undefined,
    lighting: (qp.lighting as string) || savedBrief?.lighting || undefined,
    hair: (qp.hair as string) || savedBrief?.hair || undefined,
  };
  const hasBrief = Object.values(brief).some((v) => v && (v as string).trim());

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

    // Watermark overlay on the photo
    const wmBuffer = renderWatermark(imgWidth, imgHeight);
    const photoWithWatermark = await sharp(imageBuffer)
      .composite([{ input: wmBuffer, top: 0, left: 0 }])
      .png()
      .toBuffer();

    // Brief panel
    let briefPanelBuffer: Buffer | null = null;
    let briefPanelH = 0;

    if (hasBrief) {
      const rows: { label: string; value: string }[] = [
        { label: "COLOR PALETTE", value: brief.palette ?? "" },
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

    // Assemble final card
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
