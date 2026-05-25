/**
 * Image generation using Fal.ai FLUX 1.1 Pro Ultra
 * Produces cinematic, editorial-quality lifestyle images.
 * Text-to-image only — no face generation, no subject anchoring.
 */
import { fal } from "@fal-ai/client";
import { ENV } from "./env";
import { storagePut } from "../storage";

export type FalImageOptions = {
  prompt: string;
  imageSize?:
    | "portrait_4_3"
    | "portrait_16_9"
    | "square_hd"
    | "landscape_16_9"
    | "landscape_4_3";
};

export type FalImageResponse = {
  url: string;
  key: string;
};

async function saveToStorage(falImageUrl: string): Promise<{ url: string; key: string }> {
  const imageResponse = await fetch(falImageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch generated image from Fal.ai: ${imageResponse.status}`);
  }
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  return storagePut(`generated/${Date.now()}.jpg`, imageBuffer, "image/jpeg");
}

export async function generateImageFal(options: FalImageOptions): Promise<FalImageResponse> {
  if (!ENV.falApiKey) {
    throw new Error("FAL_API_KEY is not configured");
  }

  fal.config({ credentials: ENV.falApiKey });

  // FLUX Ultra uses aspect_ratio strings, not image_size enum
  const SIZE_TO_ASPECT: Record<string, string> = {
    portrait_4_3: "3:4",
    portrait_16_9: "9:16",
    square_hd: "1:1",
    landscape_16_9: "16:9",
    landscape_4_3: "4:3",
  };
  const aspectRatio = SIZE_TO_ASPECT[options.imageSize ?? "portrait_4_3"] ?? "3:4";

  // FLUX Pro 1.1 Ultra — best photorealism available via Fal.ai
  const result = (await fal.subscribe("fal-ai/flux-pro/v1.1-ultra", {
    input: {
      prompt: options.prompt,
      aspect_ratio: aspectRatio,
      num_images: 1,
      safety_tolerance: "2" as const,
      output_format: "jpeg" as const,
    },
  })) as unknown as {
    data: { images: Array<{ url: string; content_type: string }> };
    requestId: string;
  };

  const falImageUrl = result.data?.images?.[0]?.url;
  if (!falImageUrl) {
    throw new Error("Fal.ai returned no image URL");
  }

  return saveToStorage(falImageUrl);
}
