/**
 * Fal.ai video generation helper for Meetha Pro tier.
 * Uses Kling v1.6 to animate a static image into a cinematic lifestyle clip.
 */
import { fal } from "@fal-ai/client";
import { ENV } from "./env";

export async function generateVideoFal(params: {
  imageUrl: string;
  prompt: string;
}): Promise<{ url: string }> {
  if (!ENV.falApiKey) throw new Error("FAL_API_KEY is not configured");
  fal.config({ credentials: ENV.falApiKey });

  // Use Kling v1.6 image-to-video for cinematic lifestyle motion
  const result = await fal.subscribe("fal-ai/kling-video/v1.6/standard/image-to-video", {
    input: {
      image_url: params.imageUrl,
      prompt: params.prompt,
      duration: "5",
    } as any,
  }) as unknown as { video?: { url: string }; url?: string };

  const videoUrl =
    (result as any)?.video?.url ??
    (result as any)?.url ??
    "";

  if (!videoUrl) {
    throw new Error("Fal.ai video generation returned no URL");
  }

  return { url: videoUrl };
}
