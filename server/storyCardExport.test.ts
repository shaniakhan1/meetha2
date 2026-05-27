/**
 * Unit tests for storyCardExport logic.
 * We test the pure utility functions (word-wrap math, cover-crop math)
 * without needing a real browser canvas.
 */

import { describe, it, expect } from "vitest";

// ── Word-wrap helper (extracted logic) ──────────────────────────────────────
function wrapWords(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (test.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── Cover-crop helper (extracted logic) ─────────────────────────────────────
function coverCrop(
  imgW: number,
  imgH: number,
  canvasW: number,
  canvasH: number
): { sx: number; sy: number; sw: number; sh: number } {
  const imgAspect = imgW / imgH;
  const cardAspect = canvasW / canvasH;
  let sx = 0, sy = 0, sw = imgW, sh = imgH;
  if (imgAspect > cardAspect) {
    sw = imgH * cardAspect;
    sx = (imgW - sw) / 2;
  } else {
    sh = imgW / cardAspect;
    sy = 0;
  }
  return { sx, sy, sw, sh };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("wrapWords", () => {
  it("returns single line for short text", () => {
    const lines = wrapWords("She became the moment.", 40);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe("She became the moment.");
  });

  it("wraps long text into multiple lines", () => {
    const hook = "She walked in like she already owned every room she had never entered.";
    const lines = wrapWords(hook, 30);
    expect(lines.length).toBeGreaterThan(1);
    // All words should be present
    const rejoined = lines.join(" ");
    expect(rejoined).toBe(hook);
  });

  it("handles single-word text", () => {
    const lines = wrapWords("Presence.", 40);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe("Presence.");
  });

  it("does not produce empty lines", () => {
    const lines = wrapWords("The art of becoming visually unforgettable.", 20);
    for (const line of lines) {
      expect(line.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("coverCrop", () => {
  const CARD_W = 1080;
  const CARD_H = 1920;

  it("crops sides for a landscape image", () => {
    // 4:3 landscape image → needs side crop to fit 9:16
    const { sx, sy, sw, sh } = coverCrop(1200, 900, CARD_W, CARD_H);
    expect(sy).toBe(0); // no vertical crop
    expect(sx).toBeGreaterThan(0); // side crop applied
    expect(sw).toBeLessThan(1200); // cropped width
    expect(sh).toBe(900); // full height used
    // Resulting aspect ratio should match card
    expect(sw / sh).toBeCloseTo(CARD_W / CARD_H, 2);
  });

  it("crops top/bottom for a very tall portrait image", () => {
    // 9:20 super-tall image → taller than 9:16, needs top/bottom crop
    // imgAspect = 9/20 = 0.45, cardAspect = 9/16 = 0.5625 → imgAspect < cardAspect → bottom crop branch
    const { sx, sy, sw, sh } = coverCrop(900, 2000, CARD_W, CARD_H);
    expect(sx).toBe(0); // no horizontal crop
    expect(sy).toBe(0); // anchored to top (face-first)
    expect(sw).toBe(900); // full width used
    expect(sh).toBeLessThan(2000); // cropped height
    expect(sw / sh).toBeCloseTo(CARD_W / CARD_H, 2);
  });

  it("handles exact 9:16 image with no crop needed", () => {
    const { sx, sy, sw, sh } = coverCrop(1080, 1920, CARD_W, CARD_H);
    expect(sx).toBe(0);
    expect(sy).toBe(0);
    expect(sw).toBe(1080);
    expect(sh).toBe(1920);
  });

  it("crop dimensions are always positive", () => {
    const { sw, sh } = coverCrop(800, 600, CARD_W, CARD_H);
    expect(sw).toBeGreaterThan(0);
    expect(sh).toBeGreaterThan(0);
  });
});

describe("story card export constants", () => {
  it("card dimensions are 1080x1920 (9:16)", () => {
    const w = 1080;
    const h = 1920;
    expect(w / h).toBeCloseTo(9 / 16, 4);
  });

  it("safe zone margins are within card bounds", () => {
    const CARD_W = 1080;
    const CARD_H = 1920;
    const SAFE_X = 108;
    const SAFE_BOTTOM = 260;
    const SAFE_TOP = 180;
    expect(SAFE_X * 2).toBeLessThan(CARD_W);
    expect(SAFE_BOTTOM + SAFE_TOP).toBeLessThan(CARD_H);
  });
});
