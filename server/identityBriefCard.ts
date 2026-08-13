/**
 * Identity Brief Card Renderer — Luxury Editorial Edition
 *
 * Design principles:
 *   - Hero image dominates the top 55% of the card
 *   - Deep charcoal gradient scrim carries the headline
 *   - Generous whitespace between every section (60px+)
 *   - High-contrast body text (#2C2C2C on cream)
 *   - Gold section labels, one clean sentence of copy per section
 *   - Large color swatches (56px), no cramped rows
 *   - Your Worlds: warm cream placeholder tiles, never black
 *   - Footer: MEETHA centered in gold, nothing else
 *
 * Card dimensions: 900 x ~1800px (portrait, shareable)
 */
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";
import type { SKRSContext2D } from "@napi-rs/canvas";
import path from "path";
import { fileURLToPath } from "url";
import { getProfile } from "./db";
import { storageGetSignedUrl } from "./storage";

type AestheticBrief = {
  palette: string;
  metals: string;
  fabrics: string;
  makeup: string;
  lighting: string;
  hair: string;
  undertone?: string | null;
  contrast_level?: string | null;
  lipstick_family?: string | null;
};

// ESM-safe __dirname
function getDirname(): string {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return typeof __dirname !== "undefined" ? __dirname : process.cwd();
  }
}

// ─── Font Registration ────────────────────────────────────────────────────────

const FONTS_DIR = path.join(getDirname(), "fonts");

function registerFonts() {
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

const CREAM        = "#F7F3EC";
const CHARCOAL     = "#111111";
const CHARCOAL_MID = "#181818";
const GOLD         = "#B8956A";
const GOLD_LIGHT   = "#D4B896";
const DIVIDER      = "#DDD5C5";
const WARM_SAND    = "#EDE6D8";

// ─── Typography helpers ───────────────────────────────────────────────────────

function serif(size: number, weight: "300" | "400" = "300") {
  return `${weight} ${size}px Cormorant, Georgia, serif`;
}

function sans(size: number, weight: "400" | "700" = "400") {
  return `${weight} ${size}px Liberation, Arial, sans-serif`;
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawGoldRule(ctx: SKRSContext2D, x: number, y: number, width: number, alpha = 0.4) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width, y);
  ctx.stroke();
  ctx.restore();
}

function drawSectionLabel(ctx: SKRSContext2D, text: string, x: number, y: number) {
  ctx.save();
  ctx.font = sans(9, "700");
  ctx.fillStyle = GOLD;
  ctx.globalAlpha = 0.9;
  ctx.textAlign = "left";
  ctx.letterSpacing = "0.22em";
  ctx.fillText(text.toUpperCase(), x, y);
  ctx.restore();
}

/** Wrap text and return lines. */
function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Draw wrapped body text, returns final y after last line. */
function drawBodyText(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  opts: { fontSize?: number; lineHeight?: number; color?: string; alpha?: number } = {}
): number {
  const fontSize = opts.fontSize ?? 17;
  const lineHeight = opts.lineHeight ?? fontSize * 1.65;
  const color = opts.color ?? CHARCOAL_MID;
  const alpha = opts.alpha ?? 1;
  ctx.save();
  ctx.font = serif(fontSize);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.textAlign = "left";
  const lines = wrapText(ctx, text, maxWidth);
  let cy = y;
  for (const line of lines) {
    ctx.fillText(line, x, cy);
    cy += lineHeight;
  }
  ctx.restore();
  return cy;
}

// ─── Color parsing ────────────────────────────────────────────────────────────

function parsePaletteColors(paletteStr: string): Array<{ hex: string; name: string }> {
  const results: Array<{ hex: string; name: string }> = [];
  const hexPattern = /#([0-9A-Fa-f]{6})\b/g;
  let match;
  while ((match = hexPattern.exec(paletteStr)) !== null) {
    const hex = `#${match[1]}`;
    const before = paletteStr.slice(Math.max(0, match.index - 30), match.index);
    const nameMatch = before.match(/([A-Z][a-z]+(?:\s+[A-Z]?[a-z]+){0,2})\s*[:(]?\s*$/);
    const name = nameMatch ? nameMatch[1].trim() : "";
    results.push({ hex, name });
  }
  if (results.length === 0) {
    const colorWords = paletteStr.match(/\b([A-Z][a-z]+(?:\s+[a-z]+)?)\b/g) ?? [];
    const colorMap: Record<string, string> = {
      ivory: "#FFFFF0", cream: "#FFFDD0", champagne: "#F7E7CE", camel: "#C19A6B",
      tan: "#D2B48C", sand: "#C2B280", taupe: "#483C32", mocha: "#967969",
      chocolate: "#7B3F00", espresso: "#4B2E2E", black: "#1A1A1A", white: "#F5F5F0",
      navy: "#1B2A4A", forest: "#2D4A2D", burgundy: "#722F37", terracotta: "#C06040",
      rust: "#B7410E", olive: "#6B6B2A", sage: "#8A9A7A", blush: "#E8B4B8",
      mauve: "#9B7B8A", rose: "#C87A8A", gold: "#B8956A", bronze: "#8C6239",
      copper: "#B87333", silver: "#A8A8A8", charcoal: "#3C3C3C", slate: "#6A7A8A",
    };
    for (const word of colorWords.slice(0, 6)) {
      const lower = word.toLowerCase();
      if (colorMap[lower]) {
        results.push({ hex: colorMap[lower], name: word });
      }
    }
  }
  return results.slice(0, 6);
}

function parseAvoidColors(paletteStr: string): string[] {
  const avoidMatch = paletteStr.match(/avoid[:\s]+([^.]+)/i);
  if (!avoidMatch) return [];
  const avoidSection = avoidMatch[1];
  const hexes = avoidSection.match(/#[0-9A-Fa-f]{6}/g) ?? [];
  return hexes.slice(0, 3);
}

// ─── Section Renderers ────────────────────────────────────────────────────────

/** HERO: full-bleed image, 55% of card height, with deep gradient scrim + headline */
function renderHero(
  ctx: SKRSContext2D,
  heroImage: import("@napi-rs/canvas").Image | null,
  brief: AestheticBrief,
  W: number
): number {
  const HERO_H = Math.round(W * 0.97); // ~873px for a 900px wide card (~12% shorter)
  const PAD = 52;

  // Background
  if (heroImage) {
    // Draw image cover-fit
    const imgAspect = heroImage.width / heroImage.height;
    const canvasAspect = W / HERO_H;
    let sx = 0, sy = 0, sw = heroImage.width, sh = heroImage.height;
    if (imgAspect > canvasAspect) {
      sw = heroImage.height * canvasAspect;
      sx = (heroImage.width - sw) / 2;
    } else {
      sh = heroImage.width / canvasAspect;
      sy = (heroImage.height - sh) / 3; // favor top third
    }
    ctx.drawImage(heroImage, sx, sy, sw, sh, 0, 0, W, HERO_H);
  } else {
    // Warm editorial gradient placeholder
    const grad = ctx.createLinearGradient(0, 0, W, HERO_H);
    grad.addColorStop(0, "#2C1F14");
    grad.addColorStop(0.5, "#3D2B1A");
    grad.addColorStop(1, "#1A1208");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, HERO_H);
    // Subtle texture lines
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = GOLD_LIGHT;
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 12; i++) {
      const y = (HERO_H / 12) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y + 40);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Deep gradient scrim — bottom 60% of hero
  const scrimGrad = ctx.createLinearGradient(0, HERO_H * 0.35, 0, HERO_H);
  scrimGrad.addColorStop(0, "rgba(0,0,0,0)");
  scrimGrad.addColorStop(0.4, "rgba(0,0,0,0.35)");
  scrimGrad.addColorStop(1, "rgba(0,0,0,0.82)");
  ctx.fillStyle = scrimGrad;
  ctx.fillRect(0, 0, W, HERO_H);

  // meetha.studio wordmark — top left
  ctx.save();
  ctx.font = sans(19, "700");
  ctx.fillStyle = "rgba(255,248,235,0.65)";
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
  ctx.fillText("meetha.studio", PAD, 60);
  ctx.restore();

  // Headline — bottom of hero
  const headlineY = HERO_H - 140;

  // Undertone + contrast line
  const subline = [brief.undertone, brief.contrast_level].filter(Boolean).join("  ·  ");
  if (subline) {
    ctx.save();
    ctx.font = sans(10, "400");
    ctx.fillStyle = GOLD_LIGHT;
    ctx.globalAlpha = 0.85;
    ctx.textAlign = "left";
    ctx.fillText(subline.toUpperCase(), PAD, headlineY);
    ctx.restore();
  }

  // Main headline
  ctx.save();
  ctx.font = serif(58, "300");
  ctx.fillStyle = "#FFFFFF";
  ctx.globalAlpha = 0.97;
  ctx.textAlign = "left";
  ctx.fillText("YOUR IDENTITY BRIEF", PAD, headlineY + 58);
  ctx.restore();

  // Thin gold rule
  drawGoldRule(ctx, PAD, headlineY + 74, W - PAD * 2, 0.5);

  return HERO_H;
}

/** PALETTE SECTION */
function renderPalette(ctx: SKRSContext2D, brief: AestheticBrief, y: number, W: number, PAD: number): number {
  const SWATCH_SIZE = 56;
  const SWATCH_GAP = 16;
  const colors = parsePaletteColors(brief.palette);
  const avoidHexes = parseAvoidColors(brief.palette);

  y += 64;
  drawSectionLabel(ctx, "Color Palette", PAD, y);
  y += 24;

  // One-line editorial description
  const desc = brief.palette.split(".")[0].replace(/#[0-9A-Fa-f]{6}/g, "").replace(/\s{2,}/g, " ").trim();
  if (desc.length > 10) {
    y = drawBodyText(ctx, desc, PAD, y, W - PAD * 2, { fontSize: 17, color: CHARCOAL_MID });
    y += 20;
  }

  // Swatches row
  if (colors.length > 0) {
    let sx = PAD;
    for (const c of colors) {
      // Swatch square
      ctx.save();
      ctx.fillStyle = c.hex;
      ctx.fillRect(sx, y, SWATCH_SIZE, SWATCH_SIZE);
      // Subtle border
      ctx.strokeStyle = "rgba(0,0,0,0.08)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx, y, SWATCH_SIZE, SWATCH_SIZE);
      ctx.restore();
      // Name below
      if (c.name) {
        ctx.save();
        ctx.font = sans(8, "400");
        ctx.fillStyle = CHARCOAL_MID;
        ctx.globalAlpha = 0.65;
        ctx.textAlign = "center";
        ctx.fillText(c.name.slice(0, 12), sx + SWATCH_SIZE / 2, y + SWATCH_SIZE + 14);
        ctx.restore();
      }
      sx += SWATCH_SIZE + SWATCH_GAP;
      if (sx + SWATCH_SIZE > W - PAD) break;
    }
    y += SWATCH_SIZE + 28;
  }

  // Avoid swatches (smaller)
  if (avoidHexes.length > 0) {
    ctx.save();
    ctx.font = sans(8, "400");
    ctx.fillStyle = CHARCOAL_MID;
    ctx.globalAlpha = 0.45;
    ctx.textAlign = "left";
    ctx.fillText("AVOID", PAD, y + 10);
    ctx.restore();
    let sx = PAD + 44;
    for (const hex of avoidHexes) {
      ctx.save();
      ctx.fillStyle = hex;
      ctx.fillRect(sx, y, 28, 28);
      ctx.strokeStyle = "rgba(0,0,0,0.08)";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx, y, 28, 28);
      ctx.restore();
      sx += 36;
    }
    y += 44;
  }

  drawGoldRule(ctx, PAD, y + 12, W - PAD * 2, 0.25);
  return y + 12;
}

/** METALS SECTION */
function renderMetals(ctx: SKRSContext2D, brief: AestheticBrief, y: number, W: number, PAD: number): number {
  y += 50;
  drawSectionLabel(ctx, "Metals", PAD, y);
  y += 30;
  y = drawBodyText(ctx, brief.metals, PAD, y, W - PAD * 2, { fontSize: 19, color: CHARCOAL });
  drawGoldRule(ctx, PAD, y + 20, W - PAD * 2, 0.25);
  return y + 20;
}

/** MAKEUP SECTION */
function renderMakeup(ctx: SKRSContext2D, brief: AestheticBrief, y: number, W: number, PAD: number): number {
  y += 50;
  drawSectionLabel(ctx, "Makeup Direction", PAD, y);
  y += 24;
  y = drawBodyText(ctx, brief.makeup, PAD, y, W - PAD * 2, { fontSize: 19, color: CHARCOAL });

  // Lipstick family if available
  if (brief.lipstick_family) {
    y += 16;
    ctx.save();
    ctx.font = sans(9, "700");
    ctx.fillStyle = GOLD;
    ctx.globalAlpha = 0.7;
    ctx.textAlign = "left";
    ctx.fillText("LIP", PAD, y);
    ctx.restore();
    ctx.save();
    ctx.font = serif(16);
    ctx.fillStyle = CHARCOAL_MID;
    ctx.textAlign = "left";
    ctx.fillText(brief.lipstick_family, PAD + 36, y);
    ctx.restore();
    y += 22;
  }

  drawGoldRule(ctx, PAD, y + 20, W - PAD * 2, 0.25);
  return y + 20;
}

/** LIGHTING SECTION */
function renderLighting(ctx: SKRSContext2D, brief: AestheticBrief, y: number, W: number, PAD: number): number {
  y += 36;
  drawSectionLabel(ctx, "Lighting", PAD, y);
  y += 30;
  y = drawBodyText(ctx, brief.lighting, PAD, y, W - PAD * 2, { fontSize: 19, color: CHARCOAL });
  drawGoldRule(ctx, PAD, y + 14, W - PAD * 2, 0.25);
  return y + 14;
}

/** FABRICS SECTION */
function renderFabrics(ctx: SKRSContext2D, brief: AestheticBrief, y: number, W: number, PAD: number): number {
  y += 36;
  drawSectionLabel(ctx, "Fabrics + Texture", PAD, y);
  y += 22;
  y = drawBodyText(ctx, brief.fabrics, PAD, y, W - PAD * 2, { fontSize: 19, color: CHARCOAL });
  drawGoldRule(ctx, PAD, y + 14, W - PAD * 2, 0.25);
  return y + 14;
}

/** PRESENCE SECTION */
function renderPresence(ctx: SKRSContext2D, brief: AestheticBrief, y: number, W: number, PAD: number): number {
  y += 36;
  drawSectionLabel(ctx, "Presence", PAD, y);
  y += 30;
  y = drawBodyText(ctx, brief.hair, PAD, y, W - PAD * 2, { fontSize: 19, color: CHARCOAL });
  drawGoldRule(ctx, PAD, y + 14, W - PAD * 2, 0.25);
  return y + 14;
}

// ─── Scene Selection ─────────────────────────────────────────────────────────

type SceneEntry = { label: string; key: string; slot: "morning" | "afternoon" | "golden_hour" | "night"; tone: "warm" | "cool" };

const ALL_SCENES: SceneEntry[] = [
  { label: "Morning Light",          key: "8sYDCLxtY2Ni_f09898c8.jpg",  slot: "morning",      tone: "cool" },
  { label: "Morning Lounge",         key: "fhhwwApsyhoh_a3ba19ab.jpg", slot: "morning",      tone: "warm" },
  { label: "Hotel Lobby",            key: "RdmvCDQJGJeE_89c1ff1f.jpg", slot: "afternoon",    tone: "warm" },
  { label: "Private Aviation",       key: "ka7K48spkBR2_e1262ff7.jpg", slot: "afternoon",    tone: "cool" },
  { label: "Rooftop at Sunset",      key: "Wwi1SvNTgDyH_dce0c596.jpg", slot: "golden_hour",  tone: "warm" },
  { label: "Evening Lounge",         key: "41zqV3GF0xF4_2d093184.jpg", slot: "golden_hour",  tone: "warm" },
  { label: "Hotel Corridor",         key: "gh4xmFozrLg0_264efed3.jpg", slot: "night",        tone: "warm" },
  { label: "Rooftop at Dusk",        key: "TmKdo6AomZQZ_4a871987.jpg", slot: "night",        tone: "cool" },
  { label: "Candlelit Dinner",       key: "VtTqLAgZb5bw_0e11bd81.png", slot: "night",        tone: "warm" },
  { label: "Black Car Flash",        key: "anau89FejTTN_fad1bef6.jpg", slot: "night",        tone: "cool" },
];

const WARM_KEYWORDS = ["ivory", "terracotta", "sienna", "gold", "blush", "cream", "caramel", "bronze", "rust", "amber", "warm", "honey", "peach", "coral", "sand", "wheat", "tawny", "ochre"];
const COOL_KEYWORDS = ["charcoal", "navy", "slate", "ash", "steel", "midnight", "obsidian", "smoke", "cool", "silver", "grey", "gray", "cobalt", "indigo", "taupe", "stone"];

function selectScenes(brief: AestheticBrief): SceneEntry[] {
  const paletteText = [brief.palette ?? "", brief.undertone ?? ""].join(" ").toLowerCase();
  let warmScore = 0;
  let coolScore = 0;
  for (const kw of WARM_KEYWORDS) if (paletteText.includes(kw)) warmScore++;
  for (const kw of COOL_KEYWORDS) if (paletteText.includes(kw)) coolScore++;
  // Default to warm on ties or if no palette data
  const preferWarm = warmScore >= coolScore;
  const preferredTone: "warm" | "cool" = preferWarm ? "warm" : "cool";
  const fallbackTone: "warm" | "cool" = preferWarm ? "cool" : "warm";

  const slots: Array<"morning" | "afternoon" | "golden_hour" | "night"> = ["morning", "afternoon", "golden_hour", "night"];
  return slots.map((slot) => {
    const preferred = ALL_SCENES.find((s) => s.slot === slot && s.tone === preferredTone);
    const fallback  = ALL_SCENES.find((s) => s.slot === slot && s.tone === fallbackTone);
    return preferred ?? fallback ?? ALL_SCENES.find((s) => s.slot === slot)!;
  });
}

/** YOUR WORLDS SECTION — 4 cinematic wide-rectangle tiles, personalized by palette */
async function renderYourWorldsAsync(
  ctx: SKRSContext2D,
  y: number,
  W: number,
  PAD: number,
  brief: AestheticBrief
): Promise<number> {
  const selectedScenes = selectScenes(brief);
  const WORLD_URLS = await Promise.all(selectedScenes.map(async (s) => ({ label: s.label, url: await storageGetSignedUrl(s.key) })));

  // Pre-fetch all world images as buffers in parallel to avoid canvas HTTP issues
  const WORLDS = await Promise.all(
    WORLD_URLS.map(async (w) => {
      try {
        const res = await fetch(w.url);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          return { label: w.label, buffer: buf };
        }
      } catch { /* fallback */ }
      return { label: w.label, buffer: null };
    })
  );

  // Fallback warm colors if image fails to load
  const FALLBACK_COLORS = ["#E6DDD0", "#D8D0C2", "#DDD6C8", "#D4CCBC"];

  y += 44;
  drawSectionLabel(ctx, "Your Worlds", PAD, y);
  y += 22;

  const COLS = 2;
  const GAP = 10;
  const TILE_W = Math.floor((W - PAD * 2 - GAP) / COLS);
  const TILE_H = Math.round(TILE_W * 0.52); // cinematic ~1.92:1

  for (let i = 0; i < WORLDS.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const tx = PAD + col * (TILE_W + GAP);
    const ty = y + row * (TILE_H + GAP);

    // Try to load the pre-fetched buffer
    let img: import("@napi-rs/canvas").Image | null = null;
    try {
      if (WORLDS[i].buffer) {
        img = await loadImage(WORLDS[i].buffer as Parameters<typeof loadImage>[0]);
      }
    } catch {
      // fallback to warm placeholder
    }

    if (img) {
      // Draw cover-fit
      const imgAspect = img.width / img.height;
      const tileAspect = TILE_W / TILE_H;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (imgAspect > tileAspect) {
        sw = img.height * tileAspect;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / tileAspect;
        sy = (img.height - sh) / 3;
      }
      ctx.drawImage(img, sx, sy, sw, sh, tx, ty, TILE_W, TILE_H);
      // Dark gradient scrim at bottom for label readability
      const scrim = ctx.createLinearGradient(tx, ty + TILE_H * 0.55, tx, ty + TILE_H);
      scrim.addColorStop(0, "rgba(0,0,0,0)");
      scrim.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = scrim;
      ctx.fillRect(tx, ty, TILE_W, TILE_H);
    } else {
      // Warm fallback
      ctx.save();
      ctx.fillStyle = FALLBACK_COLORS[i % FALLBACK_COLORS.length];
      ctx.fillRect(tx, ty, TILE_W, TILE_H);
      ctx.restore();
    }

    // Location name — bottom-left, white on image / dark on fallback
    ctx.save();
    ctx.font = sans(9, "700");
    ctx.fillStyle = img ? "rgba(255,255,255,0.9)" : CHARCOAL_MID;
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    ctx.fillText(WORLDS[i].label.toUpperCase(), tx + 12, ty + TILE_H - 12);
    ctx.restore();
  }

  const ROWS = Math.ceil(WORLDS.length / COLS);
  y += ROWS * (TILE_H + GAP) - GAP;
  drawGoldRule(ctx, PAD, y + 16, W - PAD * 2, 0.25);
  return y + 16;
}

/** FOOTER */
function renderFooter(ctx: SKRSContext2D, y: number, W: number): number {
  y += 52;
  // Thin gold rule
  drawGoldRule(ctx, W * 0.35, y, W * 0.3, 0.4);
  y += 28;
  // meetha.studio wordmark
  ctx.save();
  ctx.font = sans(22, "700");
  ctx.fillStyle = GOLD_LIGHT;
  ctx.globalAlpha = 0.78;
  ctx.textAlign = "center";
  ctx.fillText("meetha.studio", W / 2, y);
  ctx.restore();
  y += 16;
  // Tagline
  ctx.save();
  ctx.font = sans(15, "400");
  ctx.fillStyle = CHARCOAL_MID;
  ctx.globalAlpha = 0.58;
  ctx.textAlign = "center";
  ctx.fillText("styled by meetha.studio", W / 2, y);
  ctx.restore();
  return y + 48;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function renderIdentityBriefCard(
  brief: AestheticBrief,
  heroImageSource?: string | Buffer | null
): Promise<Buffer> {
  const W = 900;
  const PAD = 52;

  // Load hero image if available (accepts URL string or raw Buffer)
  let heroImage: import("@napi-rs/canvas").Image | null = null;
  if (heroImageSource) {
    try {
      heroImage = await loadImage(heroImageSource as Parameters<typeof loadImage>[0]);
    } catch (e) {
      console.warn("[identityBriefCard] Could not load hero image:", e);
    }
  }

  // Render to a tall canvas, then crop to actual content
  const ESTIMATED_H = 3500;
  const canvas = createCanvas(W, ESTIMATED_H);
  const ctx = canvas.getContext("2d");

  // Cream background
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, W, ESTIMATED_H);

  let y = 0;

  // Hero (full-bleed, with headline overlay)
  y = renderHero(ctx, heroImage, brief, W);

  // Content background
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, y, W, ESTIMATED_H - y);

  // Sections
  y = renderPalette(ctx, brief, y, W, PAD);
  y = renderMetals(ctx, brief, y, W, PAD);
  y = renderMakeup(ctx, brief, y, W, PAD);
  y = renderLighting(ctx, brief, y, W, PAD);
  y = renderFabrics(ctx, brief, y, W, PAD);
  y = renderPresence(ctx, brief, y, W, PAD);
  y = await renderYourWorldsAsync(ctx, y, W, PAD, brief);

  // Footer
  const finalY = renderFooter(ctx, y, W);

  // Crop to actual content
  const finalCanvas = createCanvas(W, finalY);
  const finalCtx = finalCanvas.getContext("2d");
  finalCtx.drawImage(canvas, 0, 0, W, finalY, 0, 0, W, finalY);

  return finalCanvas.toBuffer("image/png");
}
