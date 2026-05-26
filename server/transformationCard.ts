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
 * Font-free approach: all text rendered via SVG overlays (no system font dependency).
 */

import sharp from "sharp";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { storageGetSignedUrl } from "./storage";
import { updateTransformationCardUrl } from "./db";

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

// ─── SVG Text Helpers ─────────────────────────────────────────────────────────

function svgText(
  text: string,
  x: number,
  y: number,
  opts: {
    fontSize?: number;
    fill?: string;
    fontFamily?: string;
    fontWeight?: string;
    letterSpacing?: number;
    textAnchor?: string;
    opacity?: number;
  } = {}
): string {
  const {
    fontSize = 24,
    fill = "#F5F0E8",
    fontFamily = "Georgia, serif",
    fontWeight = "normal",
    letterSpacing = 0,
    textAnchor = "middle",
    opacity = 1,
  } = opts;
  return `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="${fontFamily}" font-weight="${fontWeight}" letter-spacing="${letterSpacing}" text-anchor="${textAnchor}" opacity="${opacity}">${text}</text>`;
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
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

  const BG_DARK = { r: 18, g: 12, b: 8 };
  const GOLD = "#C9A84C";
  const CREAM = "#F5F0E8";
  const WARM_GREY = "#8A7F74";

  // ── 1. Header SVG ──────────────────────────────────────────────────────────
  const headerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${HEADER_H}">
  <rect width="${CARD_W}" height="${HEADER_H}" fill="rgb(${BG_DARK.r},${BG_DARK.g},${BG_DARK.b})"/>
  <line x1="80" y1="${HEADER_H - 8}" x2="${CARD_W - 80}" y2="${HEADER_H - 8}" stroke="${GOLD}" stroke-width="0.5" opacity="0.4"/>
  ${svgText("YOUR VISUAL TRANSFORMATION", CARD_W / 2, 52, {
    fontSize: 34,
    fill: CREAM,
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontWeight: "bold",
    letterSpacing: 6,
  })}
  ${svgText("PERSONALIZED. ELEVATED. AUTHENTICALLY YOU.", CARD_W / 2, 88, {
    fontSize: 13,
    fill: GOLD,
    fontFamily: "Arial, sans-serif",
    letterSpacing: 3,
    opacity: 0.9,
  })}
</svg>`;

  const headerBuf = await sharp(Buffer.from(headerSvg))
    .resize(CARD_W, HEADER_H, { fit: "fill" })
    .png()
    .toBuffer();

  // ── 2. Photo Panel ─────────────────────────────────────────────────────────
  const HALF_W = CARD_W / 2;
  const GAP = 4;
  const PHOTO_W = HALF_W - GAP / 2;

  // Fetch after image (always available)
  const afterBuf = await fetchImageBuffer(params.afterImageUrl);
  const afterResized = await sharp(afterBuf)
    .resize(PHOTO_W, PHOTO_H, { fit: "cover", position: "top" })
    .jpeg({ quality: 90 })
    .toBuffer();

  // Fetch before image or create placeholder
  let beforeResized: Buffer;
  if (params.beforeImageUrl) {
    const beforeBuf = await fetchImageBuffer(params.beforeImageUrl);
    beforeResized = await sharp(beforeBuf)
      .resize(PHOTO_W, PHOTO_H, { fit: "cover", position: "top" })
      .jpeg({ quality: 90 })
      .toBuffer();
  } else {
    // Placeholder: dark panel with "Upload your before photo" text
    const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PHOTO_W}" height="${PHOTO_H}">
      <rect width="${PHOTO_W}" height="${PHOTO_H}" fill="#1A1008"/>
      <rect x="${PHOTO_W / 2 - 40}" y="${PHOTO_H / 2 - 40}" width="80" height="80" rx="40" fill="none" stroke="${GOLD}" stroke-width="1.5" opacity="0.5"/>
      <line x1="${PHOTO_W / 2}" y1="${PHOTO_H / 2 - 20}" x2="${PHOTO_W / 2}" y2="${PHOTO_H / 2 + 20}" stroke="${GOLD}" stroke-width="1.5" opacity="0.5"/>
      <line x1="${PHOTO_W / 2 - 20}" y1="${PHOTO_H / 2}" x2="${PHOTO_W / 2 + 20}" y2="${PHOTO_H / 2}" stroke="${GOLD}" stroke-width="1.5" opacity="0.5"/>
      ${svgText("YOUR PHOTO", PHOTO_W / 2, PHOTO_H / 2 + 70, { fontSize: 14, fill: GOLD, letterSpacing: 3, opacity: 0.6 })}
      ${svgText("GOES HERE", PHOTO_W / 2, PHOTO_H / 2 + 92, { fontSize: 14, fill: GOLD, letterSpacing: 3, opacity: 0.6 })}
    </svg>`;
    beforeResized = await sharp(Buffer.from(placeholderSvg))
      .resize(PHOTO_W, PHOTO_H, { fit: "fill" })
      .jpeg({ quality: 90 })
      .toBuffer();
  }

  // Label overlays
  const labelW = 120;
  const labelH = 36;
  const labelSvg = (text: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="${labelW}" height="${labelH}">
    <rect width="${labelW}" height="${labelH}" fill="#F5F0E8" rx="2"/>
    ${svgText(text, labelW / 2, 25, { fontSize: 14, fill: "#1A1008", fontFamily: "Arial, sans-serif", fontWeight: "bold", letterSpacing: 2 })}
  </svg>`;

  const beforeLabelBuf = await sharp(Buffer.from(labelSvg("BEFORE")))
    .resize(labelW, labelH, { fit: "fill" })
    .png()
    .toBuffer();
  const afterLabelBuf = await sharp(Buffer.from(labelSvg("AFTER")))
    .resize(labelW, labelH, { fit: "fill" })
    .png()
    .toBuffer();

  // Composite labels onto photos
  const beforeWithLabel = await sharp(beforeResized)
    .composite([{ input: beforeLabelBuf, top: 20, left: 20 }])
    .jpeg({ quality: 90 })
    .toBuffer();
  const afterWithLabel = await sharp(afterResized)
    .composite([{ input: afterLabelBuf, top: 20, left: 20 }])
    .jpeg({ quality: 90 })
    .toBuffer();

  // Combine side by side
  const photoPanelBuf = await sharp({
    create: { width: CARD_W, height: PHOTO_H, channels: 3, background: BG_DARK },
  })
    .composite([
      { input: beforeWithLabel, top: 0, left: 0 },
      { input: afterWithLabel, top: 0, left: HALF_W + GAP / 2 },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();

  // ── 3. Footer SVG ──────────────────────────────────────────────────────────
  const { brief } = params;
  const COL_W = CARD_W / 5;
  const COL_PAD = 20;
  const SWATCH_R = 16;
  const SWATCH_Y = 60;
  const LABEL_Y = 30;

  // Color swatches row
  const swatches = brief.colorPalette.swatches.slice(0, 5);
  const swatchSpacing = 44;
  const swatchStartX = COL_W / 2 - ((swatches.length - 1) * swatchSpacing) / 2;
  const swatchSvg = swatches
    .map(
      (hex, i) =>
        `<circle cx="${swatchStartX + i * swatchSpacing}" cy="${SWATCH_Y}" r="${SWATCH_R}" fill="${hex}"/>`
    )
    .join("");

  // Wrap description text for each column
  const MAX_CHARS = 22;
  const LINE_H = 18;

  function renderWrappedText(text: string, x: number, startY: number, fill = WARM_GREY): string {
    const lines = wrapText(text, MAX_CHARS);
    return lines
      .slice(0, 5)
      .map((line, i) =>
        svgText(line, x, startY + i * LINE_H, {
          fontSize: 12,
          fill,
          fontFamily: "Arial, sans-serif",
          textAnchor: "middle",
        })
      )
      .join("");
  }

  // Column 1: Color Palette
  const col1X = COL_W * 0 + COL_W / 2;
  // Column 2: Style Direction
  const col2X = COL_W * 1 + COL_W / 2;
  // Column 3: Makeup Energy
  const col3X = COL_W * 2 + COL_W / 2;
  // Column 4: Jewelry Direction
  const col4X = COL_W * 3 + COL_W / 2;
  // Column 5: Your Energy
  const col5X = COL_W * 4 + COL_W / 2;

  const energyKeywords = brief.yourEnergy.keywords.slice(0, 4);
  const energyBoxW = COL_W - COL_PAD * 2;
  const energyBoxH = energyKeywords.length * 26 + 16;
  const energyBoxX = COL_W * 4 + COL_PAD;
  const energyBoxY = SWATCH_Y - SWATCH_R;

  const footerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${FOOTER_H}">
  <rect width="${CARD_W}" height="${FOOTER_H}" fill="rgb(${BG_DARK.r},${BG_DARK.g},${BG_DARK.b})"/>
  <line x1="80" y1="1" x2="${CARD_W - 80}" y2="1" stroke="${GOLD}" stroke-width="0.5" opacity="0.3"/>

  <!-- Column dividers -->
  ${[1, 2, 3, 4]
    .map(
      (i) =>
        `<line x1="${COL_W * i}" y1="20" x2="${COL_W * i}" y2="${FOOTER_H - 20}" stroke="${GOLD}" stroke-width="0.5" opacity="0.15"/>`
    )
    .join("")}

  <!-- Column headers -->
  ${svgText("YOUR COLOR PALETTE", col1X, LABEL_Y, { fontSize: 10, fill: CREAM, fontFamily: "Arial, sans-serif", fontWeight: "bold", letterSpacing: 1.5, opacity: 0.9 })}
  ${svgText("STYLE DIRECTION", col2X, LABEL_Y, { fontSize: 10, fill: CREAM, fontFamily: "Arial, sans-serif", fontWeight: "bold", letterSpacing: 1.5, opacity: 0.9 })}
  ${svgText("MAKEUP ENERGY", col3X, LABEL_Y, { fontSize: 10, fill: CREAM, fontFamily: "Arial, sans-serif", fontWeight: "bold", letterSpacing: 1.5, opacity: 0.9 })}
  ${svgText("JEWELRY DIRECTION", col4X, LABEL_Y, { fontSize: 10, fill: CREAM, fontFamily: "Arial, sans-serif", fontWeight: "bold", letterSpacing: 1.5, opacity: 0.9 })}
  ${svgText("YOUR ENERGY", col5X, LABEL_Y, { fontSize: 10, fill: CREAM, fontFamily: "Arial, sans-serif", fontWeight: "bold", letterSpacing: 1.5, opacity: 0.9 })}

  <!-- Col 1: Color swatches -->
  ${swatchSvg.replace(/cx="/g, `cx="`).replace(/cy="/g, `cy="`)}
  ${renderWrappedText(brief.colorPalette.description, col1X, SWATCH_Y + SWATCH_R + 24)}

  <!-- Col 2: Style Direction -->
  ${renderWrappedText(brief.styleDirection.description, col2X, SWATCH_Y - 10)}

  <!-- Col 3: Makeup Energy -->
  ${renderWrappedText(brief.makeupEnergy.description, col3X, SWATCH_Y - 10)}

  <!-- Col 4: Jewelry Direction -->
  ${renderWrappedText(brief.jewelryDirection.description, col4X, SWATCH_Y - 10)}

  <!-- Col 5: Your Energy box + keywords -->
  <rect x="${energyBoxX}" y="${energyBoxY}" width="${energyBoxW}" height="${energyBoxH}" fill="none" stroke="${GOLD}" stroke-width="0.8" opacity="0.4" rx="2"/>
  ${energyKeywords
    .map((kw, i) =>
      svgText(kw, col5X, energyBoxY + 26 + i * 26, {
        fontSize: 13,
        fill: CREAM,
        fontFamily: "Arial, sans-serif",
        fontWeight: "bold",
        letterSpacing: 2,
      })
    )
    .join("")}
  ${renderWrappedText(brief.yourEnergy.description, col5X, energyBoxY + energyBoxH + 24)}

  <!-- Bottom Meetha wordmark -->
  ${svgText("MEETHA", CARD_W / 2, FOOTER_H - 16, {
    fontSize: 11,
    fill: GOLD,
    fontFamily: "Georgia, serif",
    letterSpacing: 8,
    opacity: 0.5,
  })}
</svg>`;

  const footerBuf = await sharp(Buffer.from(footerSvg))
    .resize(CARD_W, FOOTER_H, { fit: "fill" })
    .png()
    .toBuffer();

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
