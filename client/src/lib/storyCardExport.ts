/**
 * storyCardExport.ts
 *
 * Renders a 1080×1920 Instagram Story card from scratch on an off-screen canvas.
 * This avoids all DOM-capture pitfalls (CORS, backdrop-filter, cross-origin fonts,
 * responsive sizing drift) by drawing every element imperatively.
 *
 * Layout (top → bottom):
 *   - Full-bleed image fills the entire 1080×1920 canvas
 *   - Bottom gradient scrim (55% height, black → transparent)
 *   - Top gradient scrim (20% height, black → transparent)
 *   - Film grain SVG texture overlay
 *   - Hook text (serif, centred, bottom-safe zone)
 *   - "MEETHA" wordmark (bottom edge, safe zone)
 *   - Story safe margins: 135px left/right, 240px top/bottom (Instagram UI safe area)
 */

const CARD_W = 1080;
const CARD_H = 1920;

// Instagram Story safe zone (UI chrome avoidance)
const SAFE_X = 108; // ~10% horizontal
const SAFE_BOTTOM = 260;
const SAFE_TOP = 180;

/** Load an image cross-origin into an HTMLImageElement */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without crossOrigin for same-origin assets
      const img2 = new Image();
      img2.onload = () => resolve(img2);
      img2.onerror = reject;
      img2.src = src;
    };
    img.src = src;
  });
}

/** Draw SVG film grain texture onto the canvas */
function drawFilmGrain(ctx: CanvasRenderingContext2D) {
  // Tile a subtle noise pattern
  const tileSize = 256;
  const offscreen = document.createElement("canvas");
  offscreen.width = tileSize;
  offscreen.height = tileSize;
  const octx = offscreen.getContext("2d")!;

  // Procedural grain: random semi-transparent pixels
  const imageData = octx.createImageData(tileSize, tileSize);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.random() > 0.5 ? 255 : 0;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = Math.floor(Math.random() * 18); // very subtle, max ~7% opacity
  }
  octx.putImageData(imageData, 0, 0);

  const pattern = ctx.createPattern(offscreen, "repeat");
  if (pattern) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.restore();
  }
}

/** Draw the hook text with automatic line-wrapping */
function drawHookText(ctx: CanvasRenderingContext2D, hook: string) {
  const maxWidth = CARD_W - SAFE_X * 2;
  const fontSize = 72; // ~equivalent to 1.5rem at 1080px
  const lineHeight = fontSize * 1.35;

  ctx.save();
  ctx.font = `300 ${fontSize}px 'Cormorant Garamond', 'Georgia', serif`;
  ctx.fillStyle = "rgba(255,255,255,0.97)";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 2;

  // Word-wrap
  const words = hook.split(" ");
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

  // Draw from bottom up
  const totalH = lines.length * lineHeight;
  const baseY = CARD_H - SAFE_BOTTOM - 60; // 60px above wordmark

  lines.forEach((line, i) => {
    const y = baseY - totalH + (i + 1) * lineHeight;
    ctx.fillText(line, CARD_W / 2, y);
  });

  ctx.restore();
}

/** Draw the MEETHA wordmark */
function drawWordmark(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.font = `400 28px 'Inter', 'Helvetica Neue', sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.letterSpacing = "0.25em"; // canvas doesn't support this natively — use spacing trick
  ctx.fillText("M  E  E  T  H  A", CARD_W / 2, CARD_H - SAFE_BOTTOM + 20);
  ctx.restore();
}

export interface StoryCardOptions {
  imageUrl: string;
  hook: string | null;
}

/**
 * Renders a 1080×1920 Story card and returns a PNG Blob.
 * Throws if the image cannot be loaded.
 */
export async function renderStoryCard(options: StoryCardOptions): Promise<Blob> {
  const { imageUrl, hook } = options;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d")!;

  // 1. Load image
  const img = await loadImage(imageUrl);

  // 2. Draw image cover-fit (object-fit: cover equivalent)
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const cardAspect = CARD_W / CARD_H;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (imgAspect > cardAspect) {
    // Image is wider — crop sides
    sw = img.naturalHeight * cardAspect;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    // Image is taller — crop top/bottom (favour top — face is usually upper third)
    sh = img.naturalWidth / cardAspect;
    sy = 0; // anchor to top
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, CARD_W, CARD_H);

  // 3. Top gradient scrim
  const topGrad = ctx.createLinearGradient(0, 0, 0, CARD_H * 0.22);
  topGrad.addColorStop(0, "rgba(0,0,0,0.30)");
  topGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, CARD_W, CARD_H * 0.22);

  // 4. Bottom gradient scrim (heavier — text legibility)
  const btmGrad = ctx.createLinearGradient(0, CARD_H * 0.42, 0, CARD_H);
  btmGrad.addColorStop(0, "rgba(0,0,0,0)");
  btmGrad.addColorStop(0.5, "rgba(0,0,0,0.45)");
  btmGrad.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = btmGrad;
  ctx.fillRect(0, CARD_H * 0.42, CARD_W, CARD_H * 0.58);

  // 5. Film grain
  drawFilmGrain(ctx);

  // 6. Hook text
  if (hook) {
    drawHookText(ctx, hook);
  }

  // 7. Wordmark
  drawWordmark(ctx);

  // 8. Export PNG blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob returned null"));
      },
      "image/png",
      1.0
    );
  });
}

/** Share the story card via Web Share API (mobile). Falls back to download. */
export async function shareStoryCard(
  options: StoryCardOptions,
  generationId: number
): Promise<"shared" | "downloaded" | "error"> {
  try {
    const blob = await renderStoryCard(options);
    const file = new File([blob], `meetha-story-${generationId}.png`, { type: "image/png" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "Meetha",
        text: options.hook ?? "Styled by Meetha.",
      });
      return "shared";
    }

    // Fallback: download
    downloadBlob(blob, `meetha-story-${generationId}.png`);
    return "downloaded";
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") return "shared"; // user dismissed sheet
    console.error("[storyCardExport] share failed", e);
    return "error";
  }
}

/** Download the story card as PNG */
export async function downloadStoryCard(
  options: StoryCardOptions,
  generationId: number
): Promise<void> {
  const blob = await renderStoryCard(options);
  downloadBlob(blob, `meetha-story-${generationId}.png`);
}

/** Download the raw generation image */
export async function downloadRawImage(
  imageUrl: string,
  generationId: number
): Promise<void> {
  const response = await fetch(imageUrl, { credentials: "include" });
  if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);
  const blob = await response.blob();
  const ext = blob.type.includes("png") ? "png" : "jpg";
  downloadBlob(blob, `meetha-${generationId}.${ext}`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
