/**
 * Fal.ai LoRA portrait training helper.
 *
 * Flow:
 *  1. Caller passes an array of image buffers (selfies).
 *  2. We zip them in-memory and upload the ZIP to Fal.ai storage.
 *  3. We submit an async training job to fal-ai/flux-lora-portrait-trainer.
 *  4. We return the Fal.ai request_id so the caller can poll for completion.
 *
 * When training completes, the caller should save:
 *   - diffusers_lora_file.url → lora_weights_url on the profile
 *   - trigger_phrase → lora_trigger_phrase on the profile
 */

import { fal } from "@fal-ai/client";
import JSZip from "jszip";
import { ENV } from "./env";

export type LoraTrainingSubmitResult = {
  requestId: string;
  triggerPhrase: string;
};

export type LoraTrainingCompleteResult = {
  loraWeightsUrl: string;
  triggerPhrase: string;
};

/** Build a ZIP buffer from an array of image buffers using JSZip. */
async function buildZip(
  images: Array<{ buffer: Buffer; filename: string }>
): Promise<Buffer> {
  const zip = new JSZip();
  for (const img of images) {
    zip.file(img.filename, img.buffer);
  }
  const arrayBuffer = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  return Buffer.from(arrayBuffer);
}

/**
 * Submit a LoRA portrait training job.
 * Returns the Fal.ai request_id and the trigger phrase to use in prompts.
 */
export async function submitLoraTraining(
  images: Array<{ buffer: Buffer; filename: string }>,
  userId: number
): Promise<LoraTrainingSubmitResult> {
  if (!ENV.falApiKey) throw new Error("FAL_API_KEY is not configured");

  fal.config({ credentials: ENV.falApiKey });

  // 1. Build ZIP
  const zipBuffer = await buildZip(images);

  // 2. Upload ZIP to Fal.ai storage
  // Convert Buffer to a plain ArrayBuffer to satisfy TypeScript's BlobPart constraint
  const zipArrayBuffer = zipBuffer.buffer.slice(
    zipBuffer.byteOffset,
    zipBuffer.byteOffset + zipBuffer.byteLength
  ) as ArrayBuffer;
  const zipFile = new File([zipArrayBuffer], `user_${userId}_portraits.zip`, {
    type: "application/zip",
  });
  const zipUrl = await fal.storage.upload(zipFile);

  // 3. Unique trigger phrase per user
  const triggerPhrase = `w0man${userId}`;

  // 4. Submit async training job
  const { request_id } = await fal.queue.submit(
    "fal-ai/flux-lora-portrait-trainer",
    {
      input: {
        images_data_url: zipUrl,
        trigger_phrase: triggerPhrase,
        steps: 1000, // ~15-20 min, good quality/speed balance
        learning_rate: 0.0001, // Lowered from 0.0002 -- closer to Fal default (0.00009), reduces overtraining at 1000 steps
        multiresolution_training: true,
        subject_crop: true,
        create_masks: false,
      },
    }
  );

  return { requestId: request_id, triggerPhrase };
}

/**
 * Poll the Fal.ai queue for a training job.
 * Returns the result if complete, null if still in progress, throws on failure.
 */
export async function pollLoraTraining(
  requestId: string,
  triggerPhrase: string
): Promise<LoraTrainingCompleteResult | null> {
  if (!ENV.falApiKey) throw new Error("FAL_API_KEY is not configured");

  fal.config({ credentials: ENV.falApiKey });

  const status = await fal.queue.status("fal-ai/flux-lora-portrait-trainer", {
    requestId,
    logs: false,
  });

  if (status.status === "COMPLETED") {
    const result = await fal.queue.result(
      "fal-ai/flux-lora-portrait-trainer",
      { requestId }
    );
    const data = result.data as {
      diffusers_lora_file?: { url: string };
    };
    const loraWeightsUrl = data?.diffusers_lora_file?.url;
    if (!loraWeightsUrl) throw new Error("Training completed but no LoRA weights URL returned");
    return { loraWeightsUrl, triggerPhrase };
  }

  if ((status.status as string) === "FAILED") {
    throw new Error("LoRA training job failed on Fal.ai");
  }

  // IN_QUEUE or IN_PROGRESS
  return null;
}

/**
 * Generate an image using a trained LoRA.
 * Falls back to standard FLUX Ultra if no LoRA is available.
 */
export async function generateImageWithLora(options: {
  prompt: string;
  loraWeightsUrl: string;
  triggerPhrase: string;
  imageSize?: "portrait_4_3" | "portrait_16_9" | "square_hd" | "landscape_16_9" | "landscape_4_3";
  physicalDescriptors?: string | null;
}): Promise<{ url: string }> {
  if (!ENV.falApiKey) throw new Error("FAL_API_KEY is not configured");

  fal.config({ credentials: ENV.falApiKey });

  const SIZE_TO_ENUM: Record<string, string> = {
    portrait_4_3: "portrait_4_3",
    portrait_16_9: "portrait_16_9",
    square_hd: "square_hd",
    landscape_16_9: "landscape_16_9",
    landscape_4_3: "landscape_4_3",
  };

  const imageSize = (SIZE_TO_ENUM[options.imageSize ?? "portrait_4_3"] ?? "portrait_4_3") as
    | "square"
    | "portrait_4_3"
    | "portrait_16_9"
    | "square_hd"
    | "landscape_16_9"
    | "landscape_4_3";

  // Scene composition MUST come first — Flux/FLUX-LoRA heavily weights early tokens.
  // Placing the trigger phrase first causes the model to collapse into beauty-portrait mode
  // before it reads the cinematic scene instructions.
  // Physical descriptors are appended after the trigger as a soft identity anchor.
  const physicalAnchor = options.physicalDescriptors
    ? `, ${options.physicalDescriptors}`
    : "";
  // Scene prompt leads. Identity injected at the end.
  const promptWithTrigger = `${options.prompt}, PERSON: ${options.triggerPhrase}${physicalAnchor}`;

  const result = (await fal.subscribe("fal-ai/flux-lora", {
    input: {
      prompt: promptWithTrigger,
      // negative_prompt is supported by flux-lora at runtime but not in the TS type definitions
      ...({
        negative_prompt: "centered portrait, beauty headshot, glamour shot, studio portrait, influencer selfie, symmetrical composition, direct eye contact, clean background, posed headshot, close-up beauty portrait, fashion editorial portrait, hyper-thin body, extremely slender waist, exaggerated hourglass, unrealistic proportions, model-thin, emaciated, underweight appearance, distorted body shape, elongated limbs, stretched figure, body modification, plastic surgery look, unnatural waist, pinched waist, corset-thin, fashion-model distortion",
      } as Record<string, unknown>),
      image_size: imageSize,
      loras: [
        {
          path: options.loraWeightsUrl,
          scale: 1.0, // Full identity adherence -- physical descriptors handle the balance
        },
      ],
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      output_format: "jpeg" as const,
      enable_safety_checker: true,
    },
  })) as unknown as {
    data: { images: Array<{ url: string }> };
  };

  const imageUrl = result.data?.images?.[0]?.url;
  if (!imageUrl) throw new Error("FLUX LoRA returned no image URL");

  return { url: imageUrl };
}
