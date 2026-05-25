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
import { getProfile, updateLoraProfile } from "./db";
import { submitLoraTraining, pollLoraTraining } from "./_core/falLoraTraining";
import { authenticateRequest } from "./_core/auth";

// Memory storage - we only need the buffer, not disk persistence
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 20 }, // 10MB per file, max 20
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are accepted"));
  },
});

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

    const images = files.map((f, i) => ({
      buffer: f.buffer,
      filename: `photo_${i + 1}.jpg`,
    }));

    const { requestId, triggerPhrase } = await submitLoraTraining(images, userId);

    // Save training state to profile
    await updateLoraProfile(userId, {
      loraTrainingRequestId: requestId,
      loraTriggerPhrase: triggerPhrase,
      loraStatus: "training",
      loraWeightsUrl: null,
    });

    return res.json({ requestId, triggerPhrase, status: "training" });
  } catch (err) {
    console.error("[LoRA Upload]", err);
    return res.status(500).json({ error: "Training submission failed. Please try again." });
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
        return res.json({ status: "ready", loraWeightsUrl: result.loraWeightsUrl });
      }
      // Still in progress
      return res.json({ status: "training" });
    } catch {
      await updateLoraProfile(userId, { loraStatus: "failed" });
      return res.json({ status: "failed" });
    }
  } catch (err) {
    console.error("[LoRA Status]", err);
    return res.status(500).json({ error: "Status check failed" });
  }
}
