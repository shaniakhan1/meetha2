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
import { emitEvent } from "./eventLog";

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://meetha.studio"
    : "http://localhost:3000";

/**
 * Analyze a training photo with a single vision LLM call to extract both:
 *   1. Physical descriptors (hair, skin tone, eye color, distinctive features)
 *   2. Body frame and proportions (body size, silhouette, bust, waist-to-hip ratio)
 *
 * Returns { physical, body } -- either field may be null if extraction fails.
 * Using one call instead of two halves the OpenAI Vision cost per training run.
 */
async function extractVisualDescriptors(
  facePhotoBuffer: Buffer,
  faceMimeType: string,
  bodyPhotoBuffer: Buffer,
  bodyMimeType: string
): Promise<{ physical: string | null; body: string | null }> {
  try {
    // Upload both photos to storage (face photo for physical, body photo for body frame)
    const [faceUpload, bodyUpload] = await Promise.all([
      storagePut(`lora-analysis/${Date.now()}-face.jpg`, facePhotoBuffer, faceMimeType),
      storagePut(`lora-analysis/${Date.now()}-body.jpg`, bodyPhotoBuffer, bodyMimeType),
    ]);
    const faceUrl = faceUpload.url.startsWith("http") ? faceUpload.url : `https://meetha.studio${faceUpload.url}`;
    const bodyUrl = bodyUpload.url.startsWith("http") ? bodyUpload.url : `https://meetha.studio${bodyUpload.url}`;

    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a precise visual analyst for AI image generation. You will be given two photos of the same person.
Photo 1 (face): extract physical appearance descriptors.
Photo 2 (body): extract body frame and proportions.

Respond with ONLY a JSON object in this exact format (no markdown, no explanation):
{"physical":"<compact comma-separated: hair color/texture, skin tone, eye color if visible, distinctive features>","body":"<one sentence: body size category, face shape fullness, arm fullness, bust size, waist-to-hip ratio, overall silhouette>"}

Physical example: "white/silver hair, warm medium-brown skin, dark brows, hazel eyes"
Body example: "Plus-size woman with a full round face, thick arms, large bust, soft waist, wide natural frame, and generous curves throughout."
Do NOT include clothing, background, or subjective adjectives.`,
        },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: faceUrl, detail: "low" } },
            { type: "image_url", image_url: { url: bodyUrl, detail: "low" } },
            { type: "text", text: "Analyze both photos and return the JSON descriptor object." },
          ],
        },
      ],
      maxTokens: 220,
    });

    const raw = result.choices?.[0]?.message?.content;
    if (typeof raw !== "string" || !raw.trim()) return { physical: null, body: null };

    try {
      const parsed = JSON.parse(raw.trim()) as { physical?: string; body?: string };
      return {
        physical: typeof parsed.physical === "string" ? parsed.physical.slice(0, 200) : null,
        body: typeof parsed.body === "string" ? parsed.body.slice(0, 300) : null,
      };
    } catch {
      // LLM returned non-JSON -- treat entire response as physical descriptor
      console.warn("[LoRA] Combined descriptor JSON parse failed, using raw as physical");
      return { physical: raw.trim().slice(0, 200), body: null };
    }
  } catch (err) {
    console.warn("[LoRA] Visual descriptor extraction failed (non-fatal):", err instanceof Error ? err.message : String(err));
    return { physical: null, body: null };
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

    // Guard: reject if a training job is already in progress for this user
    const existingProfile = await getProfile(userId);
    if (existingProfile?.lora_status === "training") {
      return res.status(409).json({ error: "A training job is already in progress. Please wait for it to complete before submitting a new one." });
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length < 5) {
      return res.status(400).json({ error: "Please upload at least 5 photos for best results" });
    }

    // Emit upload_started immediately so we can track drop-off vs completion
    emitEvent("upload_started", userId, { photo_count: files.length });

    // Convert all photos to JPEG (handles HEIC/HEIF from iPhones and other formats)
    const images = await Promise.all(
      files.map(async (f, i) => ({
        buffer: await normalizeToJpeg(f.buffer, f.mimetype, f.originalname),
        filename: `photo_${i + 1}.jpg`,
      }))
    );

    const { requestId, triggerPhrase } = await submitLoraTraining(images, userId);

    // Save training state + photo count to profile immediately (don't wait for vision analysis).
    // uploaded_photo_count is the permanent fallback: once > 0, the upload UI is NEVER shown again.
    await updateLoraProfile(userId, {
      loraTrainingRequestId: requestId,
      loraTriggerPhrase: triggerPhrase,
      loraStatus: "training",
      loraWeightsUrl: null,
      uploadedPhotoCount: images.length,
    });

    // Emit upload_completed and training_started
    emitEvent("upload_completed", userId, { photo_count: images.length });
    emitEvent("training_started", userId, { request_id: requestId });

    // Send training-started confirmation email (fire and forget)
    getUserById(userId).then(async (user) => {
      if (user?.email) {
        await sendLoraTrainingStartedEmail({ to: user.email, name: user.name ?? null }).catch((err) => {
          console.warn("[LoRA] Training-started email send error (non-fatal):", err instanceof Error ? err.message : String(err));
        });
      }
    }).catch(() => { /* non-fatal */ });

    // Single combined vision LLM call for both physical + body descriptors (halves OpenAI Vision cost)
    const faceFile = files[0];
    const bodyFile = files.length >= 3 ? files[2] : files[0];
    extractVisualDescriptors(faceFile.buffer, faceFile.mimetype, bodyFile.buffer, bodyFile.mimetype)
      .then(async ({ physical, body }: { physical: string | null; body: string | null }) => {
        if (physical) {
          await updateLoraProfile(userId, { loraPhysicalDescriptors: physical });
          console.log(`[LoRA] Physical descriptors saved for user ${userId}: ${physical}`);
        }
        if (body) {
          await updateLoraProfile(userId, { loraBodyDescriptor: body });
          console.log(`[LoRA] Body descriptor saved for user ${userId}: ${body}`);
        }
      })
      .catch(() => { /* non-fatal */ });

    // Start the self-healing background poller (no cron needed)
    startPolling(userId, requestId);

    return res.json({ requestId, triggerPhrase, status: "training" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[LoRA Upload] Error:", msg, err);
    // Emit upload_failed for monitoring
    const uid = await resolveUserId(req).catch(() => null);
    emitEvent("upload_failed", uid, { error: msg.slice(0, 200) });
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
