/**
 * Heartbeat cron handler for LoRA training completion notifications.
 *
 * POST /api/scheduled/lora-check
 *
 * Runs every 5 minutes (project-level Heartbeat, registered via manus-heartbeat CLI after deploy).
 * Finds all users with lora_status = 'training', polls Fal.ai for each,
 * and sends a Resend email when status transitions to 'ready' or 'failed'.
 *
 * Idempotent: once status is 'ready' or 'failed', the profile is updated and
 * the cron will skip that user on subsequent runs.
 */

import { Request, Response } from "express";
import { getSupabase } from "./_core/supabase";
import { updateLoraProfile, claimLoraEmailSlot } from "./db";
import { pollLoraTraining } from "./_core/falLoraTraining";
import { sendLoraReadyEmail, sendLoraFailedEmail } from "./_core/email";

const BASE_URL = process.env.NODE_ENV === "production"
  ? "https://meetha.studio"
  : "http://localhost:3000";

export async function handleLoraCheck(req: Request, res: Response) {
  try {
    // Authentication is enforced at route registration by requireCronSecret.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = getSupabase() as any;

    // Find all profiles currently in 'training' state that have a request ID
    const { data: trainingProfiles, error: fetchError } = await sb
      .from("profiles")
      .select("id, user_id, lora_training_request_id, lora_trigger_phrase")
      .eq("lora_status", "training")
      .not("lora_training_request_id", "is", null);

    if (fetchError) {
      console.error("[LoRA Cron] Failed to fetch training profiles:", fetchError);
      return res.status(500).json({ error: "db fetch failed", detail: fetchError.message });
    }

    if (!trainingProfiles || trainingProfiles.length === 0) {
      return res.json({ ok: true, checked: 0, message: "no profiles in training state" });
    }

    let completed = 0;
    let failed = 0;
    let stillTraining = 0;

    for (const profile of trainingProfiles as Array<{
      id: number;
      user_id: number;
      lora_training_request_id: string;
      lora_trigger_phrase: string;
    }>) {
      try {
        // Look up user email and name for the notification
        const { data: userRow } = await sb
          .from("users")
          .select("email, name")
          .eq("id", profile.user_id)
          .single();

        const email: string | null = userRow?.email ?? null;
        const name: string | null = userRow?.name ?? null;

        // Poll Fal.ai for this training job
        let result: { loraWeightsUrl: string; triggerPhrase: string } | null = null;
        let pollFailed = false;

        try {
          result = await pollLoraTraining(
            profile.lora_training_request_id,
            profile.lora_trigger_phrase
          );
        } catch {
          pollFailed = true;
        }

                if (pollFailed) {
          // Mark as failed in DB
          await updateLoraProfile(profile.user_id, { loraStatus: "failed" });
          failed++;
          // Send failure email if we have an address -- claim slot first to prevent duplicates
          if (email) {
            try {
              const claimed = await claimLoraEmailSlot(profile.user_id, "failed");
              if (claimed) {
                await sendLoraFailedEmail({
                  to: email,
                  name,
                  retryUrl: `${BASE_URL}/dashboard`,
                });
              } else {
                console.log(`[LoRA Cron] Failed email already sent for user ${profile.user_id}, skipping`);
              }
            } catch (emailErr) {
              console.error("[LoRA Cron] Failed to send failure email to", email, emailErr);
            }
          }
        } else if (result) {
          // Training complete -- save weights and mark ready
          await updateLoraProfile(profile.user_id, {
            loraWeightsUrl: result.loraWeightsUrl,
            loraStatus: "ready",
          });
          completed++;
          // Send success email -- claim slot first to prevent duplicates
          if (email) {
            try {
              const claimed = await claimLoraEmailSlot(profile.user_id, "ready");
              if (claimed) {
                await sendLoraReadyEmail({
                  to: email,
                  name,
                  generateUrl: `${BASE_URL}/dashboard`,
                });
              } else {
                console.log(`[LoRA Cron] Ready email already sent for user ${profile.user_id}, skipping`);
              }
            } catch (emailErr) {
              console.error("[LoRA Cron] Failed to send ready email to", email, emailErr);
            }
          }
        } else {
          // Still in progress
          stillTraining++;
        }
      } catch (profileErr) {
        console.error("[LoRA Cron] Error processing profile", profile.user_id, profileErr);
        // Continue processing other profiles -- do not abort the whole run
      }
    }

    return res.json({
      ok: true,
      checked: trainingProfiles.length,
      completed,
      failed,
      stillTraining,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[LoRA Cron] Unhandled error:", message);
    return res.status(500).json({
      error: message,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
