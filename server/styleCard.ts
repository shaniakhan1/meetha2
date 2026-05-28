/**
 * Style Card Generator -- per-generation cream editorial portrait
 *
 * Produces a 1080x1350 (4:5 Instagram-optimized) JPEG:
 *   - Top ~61%: AI-generated styled image, edge-to-edge
 *   - Thin gold rule separator
 *   - Bottom ~39%: cream panel with "YOUR IDENTITY BRIEF" header
 *     and 5 rows: Palette / Metals / Makeup / Lighting / Presence
 *   - Footer: "meetha.studio" wordmark
 *
 * The 5-field brief is generated fresh by the LLM for each scene/archetype/mood.
 * Natural fibers only (no satin). No em dashes.
 */

import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { storageGetSignedUrl } from "./storage";

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

export type IdentityBrief = {
  palette: string;   // e.g. "Warm ivory, deep camel, amber gold. No cool tones."
  metals: string;    // e.g. "Warm yellow gold only. Stack it."
  makeup: string;    // e.g. "Bold lip, strong brow, minimal eye."
  lighting: string;  // e.g. "Late afternoon window, light source left or right."
  presence: string;  // e.g. "Your presence sharpens through contrast and restraint."
};

// ─── Scene / Archetype / Mood Labels ─────────────────────────────────────────

const SCENE_LABELS: Record<string, string> = {
  morning_ritual: "Morning Ritual",
  in_motion: "In Motion",
  soft_power_meeting: "Soft Power Meeting",
  golden_hour: "Golden Hour",
  night_out: "Night Out",
  travel_editorial: "Travel Editorial",
  home_sanctuary: "Home Sanctuary",
  paparazzi_flash: "Paparazzi Flash",
  digital_diary: "Digital Diary",
  bill_please: "Bill Please",
  silk_robe_room_service: "Silk Robe Room Service",
  irish_goodbye: "Irish Goodbye",
  cleopatra_principle: "Cleopatra Principle",
  silk_robe_retaliation: "Silk Robe Retaliation",
  motion_blur: "The Blur",
};

const ARCHETYPE_LABELS: Record<string, string> = {
  luxury_minimal: "Luxury Minimal",
  elegant_chaos: "Elegant Chaos",
  soft_power: "Soft Power",
  dark_feminine: "Dark Feminine",
  ethereal: "Ethereal",
};

const MOOD_LABELS: Record<string, string> = {
  soft: "Soft",
  magnetic: "Magnetic",
  grounded: "Grounded",
  untamed: "Untamed",
};

// ─── LLM Brief Generation ────────────────────────────────────────────────────

export async function generateIdentityBrief(params: {
  archetype: string;
  mood: string;
  sceneCategory?: string | null;
  aestheticDescriptors?: string | null;
  niche?: string | null;
}): Promise<IdentityBrief> {
  const archetypeLabel = ARCHETYPE_LABELS[params.archetype] ?? params.archetype;
  const moodLabel = MOOD_LABELS[params.mood] ?? params.mood;
  const sceneLabel = params.sceneCategory ? (SCENE_LABELS[params.sceneCategory] ?? params.sceneCategory) : null;

  const systemPrompt = `You are a luxury personal stylist writing a concise identity brief for a woman's shareable style card. Your language is direct, specific, and editorial. No wellness clichés, no em dashes, no satin (natural fibers only: silk, linen, cashmere, cotton, wool, leather, suede, denim). Each field is 1-2 short sentences maximum. Be specific and scene-appropriate, not generic.`;

  const userPrompt = `Write a 5-field identity brief for a style card with this context:
- Archetype: ${archetypeLabel}
- Energy: ${moodLabel}
${sceneLabel ? `- Scene: ${sceneLabel}` : ""}
${params.aestheticDescriptors ? `- Aesthetic: ${params.aestheticDescriptors}` : ""}
${params.niche ? `- Niche: ${params.niche}` : ""}

Return JSON with exactly these fields:
{
  "palette": "Color story in 1 sentence. Specific tones, no generic neutrals.",
  "metals": "Metal direction in 1 sentence. Specific weight and style.",
  "makeup": "Makeup direction in 1-2 sentences. Specific techniques and focal point.",
  "lighting": "Lighting direction in 1 sentence. Specific time of day and angle.",
  "presence": "Her presence in 1 sentence. What the camera feels, not her personality."
}

Rules:
- No satin. Natural fibers only if mentioning fabric: silk, linen, cashmere, cotton, wool, leather, suede, denim.
- No em dashes. Use commas or periods instead.
- Be scene-specific. A night-out brief must feel different from a morning ritual brief.
- No generic advice. Every sentence must be specific enough to act on.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "identity_brief",
        strict: true,
        schema: {
          type: "object",
          properties: {
            palette: { type: "string" },
            metals: { type: "string" },
            makeup: { type: "string" },
            lighting: { type: "string" },
            presence: { type: "string" },
          },
          required: ["palette", "metals", "makeup", "lighting", "presence"],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content)) as IdentityBrief;

  // Strip em dashes just in case LLM ignores the rule
  for (const key of Object.keys(parsed) as (keyof IdentityBrief)[]) {
    parsed[key] = parsed[key].replace(/\u2013|\u2014/g, ",");
  }

  return parsed;
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

// ─── Text Helpers ─────────────────────────────────────────────────────────────

function sanitizeText(text: string): string {
  return text
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, ",")
    .replace(/\u2026/g, "...")
    .replace(/[\u2022\u2023\u25E6\u2043]/g, "-")
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

type CanvasCtx = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

function wrapText(ctx: CanvasCtx, text: string, maxWidth: number): string[] {
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

// ─── Card Builder ─────────────────────────────────────────────────────────────

/**
 * Builds the cream editorial style card (1080x1350):
 *   - Top image panel (AI styled image, edge-to-edge, ~61%)
 *   - Thin gold rule
 *   - Cream brief panel: "YOUR IDENTITY BRIEF" + 5 rows (~39%)
 *   - Footer wordmark
 */
export async function buildStyleCard(params: {
  imageUrl: string;
  brief: IdentityBrief;
  /** Optional hook text to overlay on the image area */
  hook?: string | null;
}): Promise<Buffer> {
  ensureFonts();

  // ── Dimensions ──
  const CARD_W = 1080;
  const CARD_H = 1350;
  const IMAGE_H = 820;      // ~61% of card height
  const RULE_H = 2;
  const BRIEF_H = CARD_H - IMAGE_H - RULE_H;  // 528px

  // ── Colors ──
  const WARM_WHITE = "#FDFAF5";
  const GOLD = "#B8935A";
  const CHARCOAL_SOFT = "#5C4F45";
  const RULE_COLOR = "#D4B896";

  // ── Canvas ──
  const canvas = createCanvas(CARD_W, CARD_H);
  const ctx = canvas.getContext("2d");

  // Fill cream background
  ctx.fillStyle = WARM_WHITE;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // ════════════════════════════════════════════════════════════
  // SECTION 1: AI IMAGE (top, edge-to-edge)
  // ════════════════════════════════════════════════════════════
  {
    const rawBuf = await fetchImageBuffer(params.imageUrl);
    const imgBuf = await sharp(rawBuf)
      .resize(CARD_W, IMAGE_H, { fit: "cover", position: "top" })
      .jpeg({ quality: 92 })
      .toBuffer();
    const img = await loadImage(imgBuf);
    ctx.drawImage(img, 0, 0, CARD_W, IMAGE_H);

    // Subtle gradient at bottom of image to soften the cut
    const grad = ctx.createLinearGradient(0, IMAGE_H - 60, 0, IMAGE_H);
    grad.addColorStop(0, "rgba(253,250,245,0)");
    grad.addColorStop(1, "rgba(253,250,245,0.12)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, IMAGE_H - 60, CARD_W, 60);

    // Hook text overlay (bottom-center, above watermark)
    if (params.hook) {
      const hook = sanitizeText(params.hook);
      // Gradient scrim for legibility
      const hookScrim = ctx.createLinearGradient(0, IMAGE_H - 220, 0, IMAGE_H);
      hookScrim.addColorStop(0, "rgba(13,10,7,0)");
      hookScrim.addColorStop(1, "rgba(13,10,7,0.72)");
      ctx.fillStyle = hookScrim;
      ctx.fillRect(0, IMAGE_H - 220, CARD_W, 220);

      // Hook text — serif italic, centered, wrapping
      const HOOK_FONT_SIZE = 44;
      ctx.font = `italic ${HOOK_FONT_SIZE}px MeethaFont`;
      ctx.fillStyle = "rgba(253,250,245,0.96)";
      ctx.textAlign = "center";
      const hookLines = wrapText(ctx, hook, CARD_W - 120);
      const hookLineH = HOOK_FONT_SIZE * 1.35;
      const totalHookH = hookLines.length * hookLineH;
      let hookY = IMAGE_H - 60 - totalHookH + HOOK_FONT_SIZE;
      for (const line of hookLines.slice(0, 3)) {
        ctx.fillText(line, CARD_W / 2, hookY);
        hookY += hookLineH;
      }
    }

    // "styled by Meetha" watermark on image (bottom-right, subtle)
    ctx.font = `bold 20px MeethaFont`;
    ctx.fillStyle = "rgba(255,255,255,0.50)";
    ctx.textAlign = "right";
    ctx.fillText("styled by meetha.studio", CARD_W - 32, IMAGE_H - 24);
  }

  // ════════════════════════════════════════════════════════════
  // SECTION 2: GOLD RULE SEPARATOR
  // ════════════════════════════════════════════════════════════
  ctx.fillStyle = RULE_COLOR;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(0, IMAGE_H, CARD_W, RULE_H);
  ctx.globalAlpha = 1;

  // ════════════════════════════════════════════════════════════
  // SECTION 3: CREAM BRIEF PANEL
  // ════════════════════════════════════════════════════════════
  const PANEL_TOP = IMAGE_H + RULE_H;
  const PAD_X = 60;
  const PAD_Y = 34;
  const LABEL_COL_W = 118;
  const TEXT_COL_X = PAD_X + LABEL_COL_W;
  const TEXT_MAX_W = CARD_W - TEXT_COL_X - PAD_X;
  const ROW_GAP = 12;
  const LABEL_FONT_SIZE = 17;
  const VALUE_FONT_SIZE = 19;
  const LINE_H = VALUE_FONT_SIZE * 1.5;

  let y = PANEL_TOP + PAD_Y;

  // Header: "YOUR IDENTITY BRIEF"
  ctx.font = `bold 13px MeethaFont`;
  ctx.fillStyle = GOLD;
  ctx.globalAlpha = 0.85;
  ctx.textAlign = "left";
  ctx.fillText("YOUR IDENTITY BRIEF", PAD_X, y + 13);
  ctx.globalAlpha = 1;
  y += 13 + 20;

  // Thin gold rule under header
  ctx.strokeStyle = RULE_COLOR;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(PAD_X, y - 6);
  ctx.lineTo(CARD_W - PAD_X, y - 6);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Brief rows
  const rows: [string, string][] = [
    ["Palette", params.brief.palette],
    ["Metals", params.brief.metals],
    ["Makeup", params.brief.makeup],
    ["Lighting", params.brief.lighting],
    ["Presence", params.brief.presence],
  ];

  for (const [label, value] of rows) {
    const rowStartY = y;

    // Label (gold, bold)
    ctx.font = `bold ${LABEL_FONT_SIZE}px MeethaFont`;
    ctx.fillStyle = GOLD;
    ctx.globalAlpha = 0.72;
    ctx.textAlign = "left";
    ctx.fillText(sanitizeText(label), PAD_X, rowStartY + LABEL_FONT_SIZE);
    ctx.globalAlpha = 1;

    // Value (wrapped, charcoal soft)
    ctx.font = `${VALUE_FONT_SIZE}px MeethaFont`;
    ctx.fillStyle = CHARCOAL_SOFT;
    ctx.textAlign = "left";
    const lines = wrapText(ctx, sanitizeText(value), TEXT_MAX_W);
    lines.slice(0, 3).forEach((line, i) => {
      ctx.fillText(line, TEXT_COL_X, rowStartY + i * LINE_H + VALUE_FONT_SIZE);
    });

    const rowH = Math.max(LABEL_FONT_SIZE, lines.length * LINE_H);
    y += rowH + ROW_GAP;
  }

  // ════════════════════════════════════════════════════════════
  // SECTION 4: FOOTER WORDMARK
  // ════════════════════════════════════════════════════════════
  const FOOTER_Y = CARD_H - 26;

  ctx.strokeStyle = RULE_COLOR;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(PAD_X, FOOTER_Y - 14);
  ctx.lineTo(CARD_W - PAD_X, FOOTER_Y - 14);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.font = `bold 14px MeethaFont`;
  ctx.fillStyle = GOLD;
  ctx.globalAlpha = 0.45;
  ctx.textAlign = "center";
  ctx.fillText("meetha.studio", CARD_W / 2, FOOTER_Y);
  ctx.globalAlpha = 1;

  return canvas.toBuffer("image/jpeg", 92) as Buffer;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export async function generateAndSaveStyleCard(params: {
  generationId: number;
  userId: number;
  imageUrl: string;
  archetype: string;
  mood: string;
  sceneCategory?: string | null;
  aestheticDescriptors?: string | null;
  niche?: string | null;
  /** First hook from generation — used as overlay text on the card image */
  hook?: string | null;
}): Promise<{ cardUrl: string; cardKey: string }> {
  // 1. Generate scene-specific identity brief
  const brief = await generateIdentityBrief({
    archetype: params.archetype,
    mood: params.mood,
    sceneCategory: params.sceneCategory,
    aestheticDescriptors: params.aestheticDescriptors,
    niche: params.niche,
  });

  // 2. Build the card image
  const cardBuffer = await buildStyleCard({
    imageUrl: params.imageUrl,
    brief,
    hook: params.hook ?? null,
  });

  // 3. Upload to S3
  const key = `style-cards/user-${params.userId}-gen-${params.generationId}-${Date.now()}.jpg`;
  const { url } = await storagePut(key, cardBuffer, "image/jpeg");

  return { cardUrl: url, cardKey: key };
}
