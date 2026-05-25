/**
 * Image generation using Fal.ai FLUX 1.1 Pro
 * Produces cinematic, editorial-quality lifestyle images.
 *
 * Two modes:
 * - Text-to-image (default): fal-ai/flux-pro/v1.1
 * - Subject-anchored (with referenceImageUrl): fal-ai/flux-pro/v1.1/redux
 *   Redux uses the reference photo to anchor the subject's visual identity
 *   (skin tone, features, presence) while generating a new scene from the prompt.
 */
import { fal } from "@fal-ai/client";
import { ENV } from "./env";
import { storagePut } from "../storage";

export type FalImageOptions = {
  prompt: string;
  imageSize?: "portrait_4_3" | "portrait_16_9" | "square_hd" | "landscape_16_9" | "landscape_4_3";
  /**
   * Optional reference image URL (must be a full public https:// URL).
   * When provided, uses flux-pro/v1.1/redux to anchor the subject to the
   * reference photo while generating the new scene from the prompt.
   */
  referenceImageUrl?: string;
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

  const imageSize = (options.imageSize ?? "portrait_4_3") as
    | "portrait_4_3"
    | "portrait_16_9"
    | "square_hd"
    | "landscape_16_9"
    | "landscape_4_3";

  let falImageUrl: string;

  if (options.referenceImageUrl) {
    // ── Subject-anchored mode: flux-pro/v1.1/redux ──────────────────────────
    // Redux takes an input image and generates a new image that preserves the
    // subject's visual identity while applying the prompt as the new scene.
    const reduxResult = await fal.subscribe("fal-ai/flux-pro/v1.1/redux", {
      input: {
        prompt: options.prompt,
        image_url: options.referenceImageUrl,
        image_size: imageSize,
        num_images: 1,
        safety_tolerance: "2" as const,
        output_format: "jpeg" as const,
      },
    }) as unknown as {
      data: { images: Array<{ url: string; content_type: string }> };
      requestId: string;
    };

    falImageUrl = reduxResult.data?.images?.[0]?.url;
    if (!falImageUrl) {
      throw new Error("Fal.ai redux returned no image URL");
    }
  } else {
    // ── Text-to-image mode: flux-pro/v1.1 ───────────────────────────────────
    const result = await fal.subscribe("fal-ai/flux-pro/v1.1", {
      input: {
        prompt: options.prompt,
        image_size: imageSize,
        num_images: 1,
        safety_tolerance: "2" as const,
        output_format: "jpeg" as const,
      },
    }) as unknown as {
      data: { images: Array<{ url: string; content_type: string }> };
      requestId: string;
    };

    falImageUrl = result.data?.images?.[0]?.url;
    if (!falImageUrl) {
      throw new Error("Fal.ai returned no image URL");
    }
  }

  return saveToStorage(falImageUrl);
}
