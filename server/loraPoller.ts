/**
 * Self-healing LoRA training poller.
 *
 * When a LoRA training job is submitted, call `startPolling(userId, requestId)`.
 * The poller checks Fal.ai every 60 seconds, saves the weights URL on completion,
 * sends the ready/failed email, and stops automatically.
 *
 * On server startup, call `recoverStuckJobs()` to resume polling for any jobs
 * that were IN_QUEUE or TRAINING when the server last restarted.
 */

import { fal } from "@fal-ai/client";
import { createClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";
import { getUserById, updateLoraProfile } from "./db";
import { sendLoraReadyEmail, sendLoraFailedEmail } from "./_core/email";

// ─── Config ──────────────────────────────────────────────────────────────────
// Configure Fal.ai credentials once at module load time
fal.config({ credentials: ENV.falApiKey });

const POLL_INTERVAL_MS = 60_000; // 60 seconds
const MAX_POLL_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours max
const FAL_MODEL = "fal-ai/flux-lora-portrait-trainer";
const BASE_URL = ENV.isProduction ? "https://meetha.studio" : "http://localhost:3000";

// ─── Active pollers registry ─────────────────────────────────────────────────
const activePollers = new Map<number, NodeJS.Timeout>();

// ─── Main poller ─────────────────────────────────────────────────────────────
export function startPolling(userId: number, requestId: string): void {
  if (activePollers.has(userId)) {
    console.log(`[LoraPoller] Already polling for user ${userId}, skipping duplicate`);
    return;
  }

  console.log(`[LoraPoller] Starting poll for user ${userId}, requestId: ${requestId}`);
  const startedAt = Date.now();

  const timer = setInterval(async () => {
    try {
      await pollOnce(userId, requestId, startedAt, timer);
    } catch (err) {
      console.error(`[LoraPoller] Unexpected error for user ${userId}:`, err);
    }
  }, POLL_INTERVAL_MS);

  activePollers.set(userId, timer);

  // Also poll immediately (after a short delay to let Fal register the job)
  setTimeout(async () => {
    try {
      await pollOnce(userId, requestId, startedAt, timer);
    } catch (err) {
      console.error(`[LoraPoller] Initial poll error for user ${userId}:`, err);
    }
  }, 5_000);
}

async function pollOnce(
  userId: number,
  requestId: string,
  startedAt: number,
  timer: NodeJS.Timeout
): Promise<void> {
  // Check timeout
  if (Date.now() - startedAt > MAX_POLL_DURATION_MS) {
    console.warn(`[LoraPoller] Timeout for user ${userId} after 2 hours`);
    stopPolling(userId, timer);
    await updateLoraProfile(userId, { loraStatus: "failed" });
    await sendEmailSafe(userId, "failed");
    return;
  }

  const status = await fal.queue.status(FAL_MODEL, { requestId, logs: false });
  console.log(`[LoraPoller] User ${userId} status: ${status.status}`);

  const statusStr = String(status.status);
  if (statusStr === "COMPLETED") {
    stopPolling(userId, timer);
    await handleCompleted(userId, requestId);
  } else if (statusStr === "FAILED" || statusStr === "ERROR") {
    stopPolling(userId, timer);
    await updateLoraProfile(userId, { loraStatus: "failed" });
    await sendEmailSafe(userId, "failed");
  }
  // IN_QUEUE or IN_PROGRESS → keep polling
}

async function handleCompleted(userId: number, requestId: string): Promise<void> {
  try {
    const result = await fal.queue.result(FAL_MODEL, { requestId });
    const data = (result as any).data ?? result;
    const weightsUrl: string | undefined =
      data?.diffusers_lora_file?.url ??
      data?.lora_weights_url ??
      data?.weights_url;

    if (!weightsUrl) {
      console.error(`[LoraPoller] No weights URL in result for user ${userId}`, data);
      await updateLoraProfile(userId, { loraStatus: "failed" });
      await sendEmailSafe(userId, "failed");
      return;
    }

    await updateLoraProfile(userId, {
      loraStatus: "ready",
      loraWeightsUrl: weightsUrl,
    });

    console.log(`[LoraPoller] User ${userId} LoRA ready: ${weightsUrl}`);
    await sendEmailSafe(userId, "ready");
  } catch (err) {
    console.error(`[LoraPoller] Failed to finalize completed job for user ${userId}:`, err);
    await updateLoraProfile(userId, { loraStatus: "failed" });
    await sendEmailSafe(userId, "failed");
  }
}

function stopPolling(userId: number, timer: NodeJS.Timeout): void {
  clearInterval(timer);
  activePollers.delete(userId);
  console.log(`[LoraPoller] Stopped polling for user ${userId}`);
}

async function sendEmailSafe(userId: number, type: "ready" | "failed"): Promise<void> {
  try {
    const user = await getUserById(userId);
    if (!user?.email) return;

    if (type === "ready") {
      await sendLoraReadyEmail({
        to: user.email,
        name: user.name ?? null,
        generateUrl: `${BASE_URL}/dashboard`,
      });
    } else {
      await sendLoraFailedEmail({
        to: user.email,
        name: user.name ?? null,
        retryUrl: `${BASE_URL}/dashboard`,
      });
    }
    console.log(`[LoraPoller] Sent ${type} email to user ${userId}`);
  } catch (err) {
    console.warn(`[LoraPoller] Email send failed for user ${userId} (non-fatal):`, err);
  }
}

// ─── Startup recovery ────────────────────────────────────────────────────────
/**
 * Call once at server startup to resume polling for any jobs stuck in
 * lora_status = 'training' that were left behind by a server restart.
 */
export async function recoverStuckJobs(): Promise<void> {
  try {
    const sb = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey);
    const { data, error } = await sb
      .from("profiles")
      .select("user_id, lora_training_request_id")
      .eq("lora_status", "training")
      .not("lora_training_request_id", "is", null);

    if (error) {
      console.error("[LoraPoller] Recovery query failed:", error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log("[LoraPoller] No stuck jobs to recover");
      return;
    }

    console.log(`[LoraPoller] Recovering ${data.length} stuck job(s)`);
    for (const row of data) {
      startPolling(row.user_id, row.lora_training_request_id);
    }
  } catch (err) {
    console.error("[LoraPoller] Recovery failed (non-fatal):", err);
  }
}
