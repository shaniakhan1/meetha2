import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";

function buildWatermarkSvg(width, height) {
  const fontSize = Math.max(52, Math.round(width * 0.09));
  const cx = Math.round(width / 2);
  const cy = Math.round(height / 2);

  const letters = "MEETHA".split("");
  const charWidth = Math.round(fontSize * 0.65);
  const totalWidth = charWidth * letters.length;
  const startX = cx - Math.round(totalWidth / 2);
  const tspans = letters.map((ch, i) =>
    `<tspan x="${startX + i * charWidth}" dy="0">${ch}</tspan>`
  ).join("");

  const rowOffsets = [-fontSize * 2.2, 0, fontSize * 2.2];

  const textElements = rowOffsets.map((dy) => {
    const y = cy + dy;
    return `<text y="${Math.round(y)}"
      text-anchor="start"
      dominant-baseline="middle"
      transform="rotate(-28, ${cx}, ${Math.round(y)})"
      font-family="serif"
      font-size="${fontSize}px"
      font-weight="bold"
      fill="white"
      fill-opacity="0.40">${tspans}</text>`;
  }).join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    ${textElements}
  </svg>`;

  return Buffer.from(svg);
}

const imageBuffer = readFileSync("/home/ubuntu/upload/meetha-22.jpg");
const image = sharp(imageBuffer);
const metadata = await image.metadata();
const imgWidth = metadata.width ?? 1080;
const imgHeight = metadata.height ?? 1920;

console.log(`Image size: ${imgWidth}x${imgHeight}`);

const watermarkSvg = buildWatermarkSvg(imgWidth, imgHeight);

const result = await image
  .composite([{ input: watermarkSvg, top: 0, left: 0 }])
  .jpeg({ quality: 92 })
  .toBuffer();

writeFileSync("/home/ubuntu/meetha/scripts/watermark-test-output.jpg", result);
console.log("Watermark test output saved to scripts/watermark-test-output.jpg");
