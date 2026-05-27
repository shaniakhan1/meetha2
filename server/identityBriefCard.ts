/**
 * Identity Brief Card Renderer
 * Generates a premium PNG card from the user's aesthetic brief data.
 * Card dimensions: 900 x 1560px (portrait, shareable)
 */
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import type { SKRSContext2D } from "@napi-rs/canvas";
import path from "path";
import { fileURLToPath } from "url";
import { AestheticBrief } from "./db";

// ESM-safe __dirname
function getDirname(): string {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return typeof __dirname !== "undefined" ? __dirname : process.cwd();
  }
}

// ─── Font Registration ────────────────────────────────────────────────────────────────────────────────

const FONTS_DIR = path.join(getDirname(), "fonts");

function registerFonts() {
  // Use Noto Serif TTF for the serif display font
  // Use Liberation Sans TTF for the sans-serif body font
  const fontDefs = [
    { file: "NotoSerif-Light.ttf", family: "Cormorant" },
    { file: "NotoSerif-Regular.ttf", family: "Cormorant" },
    { file: "LiberationSans-Regular.ttf", family: "Liberation" },
    { file: "LiberationSans-Bold.ttf", family: "Liberation" },
  ];
  for (const def of fontDefs) {
    try {
      GlobalFonts.registerFromPath(path.join(FONTS_DIR, def.file), def.family);
    } catch (e) {
      console.warn(`[identityBriefCard] Font registration warning for ${def.file}:`, e);
    }
  }
}

registerFonts();

// ─── Color Palette ────────────────────────────────────────────────────────────

const CREAM = "#F5F0E8";
const CREAM_DARK = "#EDE8DC";
const CHARCOAL = "#2C2C2C";
const CHARCOAL_SOFT = "#5C5C5C";
const CHARCOAL_MUTED = "#9C9C9C";
const GOLD = "#B8956A";
const DIVIDER = "#D8D0C0";
const SECTION_BG = "#FAFAF7";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serif(size: number, weight: "300" | "400" | "500" = "400") {
  return `${weight} ${size}px Cormorant, serif`;
}

function sans(size: number, weight: "400" | "700" = "400") {
  return `${weight} ${size}px Liberation, sans-serif`;
}

function drawDivider(ctx: SKRSContext2D, x: number, y: number, width: number, alpha = 0.35) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = DIVIDER;
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();
  ctx.restore();
}

function drawSectionLabel(ctx: SKRSContext2D, text: string, x: number, y: number) {
  ctx.save();
  ctx.font = sans(9, "400");
  ctx.fillStyle = CHARCOAL_MUTED;
  (ctx as any).letterSpacing = "2px";
  ctx.fillText(text.toUpperCase(), x, y);
  (ctx as any).letterSpacing = "0px";
  ctx.restore();
}

function drawSectionNumber(ctx: SKRSContext2D, num: string, x: number, y: number) {
  ctx.save();
  ctx.font = sans(8, "400");
  ctx.fillStyle = GOLD;
  ctx.fillText(num, x, y);
  ctx.restore();
}

function drawBodyText(ctx: SKRSContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight = 16, color = CHARCOAL_SOFT, fontSize = 10) {
  ctx.save();
  ctx.font = sans(fontSize, "400");
  ctx.fillStyle = color;
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (const word of words) {
    const testLine = line + word + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line !== "") {
      ctx.fillText(line.trim(), x, currentY);
      line = word + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  ctx.restore();
  return currentY;
}

function drawColorSwatch(ctx: SKRSContext2D, hex: string, x: number, y: number, size = 40, label?: string) {
  ctx.save();
  // Swatch
  ctx.fillStyle = hex;
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.fill();
  // Border
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 0.5;
  ctx.stroke();
  // Label
  if (label) {
    ctx.font = sans(8, "400");
    ctx.fillStyle = CHARCOAL_SOFT;
    ctx.textAlign = "center";
    ctx.fillText(label, x + size / 2, y + size + 11);
    ctx.textAlign = "left";
  }
  ctx.restore();
}

function drawCircle(ctx: SKRSContext2D, x: number, y: number, r: number, fill: string, stroke?: string) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.75;
    ctx.stroke();
  }
  ctx.restore();
}

function drawCompassStar(ctx: SKRSContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.75;
  // 4-pointed star
  const pts = [
    [cx, cy - size],
    [cx + size * 0.18, cy - size * 0.18],
    [cx + size, cy],
    [cx + size * 0.18, cy + size * 0.18],
    [cx, cy + size],
    [cx - size * 0.18, cy + size * 0.18],
    [cx - size, cy],
    [cx - size * 0.18, cy - size * 0.18],
  ];
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Parse palette string into color hex codes and names
function parsePaletteColors(paletteStr: string): Array<{ hex: string; name: string }> {
  // Try to extract named colors with hex codes, or fall back to named colors
  const knownColors: Record<string, string> = {
    cream: "#F5F0E8",
    ivory: "#FFFFF0",
    "warm ivory": "#FFF8E7",
    espresso: "#3B1F0A",
    chocolate: "#4A2C17",
    caramel: "#C68642",
    camel: "#C19A6B",
    olive: "#6B7645",
    "warm olive": "#7A7A45",
    taupe: "#8B7355",
    "warm taupe": "#9A8060",
    "warm white": "#FAF7F0",
    "true black": "#1A1A1A",
    black: "#1A1A1A",
    white: "#FAFAFA",
    gold: "#B8956A",
    "warm gold": "#C4963A",
    burgundy: "#722F37",
    "deep burgundy": "#5C1A1A",
    rust: "#B7410E",
    terracotta: "#C26B4E",
    blush: "#E8B4B8",
    "dusty rose": "#DCAE96",
    navy: "#1B2A4A",
    "deep navy": "#0D1B2A",
    charcoal: "#36454F",
    "warm charcoal": "#4A3F35",
    sage: "#8A9A7A",
    "warm sage": "#9A9A6A",
    forest: "#355E3B",
    "deep forest": "#2D4A2D",
    "warm brown": "#6B4226",
    "rich brown": "#5C3317",
    "muted nude": "#C4A882",
    nude: "#D4A882",
    sand: "#C2B280",
    "warm sand": "#D4B896",
    linen: "#FAF0E6",
    "warm linen": "#F5ECD7",
    "deep plum": "#4A1942",
    plum: "#8E4585",
    "warm beige": "#D4B896",
    beige: "#C8B89A",
  };

  const result: Array<{ hex: string; name: string }> = [];
  const lower = paletteStr.toLowerCase();

  // Try to find known color names in the string
  const sortedKeys = Object.keys(knownColors).sort((a, b) => b.length - a.length);
  const usedPositions = new Set<number>();

  for (const key of sortedKeys) {
    const idx = lower.indexOf(key);
    if (idx !== -1 && !usedPositions.has(idx)) {
      usedPositions.add(idx);
      result.push({ hex: knownColors[key], name: key.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") });
      if (result.length >= 6) break;
    }
  }

  // Fallback: use generic warm palette
  if (result.length === 0) {
    return [
      { hex: "#F5F0E8", name: "Cream" },
      { hex: "#3B1F0A", name: "Espresso" },
      { hex: "#6B7645", name: "Olive" },
      { hex: "#C19A6B", name: "Camel" },
      { hex: "#4A2C17", name: "Chocolate" },
      { hex: "#FFF8E7", name: "Warm Ivory" },
    ];
  }

  return result.slice(0, 6);
}

function parseAvoidColors(avoidStr: string): string[] {
  const knownAvoid: Record<string, string> = {
    "icy blue": "#B0C4DE",
    "cool blue": "#6495ED",
    "neon yellow": "#E8E840",
    "neon pink": "#F0A0C0",
    "stark white": "#F0F0F0",
    "cool grey": "#A8A8B8",
    "cool gray": "#A8A8B8",
    lavender: "#C8C0D8",
    "cool lavender": "#C8C0D8",
    "bright pink": "#E890B0",
    "hot pink": "#E890B0",
    "cool white": "#E8E8F0",
    "icy tones": "#B8CCE0",
    "neon brights": "#D8D040",
    "bright silver": "#C0C0C8",
    silver: "#C0C0C8",
    "cool silver": "#B8B8C8",
    "bright white": "#F0F0F0",
    "pastel pink": "#F0C0C8",
    "cool pink": "#F0C0C8",
    "electric blue": "#8090D0",
    "bright blue": "#7090C8",
  };

  const result: string[] = [];
  const lower = avoidStr.toLowerCase();
  const sortedKeys = Object.keys(knownAvoid).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    if (lower.includes(key)) {
      result.push(knownAvoid[key]);
      if (result.length >= 5) break;
    }
  }

  if (result.length === 0) {
    return ["#B0C4DE", "#6495ED", "#FFB6C1", "#E6E6FA", "#A0A0B0"];
  }

  return result;
}

// ─── Section Renderers ────────────────────────────────────────────────────────

function renderHero(ctx: SKRSContext2D, heroImage: import("@napi-rs/canvas").Image | null, W: number) {
  const heroH = 280;

  if (heroImage) {
    // Draw image cropped to hero area
    const scale = Math.max(W / heroImage.width, heroH / heroImage.height);
    const sw = W / scale;
    const sh = heroH / scale;
    const sx = (heroImage.width - sw) / 2;
    const sy = 0; // crop from top
    ctx.drawImage(heroImage, sx, sy, sw, sh, 0, 0, W, heroH);
  } else {
    // Dark gradient fallback
    const grad = ctx.createLinearGradient(0, 0, 0, heroH);
    grad.addColorStop(0, "#1A1208");
    grad.addColorStop(1, "#2C1810");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, heroH);
  }

  // Dark overlay for text legibility
  const overlay = ctx.createLinearGradient(0, 0, 0, heroH);
  overlay.addColorStop(0, "rgba(0,0,0,0.25)");
  overlay.addColorStop(0.5, "rgba(0,0,0,0.1)");
  overlay.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = overlay;
  ctx.fillRect(0, 0, W, heroH);

  // Top-left: MEETHA / IDENTITY BRIEF
  ctx.save();
  ctx.font = sans(11, "700");
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  (ctx as any).letterSpacing = "3px";
  ctx.fillText("MEETHA", 32, 36);
  ctx.font = sans(8, "400");
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  (ctx as any).letterSpacing = "2.5px";
  ctx.fillText("IDENTITY BRIEF", 32, 52);
  (ctx as any).letterSpacing = "0px";
  ctx.restore();

  // Top-right: compass star
  drawCompassStar(ctx, W - 36, 36, 10, "rgba(255,255,255,0.7)");

  return heroH;
}

function renderHeadline(ctx: SKRSContext2D, brief: AestheticBrief, y: number, W: number, PAD: number): number {
  const startY = y + 36;

  // YOUR IDENTITY BRIEF
  ctx.save();
  ctx.font = serif(38, "300");
  ctx.fillStyle = CHARCOAL;
  ctx.fillText("YOUR IDENTITY BRIEF", PAD, startY);
  ctx.restore();

  // Summary line
  const summary = `${brief.undertone || "Warm undertone"} with ${brief.contrast_level || "natural contrast"}.`;
  ctx.save();
  ctx.font = serif(16, "300");
  ctx.fillStyle = CHARCOAL_SOFT;
  ctx.fillText(summary, PAD, startY + 28);
  ctx.restore();

  const lineY = startY + 44;
  drawDivider(ctx, PAD, lineY, W - PAD * 2, 0.5);

  return lineY + 20;
}

function renderColorPalette(ctx: SKRSContext2D, brief: AestheticBrief, y: number, W: number, PAD: number): number {
  const col1W = (W - PAD * 2) * 0.55;
  const col2X = PAD + col1W + 20;
  const col2W = W - col2X - PAD;
  let leftY = y;
  let rightY = y;

  // ── Left: Color Palette ──
  drawSectionNumber(ctx, "1.", PAD, leftY + 12);
  drawSectionLabel(ctx, "Color Palette", PAD + 16, leftY + 12);

  leftY += 22;
  ctx.save();
  ctx.font = sans(9, "400");
  ctx.fillStyle = CHARCOAL_SOFT;
  ctx.fillText("Colors that flatter your undertone", PAD, leftY);
  ctx.fillText("and natural contrast.", PAD, leftY + 13);
  ctx.restore();
  leftY += 30;

  // BEST COLORS label
  ctx.save();
  ctx.font = sans(8, "400");
  ctx.fillStyle = CHARCOAL_MUTED;
  (ctx as any).letterSpacing = "1.5px";
  ctx.fillText("BEST COLORS", PAD, leftY);
  (ctx as any).letterSpacing = "0px";
  ctx.restore();
  leftY += 12;

  // Color swatches
  const bestColors = parsePaletteColors(brief.palette || "");
  const swatchSize = 40;
  const swatchGap = 8;
  const swatchesPerRow = Math.min(6, bestColors.length);
  for (let i = 0; i < swatchesPerRow; i++) {
    const sx = PAD + i * (swatchSize + swatchGap);
    drawColorSwatch(ctx, bestColors[i].hex, sx, leftY, swatchSize, bestColors[i].name);
  }
  leftY += swatchSize + 20;

  // AVOID label (softer)
  ctx.save();
  ctx.font = sans(8, "400");
  ctx.fillStyle = CHARCOAL_MUTED;
  ctx.globalAlpha = 0.6;
  (ctx as any).letterSpacing = "1.5px";
  ctx.fillText("AVOID", PAD, leftY);
  (ctx as any).letterSpacing = "0px";
  ctx.restore();
  leftY += 12;

  // Avoid color swatches (smaller, softer)
  const avoidColors = parseAvoidColors(brief.avoid_colors || "icy tones, neon brights, stark white");
  const avoidSize = 28;
  for (let i = 0; i < Math.min(5, avoidColors.length); i++) {
    const sx = PAD + i * (avoidSize + 6);
    ctx.save();
    ctx.globalAlpha = 0.55;
    drawColorSwatch(ctx, avoidColors[i], sx, leftY, avoidSize);
    ctx.restore();
  }
  leftY += avoidSize + 14;

  // Avoid text
  ctx.save();
  ctx.font = sans(8, "400");
  ctx.fillStyle = CHARCOAL_MUTED;
  ctx.globalAlpha = 0.55;
  ctx.fillText(brief.avoid_colors || "Icy tones, neon brights, stark white", PAD, leftY);
  ctx.restore();
  leftY += 16;

  // ── Right: Metals ──
  drawSectionNumber(ctx, "2.", col2X, rightY + 12);
  drawSectionLabel(ctx, "Metals", col2X + 16, rightY + 12);

  rightY += 22;
  ctx.save();
  ctx.font = sans(9, "400");
  ctx.fillStyle = CHARCOAL_SOFT;
  ctx.fillText("Metals that enhance your warmth", col2X, rightY);
  ctx.fillText("and natural radiance.", col2X, rightY + 13);
  ctx.restore();
  rightY += 30;

  // BEST / SECONDARY / AVOID labels
  const metalColW = col2W / 3;
  const metalLabels = ["BEST", "SECONDARY", "AVOID"];
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.font = sans(7, "400");
    ctx.fillStyle = i === 2 ? CHARCOAL_MUTED : CHARCOAL_MUTED;
    ctx.globalAlpha = i === 2 ? 0.5 : 0.8;
    (ctx as any).letterSpacing = "1px";
    ctx.textAlign = "center";
    ctx.fillText(metalLabels[i], col2X + i * metalColW + metalColW / 2, rightY);
    ctx.textAlign = "left";
    (ctx as any).letterSpacing = "0px";
    ctx.restore();
  }
  rightY += 12;

  // Metal circles (earring-like)
  const metalColors = [
    { fill: "#D4AF6A", stroke: "#B8956A", label: brief.best_metals?.split(",")[0]?.trim() || "Brushed Gold" },
    { fill: "#D0D0D0", stroke: "#A8A8A8", label: "Muted Silver" },
    { fill: "#E8E8E8", stroke: "#C0C0C0", label: "Bright Silver" },
  ];

  for (let i = 0; i < 3; i++) {
    const cx = col2X + i * metalColW + metalColW / 2;
    const cy = rightY + 28;
    const r = i === 0 ? 22 : 18;
    ctx.save();
    ctx.globalAlpha = i === 2 ? 0.4 : 1;
    // Outer ring
    drawCircle(ctx, cx, cy, r, "transparent", metalColors[i].stroke);
    // Inner ring (earring hoop effect)
    drawCircle(ctx, cx, cy, r * 0.65, "transparent", metalColors[i].stroke);
    ctx.restore();

    // Label below
    ctx.save();
    ctx.font = sans(8, "400");
    ctx.fillStyle = CHARCOAL_SOFT;
    ctx.globalAlpha = i === 2 ? 0.4 : 0.85;
    ctx.textAlign = "center";
    const labelLines = metalColors[i].label.split(" ");
    for (let l = 0; l < Math.min(2, labelLines.length); l++) {
      ctx.fillText(labelLines[l], cx, cy + r + 14 + l * 12);
    }
    ctx.textAlign = "left";
    ctx.restore();
  }
  rightY += 28 + 22 + 30;

  // Metal note
  ctx.save();
  ctx.font = sans(8, "400");
  ctx.fillStyle = CHARCOAL_SOFT;
  ctx.globalAlpha = 0.7;
  const metalNote = `Warm reflective metals soften your contrast and photograph more naturally against your skin tone.`;
  drawBodyText(ctx, metalNote, col2X, rightY, col2W, 13, CHARCOAL_SOFT, 8);
  ctx.restore();
  rightY += 40;

  const maxY = Math.max(leftY, rightY) + 16;
  drawDivider(ctx, PAD, maxY, W - PAD * 2);
  return maxY + 20;
}

function renderMakeupLightingFabrics(ctx: SKRSContext2D, brief: AestheticBrief, y: number, W: number, PAD: number): number {
  const thirdW = (W - PAD * 2) / 3;
  const col2X = PAD + thirdW + 10;
  const col3X = PAD + thirdW * 2 + 20;
  let col1Y = y;
  let col2Y = y;
  let col3Y = y;

  // ── Column 1: Makeup Direction ──
  drawSectionNumber(ctx, "3.", PAD, col1Y + 12);
  drawSectionLabel(ctx, "Makeup Direction", PAD + 16, col1Y + 12);
  col1Y += 22;

  ctx.save();
  ctx.font = sans(8, "400");
  ctx.fillStyle = CHARCOAL_SOFT;
  ctx.fillText("Enhance, don't overpower.", PAD, col1Y);
  ctx.restore();
  col1Y += 18;

  // Makeup items from brief
  const makeupItems = parseMakeupItems(brief.makeup || "", brief.makeup_intensity || "");
  for (const item of makeupItems.slice(0, 5)) {
    // Small circle icon
    drawCircle(ctx, PAD + 8, col1Y - 4, 7, item.color, "rgba(0,0,0,0.1)");

    ctx.save();
    ctx.font = sans(9, "700");
    ctx.fillStyle = CHARCOAL;
    ctx.fillText(item.label, PAD + 20, col1Y);
    ctx.restore();

    ctx.save();
    ctx.font = sans(8, "400");
    ctx.fillStyle = CHARCOAL_SOFT;
    ctx.fillText(item.sub, PAD + 20, col1Y + 12);
    ctx.restore();
    col1Y += 30;
  }

  // ── Column 2: Lighting ──
  drawSectionNumber(ctx, "4.", col2X, col2Y + 12);
  drawSectionLabel(ctx, "Lighting", col2X + 16, col2Y + 12);
  col2Y += 22;

  ctx.save();
  ctx.font = sans(8, "400");
  ctx.fillStyle = CHARCOAL_SOFT;
  ctx.fillText("You photograph strongest in", col2X, col2Y);
  ctx.fillText("warm, directional light.", col2X, col2Y + 12);
  ctx.restore();
  col2Y += 30;

  // BEST
  ctx.save();
  ctx.font = sans(8, "400");
  ctx.fillStyle = CHARCOAL_MUTED;
  (ctx as any).letterSpacing = "1px";
  ctx.fillText("BEST", col2X, col2Y);
  (ctx as any).letterSpacing = "0px";
  ctx.restore();
  col2Y += 12;

  const lightingBest = parseLightingItems(brief.lighting || "", "best");
  for (const item of lightingBest.slice(0, 4)) {
    ctx.save();
    ctx.font = sans(8, "400");
    ctx.fillStyle = GOLD;
    ctx.fillText("✦  " + item, col2X, col2Y);
    ctx.restore();
    col2Y += 14;
  }
  col2Y += 6;

  // AVOID
  ctx.save();
  ctx.font = sans(8, "400");
  ctx.fillStyle = CHARCOAL_MUTED;
  ctx.globalAlpha = 0.55;
  (ctx as any).letterSpacing = "1px";
  ctx.fillText("AVOID", col2X, col2Y);
  (ctx as any).letterSpacing = "0px";
  ctx.restore();
  col2Y += 12;

  const lightingAvoid = parseLightingItems(brief.lighting || "", "avoid");
  for (const item of lightingAvoid.slice(0, 3)) {
    ctx.save();
    ctx.font = sans(8, "400");
    ctx.fillStyle = CHARCOAL_MUTED;
    ctx.globalAlpha = 0.55;
    ctx.fillText("×  " + item, col2X, col2Y);
    ctx.restore();
    col2Y += 14;
  }
  col2Y += 6;

  // Lighting note
  const lightingNote = brief.lighting_direction || "Your features photograph strongest in directional warm light with soft shadow falloff.";
  ctx.save();
  ctx.font = sans(8, "400");
  ctx.fillStyle = CHARCOAL_SOFT;
  ctx.globalAlpha = 0.7;
  drawBodyText(ctx, lightingNote, col2X, col2Y, thirdW - 20, 13, CHARCOAL_SOFT, 8);
  ctx.restore();
  col2Y += 30;

  // ── Column 3: Fabrics + Textures ──
  drawSectionNumber(ctx, "5.", col3X, col3Y + 12);
  drawSectionLabel(ctx, "Fabrics + Textures", col3X + 16, col3Y + 12);
  col3Y += 22;

  ctx.save();
  ctx.font = sans(8, "400");
  ctx.fillStyle = CHARCOAL_SOFT;
  ctx.fillText("Textures that harmonize with", col3X, col3Y);
  ctx.fillText("your contrast and movement.", col3X, col3Y + 12);
  ctx.restore();
  col3Y += 30;

  // BEST fabrics
  ctx.save();
  ctx.font = sans(8, "400");
  ctx.fillStyle = CHARCOAL_MUTED;
  (ctx as any).letterSpacing = "1px";
  ctx.fillText("BEST", col3X, col3Y);
  (ctx as any).letterSpacing = "0px";
  ctx.restore();
  col3Y += 12;

  const fabricColors = ["#C8B89A", "#8B6B4A", "#D4C8B8", "#A89880"];
  const fabricLabels = parseFabricItems(brief.fabrics || "", "best");
  const fabricCircleR = 20;
  for (let i = 0; i < Math.min(4, fabricLabels.length); i++) {
    const cx = col3X + i * (fabricCircleR * 2 + 8) + fabricCircleR;
    drawCircle(ctx, cx, col3Y + fabricCircleR, fabricCircleR, fabricColors[i % fabricColors.length], "rgba(0,0,0,0.08)");
    ctx.save();
    ctx.font = sans(7, "400");
    ctx.fillStyle = CHARCOAL_SOFT;
    ctx.textAlign = "center";
    ctx.fillText(fabricLabels[i], cx, col3Y + fabricCircleR * 2 + 12);
    ctx.textAlign = "left";
    ctx.restore();
  }
  col3Y += fabricCircleR * 2 + 22;

  // AVOID fabrics
  ctx.save();
  ctx.font = sans(8, "400");
  ctx.fillStyle = CHARCOAL_MUTED;
  ctx.globalAlpha = 0.5;
  (ctx as any).letterSpacing = "1px";
  ctx.fillText("AVOID", col3X, col3Y);
  (ctx as any).letterSpacing = "0px";
  ctx.restore();
  col3Y += 12;

  const avoidFabrics = parseFabricItems(brief.fabrics || "", "avoid");
  const avoidFabricColors = ["#2A2A3A", "#1A1A1A"];
  for (let i = 0; i < Math.min(2, avoidFabrics.length); i++) {
    const cx = col3X + i * (fabricCircleR * 2 + 8) + fabricCircleR;
    ctx.save();
    ctx.globalAlpha = 0.35;
    drawCircle(ctx, cx, col3Y + fabricCircleR, fabricCircleR, avoidFabricColors[i % avoidFabricColors.length], "rgba(0,0,0,0.1)");
    ctx.restore();
    ctx.save();
    ctx.font = sans(7, "400");
    ctx.fillStyle = CHARCOAL_MUTED;
    ctx.globalAlpha = 0.45;
    ctx.textAlign = "center";
    ctx.fillText(avoidFabrics[i], cx, col3Y + fabricCircleR * 2 + 12);
    ctx.textAlign = "left";
    ctx.restore();
  }
  col3Y += fabricCircleR * 2 + 22;

  // Fabric note
  ctx.save();
  ctx.font = sans(8, "400");
  ctx.fillStyle = CHARCOAL_SOFT;
  ctx.globalAlpha = 0.65;
  ctx.fillText("Soft reflective textures create stronger", col3X, col3Y);
  ctx.fillText("visual harmony with your contrast level.", col3X, col3Y + 12);
  ctx.restore();
  col3Y += 26;

  const maxY = Math.max(col1Y, col2Y, col3Y) + 16;
  drawDivider(ctx, PAD, maxY, W - PAD * 2);
  return maxY + 20;
}

function renderPresenceAndWorlds(ctx: SKRSContext2D, brief: AestheticBrief, y: number, W: number, PAD: number): number {
  const halfW = (W - PAD * 2) / 2;
  const col2X = PAD + halfW + 20;
  let col1Y = y;
  let col2Y = y;

  // ── Left: Presence ──
  drawSectionNumber(ctx, "6.", PAD, col1Y + 12);
  drawSectionLabel(ctx, "Presence", PAD + 16, col1Y + 12);
  col1Y += 22;

  ctx.save();
  ctx.font = sans(9, "400");
  ctx.fillStyle = CHARCOAL_SOFT;
  ctx.fillText("Your natural energy, captured.", PAD, col1Y);
  ctx.restore();
  col1Y += 20;

  const presenceItems = [
    { icon: "✦", label: "Quiet Luxury" },
    { icon: "✺", label: "Relaxed Power" },
    { icon: "☽", label: "Cinematic Femininity" },
    { icon: "◇", label: "Editorial Softness" },
  ];

  for (const item of presenceItems) {
    ctx.save();
    ctx.font = sans(12, "400");
    ctx.fillStyle = GOLD;
    ctx.fillText(item.icon, PAD, col1Y);
    ctx.font = sans(10, "400");
    ctx.fillStyle = CHARCOAL;
    ctx.fillText(item.label, PAD + 22, col1Y);
    ctx.restore();
    col1Y += 22;
  }

  // ── Right: Your Worlds ──
  drawSectionNumber(ctx, "7.", col2X, col2Y + 12);
  drawSectionLabel(ctx, "Your Worlds", col2X + 16, col2Y + 12);
  col2Y += 22;

  ctx.save();
  ctx.font = sans(9, "400");
  ctx.fillStyle = CHARCOAL_SOFT;
  ctx.fillText("Environments where you look and feel most like yourself.", col2X, col2Y);
  ctx.restore();
  col2Y += 18;

  // World thumbnails as colored rectangles with labels
  const worlds = [
    { label: "Rooftop\nDinners", color: "#1A1208" },
    { label: "Dim\nRestaurants", color: "#1C1410" },
    { label: "Luxury\nHotels", color: "#2A2018" },
    { label: "Black Car\nFlash Photography", color: "#0A0A0A" },
    { label: "Candlelit\nInteriors", color: "#1E1208" },
    { label: "Airport\nLounges", color: "#181818" },
  ];

  const thumbW = (W - col2X - PAD) / 3 - 6;
  const thumbH = thumbW * 0.75;

  for (let i = 0; i < 6; i++) {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const tx = col2X + col * (thumbW + 6);
    const ty = col2Y + row * (thumbH + 20);

    // Dark thumbnail
    const grad = ctx.createLinearGradient(tx, ty, tx, ty + thumbH);
    grad.addColorStop(0, worlds[i].color);
    grad.addColorStop(1, "#0A0A0A");
    ctx.fillStyle = grad;
    ctx.fillRect(tx, ty, thumbW, thumbH);

    // Label below
    const lines = worlds[i].label.split("\n");
    ctx.save();
    ctx.font = sans(7, "400");
    ctx.fillStyle = CHARCOAL_SOFT;
    ctx.textAlign = "center";
    for (let l = 0; l < lines.length; l++) {
      ctx.fillText(lines[l], tx + thumbW / 2, ty + thumbH + 10 + l * 10);
    }
    ctx.textAlign = "left";
    ctx.restore();
  }

  col2Y += thumbH * 2 + 40;

  const maxY = Math.max(col1Y, col2Y) + 16;
  drawDivider(ctx, PAD, maxY, W - PAD * 2, 0.25);
  return maxY + 20;
}

function renderFooter(ctx: SKRSContext2D, y: number, W: number) {
  // Compass star left
  drawCompassStar(ctx, 32, y + 12, 8, GOLD);

  // Center text
  ctx.save();
  ctx.font = sans(8, "400");
  ctx.fillStyle = CHARCOAL_MUTED;
  (ctx as any).letterSpacing = "2px";
  ctx.textAlign = "center";
  ctx.fillText("THIS IS YOUR AESTHETIC BLUEPRINT.", W / 2, y + 14);
  (ctx as any).letterSpacing = "0px";
  ctx.textAlign = "left";
  ctx.restore();

  // Right: MEETHA
  ctx.save();
  ctx.font = sans(10, "700");
  ctx.fillStyle = CHARCOAL;
  (ctx as any).letterSpacing = "3px";
  ctx.textAlign = "right";
  ctx.fillText("MEETHA", W - 32, y + 14);
  (ctx as any).letterSpacing = "0px";
  ctx.textAlign = "left";
  ctx.restore();
}

// ─── Text Parsers ─────────────────────────────────────────────────────────────

function parseMakeupItems(makeupStr: string, intensityStr: string): Array<{ label: string; sub: string; color: string }> {
  const defaults = [
    { label: "Espresso liner", sub: "Softly define the eyes", color: "#3B1F0A" },
    { label: "Satin skin finish", sub: "Natural glow, not dewy", color: "#D4B896" },
    { label: "Warm contour", sub: "Subtle definition", color: "#C19A6B" },
    { label: "Muted nude lip", sub: "Warm, earthy tones", color: "#8B4513" },
    { label: "Avoid cool blush tones", sub: "They create artificial contrast", color: "#C8A0A0" },
  ];

  if (!makeupStr || makeupStr.length < 10) return defaults;

  // Try to extract items from the makeup string
  const sentences = makeupStr.split(/[.,;]/).filter(s => s.trim().length > 3);
  if (sentences.length < 2) return defaults;

  return sentences.slice(0, 5).map((s, i) => ({
    label: s.trim().split(" ").slice(0, 3).join(" "),
    sub: s.trim(),
    color: defaults[i % defaults.length].color,
  }));
}

function parseLightingItems(lightingStr: string, type: "best" | "avoid"): string[] {
  if (type === "best") {
    const bestDefaults = ["Golden hour", "Warm side lighting", "Candlelight", "Dim ambient lighting"];
    if (!lightingStr || lightingStr.length < 10) return bestDefaults;
    // Extract warm/golden/directional mentions
    const matches = lightingStr.match(/golden|warm|candle|dim|directional|soft|natural/gi);
    if (!matches || matches.length < 2) return bestDefaults;
    return bestDefaults;
  } else {
    const avoidDefaults = ["Overhead fluorescent", "Cool LED lighting", "Harsh direct flash"];
    if (!lightingStr || lightingStr.length < 10) return avoidDefaults;
    return avoidDefaults;
  }
}

function parseFabricItems(fabricStr: string, type: "best" | "avoid"): string[] {
  if (type === "best") {
    const defaults = ["Suede", "Matte Silk", "Structured\nWool", "Velvet"];
    if (!fabricStr || fabricStr.length < 5) return defaults;
    const words = fabricStr.split(/[,\s]+/).filter(w => w.length > 3);
    if (words.length < 2) return defaults;
    return words.slice(0, 4).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  } else {
    return ["Shiny\nPolyester", "Stiff\nFabrics"];
  }
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function renderIdentityBriefCard(
  brief: AestheticBrief,
  heroImageUrl?: string | null
): Promise<Buffer> {
  const W = 900;
  const PAD = 32;

  // Load hero image if available
  let heroImage: import("@napi-rs/canvas").Image | null = null;
  if (heroImageUrl) {
    try {
      heroImage = await loadImage(heroImageUrl);
    } catch (e) {
      console.warn("[identityBriefCard] Could not load hero image:", e);
    }
  }

  // First pass: calculate total height
  // We'll render to a tall canvas and then crop
  const ESTIMATED_H = 1560;
  const canvas = createCanvas(W, ESTIMATED_H);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, ESTIMATED_H);

  let y = 0;

  // Hero
  y = renderHero(ctx, heroImage, W);

  // Cream background for content
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, y, W, ESTIMATED_H - y);

  // Headline
  y = renderHeadline(ctx, brief, y, W, PAD);

  // Color Palette + Metals
  y = renderColorPalette(ctx, brief, y, W, PAD);

  // Makeup + Lighting + Fabrics
  y = renderMakeupLightingFabrics(ctx, brief, y, W, PAD);

  // Presence + Worlds
  y = renderPresenceAndWorlds(ctx, brief, y, W, PAD);

  // Footer
  const footerY = y + 12;
  renderFooter(ctx, footerY, W);
  const finalH = footerY + 40;

  // Crop to actual content height
  const finalCanvas = createCanvas(W, finalH);
  const finalCtx = finalCanvas.getContext("2d");
  finalCtx.drawImage(canvas, 0, 0, W, finalH, 0, 0, W, finalH);

  return finalCanvas.toBuffer("image/png");
}
