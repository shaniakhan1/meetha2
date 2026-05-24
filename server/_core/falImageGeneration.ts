/**
 * Image generation using Fal.ai FLUX 1.1 Pro
 * Produces cinematic, editorial-quality lifestyle images.
 * No faces, no bodies — prompt recipes enforce this.
 */
import { fal } from "@fal-ai/client";
import { ENV } from "./env";
import { storagePut } from "../storage";

export type FalImageOptions = {
  prompt: string;
};

export type FalImageResponse = {
  url: string;
  key: string;
};

export async function generateImageFal(options: FalImageOptions): Promise<FalImageResponse> {
  if (!ENV.falApiKey) {
    throw new Error("FAL_API_KEY is not configured");
  }

  // Configure fal client with API key
  fal.config({ credentials: ENV.falApiKey });

  const result = await fal.subscribe("fal-ai/flux-pro/v1.1", {
    input: {
      prompt: options.prompt,
      image_size: "portrait_4_3" as const,
      num_images: 1,
      safety_tolerance: "2" as const,
      output_format: "jpeg" as const,
    },
  }) as unknown as {
    images: Array<{ url: string; content_type: string }>;
  };

  const imageUrl = result.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error("Fal.ai returned no image URL");
  }

  // Fetch the image and save to storage
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch generated image from Fal.ai: ${imageResponse.status}`);
  }
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const { key, url } = await storagePut(
    `generated/${Date.now()}.jpg`,
    imageBuffer,
    "image/jpeg"
  );

  return { url, key };
}
