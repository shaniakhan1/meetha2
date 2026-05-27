/**
 * Visual Transformation Card Generator
 *
 * Generates a shareable "Your Visual Transformation" card (1080×1350, 4:5 ratio):
 * - Header: "YOUR VISUAL TRANSFORMATION" title + subtitle (dark bg, gold accent)
 * - Main: BEFORE photo (left) + AFTER photo (right) side by side with cream/gold labels
 * - Brief: 2×2 grid — Color Palette (swatches), Style Direction, Makeup Energy, Your Energy
 * - Footer: "styled by Meetha · meetha.studio" wordmark
 *
 * Font approach: uses @napi-rs/canvas with GlobalFonts.registerFromPath() — same as styleCard.ts.
 * SVG text is NOT used because system fonts (Georgia, Arial) are unavailable on the server.
 */

import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
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
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2022\u2023\u25E6\u2043]/g, "-")
    .replace(/[\u00B7\u2027]/g, ".")
    .replace(/[^\x00-\x7F]/g, (ch) => {
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

// ─── Main Card Builder ────────────────────────────────────────────────────────

/**
 * Builds a dark transformation card (1080×1350):
 * - Header band: "YOUR VISUAL TRANSFORMATION" + subtitle
 * - Photo section: BEFORE (left) + AFTER (right) side by side
 * - Brief section: 2×2 grid — Color Palette, Style Direction, Makeup Energy, Your Energy
 * - Footer: "styled by Meetha" wordmark
 */
export async function buildTransformationCard(params: {
  beforeImageUrl: string | null;
  afterImageUrl: string;
  brief: StyleBrief;
}): Promise<Buffer> {
  ensureFonts();

  // ── Card dimensions ──
  const CARD_W = 1080;
  const HEADER_H = 100;
  const PHOTO_H = 580;
  const BRIEF_H = 620;
  const FOOTER_H = 50;
  const CARD_H = HEADER_H + PHOTO_H + BRIEF_H + FOOTER_H;

  // ── Colors ──
  const BG = "#12080A";
  const GOLD = "#C9A84C";
  const CREAM = "#F5F0E8";
  const WARM_GREY = "#8A7F74";

  // ── Create main canvas ──
  const canvas = createCanvas(CARD_W, CARD_H);
  const ctx = canvas.getContext("2d");

  // Fill dark background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // ════════════════════════════════════════════════════════════
  // SECTION 1: HEADER
  // ════════════════════════════════════════════════════════════
  {
    const cx = CARD_W / 2;
    const headerMid = HEADER_H / 2;

    // Thin gold top rule
    ctx.strokeStyle = GOLD;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(60, 14);
    ctx.lineTo(CARD_W - 60, 14);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Title
    ctx.font = `bold 26px MeethaFont`;
    ctx.fillStyle = CREAM;
    ctx.textAlign = "center";
    ctx.fillText("YOUR VISUAL TRANSFORMATION", cx, headerMid + 4);

    // Subtitle
    ctx.font = `11px MeethaFont`;
    ctx.fillStyle = GOLD;
    ctx.globalAlpha = 0.8;
    ctx.fillText("PERSONALIZED  \u00B7  ELEVATED  \u00B7  AUTHENTICALLY YOU", cx, headerMid + 24);
    ctx.globalAlpha = 1;

    // Bottom rule
    ctx.strokeStyle = GOLD;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(60, HEADER_H - 6);
    ctx.lineTo(CARD_W - 60, HEADER_H - 6);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // ════════════════════════════════════════════════════════════
  // SECTION 2: BEFORE / AFTER PHOTOS
  // ════════════════════════════════════════════════════════════
  const PHOTO_TOP = HEADER_H;
  const PHOTO_GAP = 4;
  const EACH_PHOTO_W = Math.floor((CARD_W - PHOTO_GAP) / 2);

  // BEFORE photo (left)
  {
    let beforeBuf: Buffer;
    if (params.beforeImageUrl) {
      const raw = await fetchImageBuffer(params.beforeImageUrl);
      beforeBuf = await sharp(raw)
        .resize(EACH_PHOTO_W, PHOTO_H, { fit: "cover", position: "top" })
        .jpeg({ quality: 88 })
        .toBuffer();
    } else {
      // Placeholder canvas
      const ph = createCanvas(EACH_PHOTO_W, PHOTO_H);
      const phCtx = ph.getContext("2d");
      phCtx.fillStyle = "#1E1008";
      phCtx.fillRect(0, 0, EACH_PHOTO_W, PHOTO_H);
      const cx = EACH_PHOTO_W / 2;
      const cy = PHOTO_H / 2;
      phCtx.strokeStyle = "rgba(201,168,76,0.4)";
      phCtx.lineWidth = 1.5;
      phCtx.beginPath();
      phCtx.arc(cx, cy, 44, 0, Math.PI * 2);
      phCtx.stroke();
      phCtx.beginPath();
      phCtx.moveTo(cx, cy - 22); phCtx.lineTo(cx, cy + 22);
      phCtx.moveTo(cx - 22, cy); phCtx.lineTo(cx + 22, cy);
      phCtx.stroke();
      phCtx.font = `bold 14px MeethaFont`;
      phCtx.fillStyle = "rgba(201,168,76,0.55)";
      phCtx.textAlign = "center";
      phCtx.fillText("YOUR PHOTO", cx, cy + 68);
      phCtx.fillText("GOES HERE", cx, cy + 88);
      beforeBuf = ph.toBuffer("image/png") as Buffer;
    }
    const beforeImg = await loadImage(beforeBuf);
    ctx.drawImage(beforeImg, 0, PHOTO_TOP, EACH_PHOTO_W, PHOTO_H);
  }

  // AFTER photo (right)
  {
    const afterRaw = await fetchImageBuffer(params.afterImageUrl);
    const afterBuf = await sharp(afterRaw)
      .resize(EACH_PHOTO_W, PHOTO_H, { fit: "cover", position: "top" })
      .jpeg({ quality: 88 })
      .toBuffer();
    const afterImg = await loadImage(afterBuf);
    ctx.drawImage(afterImg, EACH_PHOTO_W + PHOTO_GAP, PHOTO_TOP, EACH_PHOTO_W, PHOTO_H);
  }

  // BEFORE / AFTER labels (pill at bottom of each photo)
  const LABEL_W = 90;
  const LABEL_H = 26;
  const LABEL_Y = PHOTO_TOP + PHOTO_H - LABEL_H - 14;
  const LABEL_PAD_X = 14;
  const LABEL_FONT = 11;
  const LABEL_RADIUS = 4;

  // BEFORE label — cream bg
  ctx.fillStyle = CREAM;
  ctx.globalAlpha = 0.92;
  ctx.beginPath();
  ctx.roundRect(LABEL_PAD_X, LABEL_Y, LABEL_W, LABEL_H, LABEL_RADIUS);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.font = `bold ${LABEL_FONT}px MeethaFont`;
  ctx.fillStyle = BG;
  ctx.textAlign = "center";
  ctx.fillText("BEFORE", LABEL_PAD_X + LABEL_W / 2, LABEL_Y + LABEL_H * 0.68);

  // AFTER label — gold bg
  const afterLabelX = EACH_PHOTO_W + PHOTO_GAP + LABEL_PAD_X;
  ctx.fillStyle = GOLD;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.roundRect(afterLabelX, LABEL_Y, LABEL_W, LABEL_H, LABEL_RADIUS);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.font = `bold ${LABEL_FONT}px MeethaFont`;
  ctx.fillStyle = BG;
  ctx.textAlign = "center";
  ctx.fillText("AFTER", afterLabelX + LABEL_W / 2, LABEL_Y + LABEL_H * 0.68);

  // ════════════════════════════════════════════════════════════
  // SECTION 3: 2×2 BRIEF GRID
  // ════════════════════════════════════════════════════════════
  const BRIEF_TOP = HEADER_H + PHOTO_H;
  const CELL_W = Math.floor(CARD_W / 2);
  const CELL_H = Math.floor(BRIEF_H / 2);
  const CELL_PAD = 28;
  const CELL_HEADER_FONT = 10;
  const CELL_BODY_FONT = 13;
  const CELL_LINE_H = CELL_BODY_FONT * 1.65;

  // Top rule above brief section
  ctx.strokeStyle = GOLD;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(40, BRIEF_TOP + 1);
  ctx.lineTo(CARD_W - 40, BRIEF_TOP + 1);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Grid dividers
  ctx.strokeStyle = "rgba(201,168,76,0.2)";
  ctx.lineWidth = 0.8;
  // Vertical center divider
  ctx.beginPath();
  ctx.moveTo(CELL_W, BRIEF_TOP + 20);
  ctx.lineTo(CELL_W, BRIEF_TOP + BRIEF_H - 20);
  ctx.stroke();
  // Horizontal center divider
  ctx.beginPath();
  ctx.moveTo(40, BRIEF_TOP + CELL_H);
  ctx.lineTo(CARD_W - 40, BRIEF_TOP + CELL_H);
  ctx.stroke();

  // Helper: draw a brief cell
  function drawBriefCell(
    col: 0 | 1,
    row: 0 | 1,
    label: string,
    content: string,
    swatches?: string[]
  ) {
    const cellX = col * CELL_W;
    const cellY = BRIEF_TOP + row * CELL_H;
    const textX = cellX + CELL_PAD;
    const maxW = CELL_W - CELL_PAD * 2;
    let y = cellY + CELL_PAD;

    // Label
    ctx.font = `bold ${CELL_HEADER_FONT}px MeethaFont`;
    ctx.fillStyle = GOLD;
    ctx.globalAlpha = 0.85;
    ctx.textAlign = "left";
    ctx.fillText(label, textX, y);
    ctx.globalAlpha = 1;
    y += CELL_HEADER_FONT + 10;

    // Color swatches (for palette cell)
    if (swatches && swatches.length > 0) {
      const swatchR = 9;
      const swatchSpacing = swatchR * 2 + 5;
      swatches.slice(0, 5).forEach((hex, i) => {
        ctx.beginPath();
        ctx.arc(textX + swatchR + i * swatchSpacing, y + swatchR, swatchR, 0, Math.PI * 2);
        ctx.fillStyle = hex;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });
      y += swatchR * 2 + 12;
    }

    // Body text
    ctx.font = `${CELL_BODY_FONT}px MeethaFont`;
    ctx.fillStyle = WARM_GREY;
    ctx.textAlign = "left";
    const lines = wrapTextCanvas(ctx, sanitizeText(content), maxW);
    lines.slice(0, 7).forEach((line, i) => {
      ctx.fillText(line, textX, y + i * CELL_LINE_H);
    });
  }

  // Cell (0,0) — Color Palette (top-left)
  drawBriefCell(0, 0, "COLOR PALETTE", params.brief.colorPalette.description, params.brief.colorPalette.swatches);

  // Cell (1,0) — Style Direction (top-right)
  drawBriefCell(1, 0, "STYLE DIRECTION", params.brief.styleDirection.description);

  // Cell (0,1) — Makeup Energy (bottom-left)
  drawBriefCell(0, 1, "MAKEUP ENERGY", params.brief.makeupEnergy.description);

  // Cell (1,1) — Your Energy (bottom-right) — keywords + description
  const energyKeywords = params.brief.yourEnergy.keywords.slice(0, 4);
  const energyContent = energyKeywords.join("  \u00B7  ") + "  " + params.brief.yourEnergy.description;
  drawBriefCell(1, 1, "YOUR ENERGY", energyContent);

  // ════════════════════════════════════════════════════════════
  // SECTION 4: FOOTER WORDMARK
  // ════════════════════════════════════════════════════════════
  const FOOTER_TOP = HEADER_H + PHOTO_H + BRIEF_H;

  ctx.strokeStyle = GOLD;
  ctx.globalAlpha = 0.2;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(60, FOOTER_TOP + 8);
  ctx.lineTo(CARD_W - 60, FOOTER_TOP + 8);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.font = `11px MeethaFont`;
  ctx.fillStyle = GOLD;
  ctx.globalAlpha = 0.45;
  ctx.textAlign = "center";
  ctx.fillText("styled by Meetha  \u00B7  meetha.studio", CARD_W / 2, FOOTER_TOP + 34);
  ctx.globalAlpha = 1;

  // ── Export as JPEG ──
  return canvas.toBuffer("image/jpeg", 92) as Buffer;
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
