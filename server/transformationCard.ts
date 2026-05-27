/**
 * Visual Transformation Card Generator
 *
 * Generates a shareable "Your Visual Transformation" card:
 * - Header: "YOUR VISUAL TRANSFORMATION" title + subtitle
 * - Main: before photo (left) + after/generation photo (right) with BEFORE/AFTER labels
 * - Footer: 5 columns: Color Palette swatches, Style Direction, Makeup Energy, Jewelry Direction, Your Energy
 *
 * Generated once per paid user after their 2nd generation (Starter) or 1st generation (Pro).
 * Saved to S3 and URL stored in profiles.transformation_card_url.
 *
 * Font approach: uses @napi-rs/canvas with GlobalFonts.registerFromPath() — same as styleCard.ts.
 * SVG text is NOT used because system fonts (Georgia, Arial) are unavailable on the server.
 */

import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { storageGetSignedUrl } from "./storage";
import { updateTransformationCardUrl } from "./db";

// ESM-safe __dirname
const _thisDir = (() => {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return typeof __dirname !== "undefined" ? __dirname : process.cwd();
  }
})();

// Register fonts once
let _fontsRegistered = false;
function ensureFonts() {
  if (_fontsRegistered) return;
  const fontsDir = path.join(_thisDir, "fonts");
  GlobalFonts.registerFromPath(path.join(fontsDir, "LiberationSans-Regular.ttf"), "MeethaFont");
  GlobalFonts.registerFromPath(path.join(fontsDir, "LiberationSans-Bold.ttf"), "MeethaFont");
  _fontsRegistered = true;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type StyleBrief = {
  colorPalette: {
    swatches: string[]; // 4-5 hex colors
    description: string;
  };
  styleDirection: {
    description: string;
  };
  makeupEnergy: {
    description: string;
  };
  jewelryDirection: {
    description: string;
  };
  yourEnergy: {
    keywords: string[]; // 4 single words
    description: string;
  };
};

// ─── LLM Style Brief ─────────────────────────────────────────────────────────

export async function generateStyleBrief(params: {
  archetype: string;
  mood: string;
  aestheticDescriptors: string | null;
  niche: string | null;
  audience: string | null;
}): Promise<StyleBrief> {
  const archetypeLabels: Record<string, string> = {
    luxury_minimal: "Luxury Minimal",
    elegant_chaos: "Elegant Chaos",
    soft_power: "Soft Power",
    dark_feminine: "Dark Feminine",
    ethereal: "Ethereal",
  };
  const moodLabels: Record<string, string> = {
    soft: "Soft",
    magnetic: "Magnetic",
    grounded: "Grounded",
    untamed: "Untamed",
  };

  const archetypeLabel = archetypeLabels[params.archetype] ?? params.archetype;
  const moodLabel = moodLabels[params.mood] ?? params.mood;

  const systemPrompt = `You are a luxury personal stylist and brand strategist. You create precise, editorial style briefs for women who want to show up powerfully online. Your language is direct, specific, and elevated. No wellness clichés, no em dashes, no vague affirmations.`;

  const userPrompt = `Create a visual identity style brief for a woman with the following profile:
- Frequency State (Archetype): ${archetypeLabel}
- Energy State (Mood): ${moodLabel}
${params.aestheticDescriptors ? `- Aesthetic Notes: ${params.aestheticDescriptors}` : ""}
${params.niche ? `- Content Niche: ${params.niche}` : ""}
${params.audience ? `- Audience: ${params.audience}` : ""}

Return a JSON object with this exact structure:
{
  "colorPalette": {
    "swatches": ["#hex1", "#hex2", "#hex3", "#hex4"],
    "description": "2-3 sentences describing her color story. Specific, editorial."
  },
  "styleDirection": {
    "description": "2-3 sentences. Specific garment types, textures, silhouettes. No generic advice."
  },
  "makeupEnergy": {
    "description": "2-3 sentences. Specific techniques, finishes, signature elements."
  },
  "jewelryDirection": {
    "description": "2-3 sentences. Metal, weight, style, specific piece types."
  },
  "yourEnergy": {
    "keywords": ["WORD1", "WORD2", "WORD3", "WORD4"],
    "description": "1-2 sentences. Her presence, not her personality."
  }
}

Rules:
- Color swatches must be real hex codes that match her archetype (${archetypeLabel})
- All descriptions must be 2-3 short sentences max
- Energy keywords must be single uppercase words (e.g. CONFIDENT, REFINED, MAGNETIC)
- No em dashes, no ellipses, no wellness language
- Be specific and editorial, not generic`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "style_brief",
        strict: true,
        schema: {
          type: "object",
          properties: {
            colorPalette: {
              type: "object",
              properties: {
                swatches: { type: "array", items: { type: "string" } },
                description: { type: "string" },
              },
              required: ["swatches", "description"],
              additionalProperties: false,
            },
            styleDirection: {
              type: "object",
              properties: { description: { type: "string" } },
              required: ["description"],
              additionalProperties: false,
            },
            makeupEnergy: {
              type: "object",
              properties: { description: { type: "string" } },
              required: ["description"],
              additionalProperties: false,
            },
            jewelryDirection: {
              type: "object",
              properties: { description: { type: "string" } },
              required: ["description"],
              additionalProperties: false,
            },
            yourEnergy: {
              type: "object",
              properties: {
                keywords: { type: "array", items: { type: "string" } },
                description: { type: "string" },
              },
              required: ["keywords", "description"],
              additionalProperties: false,
            },
          },
          required: ["colorPalette", "styleDirection", "makeupEnergy", "jewelryDirection", "yourEnergy"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  return JSON.parse(typeof content === "string" ? content : JSON.stringify(content)) as StyleBrief;
}

// ─── Image Fetching ───────────────────────────────────────────────────────────

async function fetchImageBuffer(url: string): Promise<Buffer> {
  let fetchUrl = url;
  if (fetchUrl.startsWith("/manus-storage/")) {
    const key = fetchUrl.replace("/manus-storage/", "");
    fetchUrl = await storageGetSignedUrl(key);
  }
  const res = await fetch(fetchUrl);
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status} ${fetchUrl}`);
  return Buffer.from(await res.arrayBuffer());
}

// ─── Text Sanitization ──────────────────────────────────────────────────────

/**
 * Normalize AI-generated text to ASCII-safe characters that LiberationSans supports.
 * Replaces smart quotes, em dashes, ellipses, and other unicode punctuation.
 */
function sanitizeText(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")   // smart single quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')   // smart double quotes
    .replace(/[\u2013\u2014\u2015]/g, "-")          // en dash, em dash, horizontal bar
    .replace(/\u2026/g, "...")                       // ellipsis
    .replace(/[\u2022\u2023\u25E6\u2043]/g, "-")   // bullets
    .replace(/[\u00B7\u2027]/g, ".")                 // middle dot
    .replace(/[^\x00-\x7F]/g, (ch) => {             // remaining non-ASCII: try common replacements
      const map: Record<string, string> = {
        "\u00E9": "e", "\u00E8": "e", "\u00EA": "e", "\u00EB": "e",
        "\u00E0": "a", "\u00E1": "a", "\u00E2": "a", "\u00E4": "a",
        "\u00F6": "o", "\u00F3": "o", "\u00F4": "o",
        "\u00FC": "u", "\u00FA": "u", "\u00FB": "u",
        "\u00F1": "n", "\u00E7": "c",
      };
      return map[ch] ?? "";
    });
}

// ─── Canvas Text Helpers ──────────────────────────────────────────────────────

/** Parse a hex color string into {r,g,b,a} components (0-255) */
function hexToRgba(hex: string, alpha = 1): { r: number; g: number; b: number; a: number } {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return { r, g, b, a: Math.round(alpha * 255) };
}

/** Wrap text to fit within maxWidth pixels, returns array of lines */
function wrapTextCanvas(
  ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
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

// ─── Section Renderers ────────────────────────────────────────────────────────

/** Render the header band: dark bg + title + subtitle */
function renderHeader(cardW: number, headerH: number): Buffer {
  ensureFonts();
  const canvas = createCanvas(cardW, headerH);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#12080A";
  ctx.fillRect(0, 0, cardW, headerH);

  // Bottom separator line
  ctx.strokeStyle = "rgba(201,168,76,0.4)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(80, headerH - 8);
  ctx.lineTo(cardW - 80, headerH - 8);
  ctx.stroke();

  // Title
  const titleFontSize = Math.round(cardW * 0.028);
  ctx.font = `bold ${titleFontSize}px MeethaFont`;
  ctx.fillStyle = "#F5F0E8";
  ctx.textAlign = "center";
  ctx.fillText("YOUR VISUAL TRANSFORMATION", cardW / 2, Math.round(headerH * 0.44));

  // Subtitle
  const subFontSize = Math.round(cardW * 0.011);
  ctx.font = `${subFontSize}px MeethaFont`;
  ctx.fillStyle = "#C9A84C";
  ctx.globalAlpha = 0.9;
  ctx.fillText("PERSONALIZED. ELEVATED. AUTHENTICALLY YOU.", cardW / 2, Math.round(headerH * 0.73));
  ctx.globalAlpha = 1;

  return canvas.toBuffer("image/png") as Buffer;
}

/** Render BEFORE or AFTER label as a small cream rectangle with dark text */
function renderLabel(text: string, labelW: number, labelH: number): Buffer {
  ensureFonts();
  const canvas = createCanvas(labelW, labelH);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#F5F0E8";
  ctx.fillRect(0, 0, labelW, labelH);

  const fontSize = Math.round(labelH * 0.38);
  ctx.font = `bold ${fontSize}px MeethaFont`;
  ctx.fillStyle = "#1A1008";
  ctx.textAlign = "center";
  ctx.fillText(text, labelW / 2, Math.round(labelH * 0.68));

  return canvas.toBuffer("image/png") as Buffer;
}

/** Render the placeholder panel when no before photo is available */
function renderBeforePlaceholder(w: number, h: number): Buffer {
  ensureFonts();
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#1A1008";
  ctx.fillRect(0, 0, w, h);

  // Circle with + icon
  const cx = w / 2;
  const cy = h / 2;
  const r = 40;
  ctx.strokeStyle = "rgba(201,168,76,0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, cy - 20);
  ctx.lineTo(cx, cy + 20);
  ctx.moveTo(cx - 20, cy);
  ctx.lineTo(cx + 20, cy);
  ctx.stroke();

  const fontSize = Math.round(w * 0.022);
  ctx.font = `${fontSize}px MeethaFont`;
  ctx.fillStyle = "rgba(201,168,76,0.6)";
  ctx.textAlign = "center";
  ctx.fillText("YOUR PHOTO", cx, cy + r + 30);
  ctx.fillText("GOES HERE", cx, cy + r + 30 + fontSize * 1.4);

  return canvas.toBuffer("image/png") as Buffer;
}

/** Render the footer band with 5 columns of style brief data */
function renderFooter(cardW: number, footerH: number, brief: StyleBrief): Buffer {
  ensureFonts();
  const canvas = createCanvas(cardW, footerH);
  const ctx = canvas.getContext("2d");

  const GOLD = "#C9A84C";
  const CREAM = "#F5F0E8";
  const WARM_GREY = "#8A7F74";
  const COL_W = cardW / 5;
  const COL_PAD = Math.round(cardW * 0.016);
  const HEADER_FONT = Math.round(cardW * 0.009);
  const BODY_FONT = Math.round(cardW * 0.010);
  const LABEL_Y = Math.round(footerH * 0.10);
  const CONTENT_START_Y = Math.round(footerH * 0.18);

  // Background
  ctx.fillStyle = "#12080A";
  ctx.fillRect(0, 0, cardW, footerH);

  // Top separator
  ctx.strokeStyle = "rgba(201,168,76,0.3)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(80, 1);
  ctx.lineTo(cardW - 80, 1);
  ctx.stroke();

  // Column dividers
  ctx.strokeStyle = "rgba(201,168,76,0.15)";
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(COL_W * i, 20);
    ctx.lineTo(COL_W * i, footerH - 20);
    ctx.stroke();
  }

  // Helper: draw column header
  function drawColHeader(label: string, colIndex: number) {
    const cx = COL_W * colIndex + COL_W / 2;
    ctx.font = `bold ${HEADER_FONT}px MeethaFont`;
    ctx.fillStyle = CREAM;
    ctx.globalAlpha = 0.9;
    ctx.textAlign = "center";
    ctx.fillText(label, cx, LABEL_Y);
    ctx.globalAlpha = 1;
  }

  // Helper: draw wrapped body text centered in column
  function drawColBody(text: string, colIndex: number, startY: number, fill = WARM_GREY) {
    const cx = COL_W * colIndex + COL_W / 2;
    const maxW = COL_W - COL_PAD * 2;
    ctx.font = `${BODY_FONT}px MeethaFont`;
    ctx.fillStyle = fill;
    ctx.textAlign = "center";
    const lines = wrapTextCanvas(ctx, text, maxW);
    const lineH = BODY_FONT * 1.5;
    lines.slice(0, 6).forEach((line, i) => {
      ctx.fillText(line, cx, startY + i * lineH);
    });
  }

  // Sanitize all brief text to prevent tofu boxes from AI-generated unicode
  const sanitizedBrief = {
    colorPalette: {
      swatches: brief.colorPalette.swatches,
      description: sanitizeText(brief.colorPalette.description),
    },
    styleDirection: { description: sanitizeText(brief.styleDirection.description) },
    makeupEnergy: { description: sanitizeText(brief.makeupEnergy.description) },
    jewelryDirection: { description: sanitizeText(brief.jewelryDirection.description) },
    yourEnergy: {
      keywords: brief.yourEnergy.keywords.map(sanitizeText),
      description: sanitizeText(brief.yourEnergy.description),
    },
  };

  // ── Col 0: Color Palette ──
  drawColHeader("YOUR COLOR PALETTE", 0);
  const swatches = sanitizedBrief.colorPalette.swatches.slice(0, 5);
  const swatchR = Math.round(cardW * 0.013);
  const swatchSpacing = swatchR * 2 + 6;
  const swatchY = CONTENT_START_Y + swatchR + 4;
  const swatchStartX = COL_W * 0 + COL_W / 2 - ((swatches.length - 1) * swatchSpacing) / 2;
  swatches.forEach((hex, i) => {
    ctx.beginPath();
    ctx.arc(swatchStartX + i * swatchSpacing, swatchY, swatchR, 0, Math.PI * 2);
    ctx.fillStyle = hex;
    ctx.fill();
  });
  drawColBody(sanitizedBrief.colorPalette.description, 0, swatchY + swatchR + 16);

  // ── Col 1: Style Direction ──
  drawColHeader("STYLE DIRECTION", 1);
  drawColBody(sanitizedBrief.styleDirection.description, 1, CONTENT_START_Y);

  // ── Col 2: Makeup Energy ──
  drawColHeader("MAKEUP ENERGY", 2);
  drawColBody(sanitizedBrief.makeupEnergy.description, 2, CONTENT_START_Y);

  // ── Col 3: Jewelry Direction ──
  drawColHeader("JEWELRY DIRECTION", 3);
  drawColBody(sanitizedBrief.jewelryDirection.description, 3, CONTENT_START_Y);

  // ── Col 4: Your Energy ──
  drawColHeader("YOUR ENERGY", 4);
  const energyKeywords = sanitizedBrief.yourEnergy.keywords.slice(0, 4);
  const kwFontSize = Math.round(cardW * 0.011);
  const boxPad = COL_PAD;
  const boxX = COL_W * 4 + boxPad;
  const boxW = COL_W - boxPad * 2;
  const boxH = energyKeywords.length * (kwFontSize * 2) + 16;
  const boxY = CONTENT_START_Y - 4;

  // Energy box border
  ctx.strokeStyle = "rgba(201,168,76,0.4)";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(boxX, boxY, boxW, boxH);

  // Keywords
  ctx.font = `bold ${kwFontSize}px MeethaFont`;
  ctx.fillStyle = CREAM;
  ctx.textAlign = "center";
  const kwCx = COL_W * 4 + COL_W / 2;
  energyKeywords.forEach((kw, i) => {
    ctx.fillText(kw, kwCx, boxY + kwFontSize * 1.5 + i * kwFontSize * 2);
  });

  // Energy description below box
  drawColBody(sanitizedBrief.yourEnergy.description, 4, boxY + boxH + 14);

  // ── Bottom wordmark ──
  const wmFontSize = Math.round(cardW * 0.009);
  ctx.font = `${wmFontSize}px MeethaFont`;
  ctx.fillStyle = GOLD;
  ctx.globalAlpha = 0.5;
  ctx.textAlign = "center";
  ctx.fillText("styled by Meetha", cardW / 2, footerH - 12);
  ctx.globalAlpha = 1;

  return canvas.toBuffer("image/png") as Buffer;
}

// ─── Card Compositor ─────────────────────────────────────────────────────────

export async function buildTransformationCard(params: {
  beforeImageUrl: string | null;
  afterImageUrl: string;
  brief: StyleBrief;
}): Promise<Buffer> {
  const CARD_W = 1200;
  const HEADER_H = 120;
  const PHOTO_H = 700;
  const FOOTER_H = 340;
  const CARD_H = HEADER_H + PHOTO_H + FOOTER_H;

  const BG_DARK = { r: 18, g: 8, b: 10 };

  // ── 1. Header ──────────────────────────────────────────────────────────────
  const headerBuf = renderHeader(CARD_W, HEADER_H);

  // ── 2. Photo Panel ─────────────────────────────────────────────────────────
  const HALF_W = CARD_W / 2;
  const GAP = 4;
  const PHOTO_W = HALF_W - GAP / 2;

  // After image (always available)
  const afterBuf = await fetchImageBuffer(params.afterImageUrl);
  const afterResized = await sharp(afterBuf)
    .resize(PHOTO_W, PHOTO_H, { fit: "cover", position: "top" })
    .jpeg({ quality: 90 })
    .toBuffer();

  // Before image or placeholder
  let beforeResized: Buffer;
  if (params.beforeImageUrl) {
    const beforeBuf = await fetchImageBuffer(params.beforeImageUrl);
    beforeResized = await sharp(beforeBuf)
      .resize(PHOTO_W, PHOTO_H, { fit: "cover", position: "top" })
      .jpeg({ quality: 90 })
      .toBuffer();
  } else {
    const placeholderBuf = renderBeforePlaceholder(PHOTO_W, PHOTO_H);
    beforeResized = await sharp(placeholderBuf)
      .resize(PHOTO_W, PHOTO_H, { fit: "fill" })
      .jpeg({ quality: 90 })
      .toBuffer();
  }

  // BEFORE / AFTER labels
  const LABEL_W = 120;
  const LABEL_H = 36;
  const beforeLabelBuf = renderLabel("BEFORE", LABEL_W, LABEL_H);
  const afterLabelBuf = renderLabel("AFTER", LABEL_W, LABEL_H);

  const beforeWithLabel = await sharp(beforeResized)
    .composite([{ input: beforeLabelBuf, top: 20, left: 20 }])
    .jpeg({ quality: 90 })
    .toBuffer();
  const afterWithLabel = await sharp(afterResized)
    .composite([{ input: afterLabelBuf, top: 20, left: 20 }])
    .jpeg({ quality: 90 })
    .toBuffer();

  // Side-by-side photo panel
  const photoPanelBuf = await sharp({
    create: { width: CARD_W, height: PHOTO_H, channels: 3, background: BG_DARK },
  })
    .composite([
      { input: beforeWithLabel, top: 0, left: 0 },
      { input: afterWithLabel, top: 0, left: HALF_W + GAP / 2 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  // ── 3. Footer ──────────────────────────────────────────────────────────────
  const footerBuf = renderFooter(CARD_W, FOOTER_H, params.brief);

  // ── 4. Assemble full card ──────────────────────────────────────────────────
  const card = await sharp({
    create: { width: CARD_W, height: CARD_H, channels: 3, background: BG_DARK },
  })
    .composite([
      { input: headerBuf, top: 0, left: 0 },
      { input: photoPanelBuf, top: HEADER_H, left: 0 },
      { input: footerBuf, top: HEADER_H + PHOTO_H, left: 0 },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();

  return card;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function generateAndSaveTransformationCard(params: {
  userId: number;
  beforeImageUrl: string | null;
  afterImageUrl: string;
  archetype: string;
  mood: string;
  aestheticDescriptors: string | null;
  niche: string | null;
  audience: string | null;
}): Promise<string> {
  // 1. Generate style brief from LLM
  const brief = await generateStyleBrief({
    archetype: params.archetype,
    mood: params.mood,
    aestheticDescriptors: params.aestheticDescriptors,
    niche: params.niche,
    audience: params.audience,
  });

  // 2. Build the card image
  const cardBuffer = await buildTransformationCard({
    beforeImageUrl: params.beforeImageUrl,
    afterImageUrl: params.afterImageUrl,
    brief,
  });

  // 3. Upload to S3
  const key = `transformation-cards/user-${params.userId}-${Date.now()}.jpg`;
  const { url } = await storagePut(key, cardBuffer, "image/jpeg");

  // 4. Save URL to profile
  await updateTransformationCardUrl(params.userId, url);

  return url;
}
