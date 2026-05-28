/**
 * Express route handler for LoRA portrait training photo uploads.
 *
 * POST /api/lora/upload
 *   - Accepts up to 20 image files (multipart/form-data, field name: "photos")
 *   - Requires a valid session cookie (same auth as tRPC protectedProcedure)
 *   - Zips the images, uploads to Fal.ai, submits training job
 *   - Returns { requestId, triggerPhrase }
 *
 * GET /api/lora/status
 *   - Polls the Fal.ai queue for the user's current training job
 *   - Updates the profile when training completes
 *   - Returns { status: 'training' | 'ready' | 'failed' | null, loraWeightsUrl? }
 */

import { Request, Response } from "express";
import multer from "multer";
import sharp from "sharp";
import { getProfile, updateLoraProfile, getUserById } from "./db";
import { submitLoraTraining, pollLoraTraining } from "./_core/falLoraTraining";
import { authenticateRequest } from "./_core/auth";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { sendLoraReadyEmail, sendLoraFailedEmail, sendLoraTrainingStartedEmail } from "./_core/email";
import { claimLoraEmailSlot } from "./db";
import { startPolling } from "./loraPoller";

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://meetha.studio"
    : "http://localhost:3000";

/**
 * Analyze the first training photo with vision AI to extract physical descriptors.
 * Returns a compact string like "white/silver hair, warm medium-brown skin, dark brows, hazel eyes"
 * that will be injected into every LoRA generation prompt as a text anchor.
 */
async function extractPhysicalDescriptors(photoBuffer: Buffer, mimeType: string): Promise<string | null> {
  try {
    // Upload the photo to storage so we have a stable URL for the vision call
    const { url } = await storagePut(`lora-analysis/${Date.now()}.jpg`, photoBuffer, mimeType);
    // Build an absolute URL -- storage returns /manus-storage/... which needs a base
    const absoluteUrl = url.startsWith("http") ? url : `https://meetha.studio${url}`;

    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a precise visual analyst. Describe only the physical appearance of the person in the photo. Be specific and factual. Output a single compact comma-separated string of descriptors. Include: hair color and texture, skin tone, eye color if visible, any distinctive features (freckles, strong brows, etc). Do NOT include clothing, background, or subjective adjectives. Example output: white/silver hair, warm medium-brown skin, dark brows, hazel eyes",
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: absoluteUrl, detail: "low" },
            },
            {
              type: "text",
              text: "Describe this person's physical appearance as a compact comma-separated list for use as image generation prompt descriptors. Focus on hair color, skin tone, eye color, and any distinctive features.",
            },
          ],
        },
      ],
      maxTokens: 120,
    });

    const raw = result.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || !raw.trim()) return null;
    // Trim to 200 chars max to keep prompts lean
    return raw.trim().slice(0, 200);
  } catch (err) {
    console.warn("[LoRA] Physical descriptor extraction failed (non-fatal):", err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Analyze a training photo to extract body frame and proportions.
 * Returns an explicit body anchor string injected into every generation prompt
 * to prevent the diffusion model from collapsing to its default slim bias.
 */
async function extractBodyDescriptor(photoBuffer: Buffer, mimeType: string): Promise<string | null> {
  try {
    const { url } = await storagePut(`lora-body-analysis/${Date.now()}.jpg`, photoBuffer, mimeType);
    const absoluteUrl = url.startsWith("http") ? url : `https://meetha.studio${url}`;
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a precise visual analyst for AI image generation. Describe the body frame and proportions of the person in the photo. Be factual and specific. Focus ONLY on: body size category (slim/average/curvy/plus-size/full-figured), face shape fullness (round/oval/full/defined), arm fullness (slender/average/full/thick), bust size (small/medium/large/full), waist-to-hip ratio (defined/moderate/soft), and overall silhouette (narrow/medium/wide frame). Output a single sentence starting with the subject's body description. Example: "Plus-size woman with a full round face, thick arms, large bust, soft waist, wide natural frame, and generous curves throughout." Do NOT include hair, skin tone, clothing, or background.`,
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: absoluteUrl, detail: "low" } },
            { type: "text", text: "Describe this person's body frame and proportions for use as an AI generation preservation anchor. One sentence only." },
          ],
        },
      ],
      maxTokens: 100,
    });
    const raw = result.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || !raw.trim()) return null;
    return raw.trim().slice(0, 300);
  } catch (err) {
    console.warn("[LoRA] Body descriptor extraction failed (non-fatal):", err instanceof Error ? err.message : String(err));
    return null;
  }
}

// Memory storage - we only need the buffer, not disk persistence
const ACCEPTED_EXTS = /\.(heic|heif|jpg|jpeg|png|webp|tiff?)$/i;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024, files: 20 }, // 16MB per file (HEIC can be large), max 20
  fileFilter: (_req, file, cb) => {
    const mime = file.mimetype.toLowerCase();
    // Accept any image/* MIME type, or HEIC/HEIF which browsers may send as application/octet-stream
    if (mime.startsWith("image/") || ACCEPTED_EXTS.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are accepted. Supported: JPG, PNG, HEIC, WebP."));
    }
  },
});

/**
 * Convert any photo buffer to JPEG.
 * HEIC/HEIF files from iPhones are converted via sharp (libvips with HEIF support).
 * Already-JPEG files are returned as-is.
 */
async function normalizeToJpeg(buffer: Buffer, mimetype: string, filename: string): Promise<Buffer> {
  const mime = mimetype.toLowerCase();
  const ext = (filename.toLowerCase().split(".").pop() ?? "");
  const isJpeg = mime === "image/jpeg" || mime === "image/jpg" || ext === "jpg" || ext === "jpeg";
  if (isJpeg) return buffer;
  try {
    return await sharp(buffer).jpeg({ quality: 92 }).toBuffer();
  } catch (err) {
    console.warn("[LoRA] Image conversion failed, using original:", err instanceof Error ? err.message : String(err));
    return buffer;
  }
}

/** Resolve the authenticated user using the same session cookie as tRPC. */
async function resolveUserId(req: Request): Promise<number | null> {
  try {
    const user = await authenticateRequest(req);
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export const loraUploadMiddleware = upload.array("photos", 20);

export async function handleLoraUpload(req: Request, res: Response) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length < 5) {
      return res.status(400).json({ error: "Please upload at least 5 photos for best results" });
    }

    // Convert all photos to JPEG (handles HEIC/HEIF from iPhones and other formats)
    const images = await Promise.all(
      files.map(async (f, i) => ({
        buffer: await normalizeToJpeg(f.buffer, f.mimetype, f.originalname),
        filename: `photo_${i + 1}.jpg`,
      }))
    );

    const { requestId, triggerPhrase } = await submitLoraTraining(images, userId);

    // Analyze the first photo with vision AI to extract physical descriptors
    // This runs in parallel with saving the training state (non-blocking)
    const firstFile = files[0];
    const physicalDescriptorsPromise = extractPhysicalDescriptors(
      firstFile.buffer,
      firstFile.mimetype
    );

    // Save training state + photo count to profile immediately (don't wait for vision analysis).
    // uploaded_photo_count is the permanent fallback: once > 0, the upload UI is NEVER shown again.
    await updateLoraProfile(userId, {
      loraTrainingRequestId: requestId,
      loraTriggerPhrase: triggerPhrase,
      loraStatus: "training",
      loraWeightsUrl: null,
      uploadedPhotoCount: images.length,
    });

    // Send training-started confirmation email (fire and forget)
    getUserById(userId).then(async (user) => {
      if (user?.email) {
        await sendLoraTrainingStartedEmail({ to: user.email, name: user.name ?? null }).catch((err) => {
          console.warn("[LoRA] Training-started email send error (non-fatal):", err instanceof Error ? err.message : String(err));
        });
      }
    }).catch(() => { /* non-fatal */ });

    // Also run body descriptor analysis on a full-body photo if available (prefer 3rd photo for more body context)
    const bodyAnalysisFile = files.length >= 3 ? files[2] : files[0];
    const bodyDescriptorPromise = extractBodyDescriptor(bodyAnalysisFile.buffer, bodyAnalysisFile.mimetype);

    // Save physical descriptors once vision analysis completes (fire and forget)
    physicalDescriptorsPromise.then(async (descriptors) => {
      if (descriptors) {
        await updateLoraProfile(userId, { loraPhysicalDescriptors: descriptors });
        console.log(`[LoRA] Physical descriptors saved for user ${userId}: ${descriptors}`);
      }
    }).catch(() => { /* non-fatal */ });

    // Save body descriptor once analysis completes (fire and forget)
    bodyDescriptorPromise.then(async (descriptor) => {
      if (descriptor) {
        await updateLoraProfile(userId, { loraBodyDescriptor: descriptor });
        console.log(`[LoRA] Body descriptor saved for user ${userId}: ${descriptor}`);
      }
    }).catch(() => { /* non-fatal */ });

    // Start the self-healing background poller (no cron needed)
    startPolling(userId, requestId);

    return res.json({ requestId, triggerPhrase, status: "training" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[LoRA Upload] Error:", msg, err);
    // Return the actual error message so we can diagnose production failures
    return res.status(500).json({ error: `Training submission failed: ${msg.slice(0, 300)}` });
  }
}

export async function handleLoraStatus(req: Request, res: Response) {
  try {
    const userId = await resolveUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const profile = await getProfile(userId);
    if (!profile) return res.json({ status: null });

    const { lora_status, lora_training_request_id, lora_trigger_phrase, lora_weights_url } = profile;

    // Already done or failed - return cached state
    if (lora_status === "ready") {
      return res.json({ status: "ready", loraWeightsUrl: lora_weights_url });
    }
    if (lora_status === "failed") {
      return res.json({ status: "failed" });
    }
    if (!lora_training_request_id || !lora_trigger_phrase) {
      return res.json({ status: null });
    }

    // Poll Fal.ai
    try {
      const result = await pollLoraTraining(lora_training_request_id, lora_trigger_phrase);
      if (result) {
        // Training complete - save weights URL
        await updateLoraProfile(userId, {
          loraWeightsUrl: result.loraWeightsUrl,
          loraStatus: "ready",
        });
        // Fire ready email immediately (non-blocking) -- claim slot to prevent duplicates
        getUserById(userId).then(async (user) => {
          if (user?.email) {
            const claimed = await claimLoraEmailSlot(userId, "ready").catch(() => true);
            if (claimed) {
              await sendLoraReadyEmail({
                to: user.email,
                name: user.name ?? null,
                generateUrl: `${BASE_URL}/dashboard`,
              }).catch((err) =>
                console.warn("[LoRA] Ready email failed (non-fatal):", err instanceof Error ? err.message : String(err))
              );
            } else {
              console.log(`[LoRA Status] Ready email already sent for user ${userId}, skipping`);
            }
          }
        }).catch(() => { /* non-fatal */ });
        return res.json({ status: "ready", loraWeightsUrl: result.loraWeightsUrl });
      }
      // Still in progress
      return res.json({ status: "training" });
    } catch {
      await updateLoraProfile(userId, { loraStatus: "failed" });
      // Fire failed email immediately (non-blocking) -- claim slot to prevent duplicates
      getUserById(userId).then(async (user) => {
        if (user?.email) {
          const claimed = await claimLoraEmailSlot(userId, "failed").catch(() => true);
          if (claimed) {
            await sendLoraFailedEmail({
              to: user.email,
              name: user.name ?? null,
              retryUrl: `${BASE_URL}/dashboard`,
            }).catch((err) =>
              console.warn("[LoRA] Failed email send error (non-fatal):", err instanceof Error ? err.message : String(err))
            );
          } else {
            console.log(`[LoRA Status] Failed email already sent for user ${userId}, skipping`);
          }
        }
      }).catch(() => { /* non-fatal */ });
      return res.json({ status: "failed" });
    }
  } catch (err) {
    console.error("[LoRA Status]", err);
    return res.status(500).json({ error: "Status check failed" });
  }
}
