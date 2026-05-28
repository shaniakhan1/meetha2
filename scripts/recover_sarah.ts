/**
 * One-time recovery script for Sarah (user_id=29).
 * Her trigger phrase is w0man29.
 * We need to find her training request ID and weights URL from Fal.ai.
 */
import { createClient } from "@supabase/supabase-js";
import { fal } from "@fal-ai/client";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FAL_API_KEY = process.env.FAL_API_KEY!;

fal.config({ credentials: FAL_API_KEY });

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) as any;

const USER_ID = 29;
const TRIGGER_PHRASE = "w0man29";
const FAL_MODEL = "fal-ai/flux-lora-portrait-trainer";

async function main() {
  console.log("=== Recovering Sarah (user_id=29) ===");

  // 1. Confirm she has no profile
  const { data: existing } = await sb.from("profiles").select("*").eq("user_id", USER_ID).maybeSingle();
  if (existing) {
    console.log("Sarah already has a profile:", JSON.stringify(existing));
    return;
  }
  console.log("Confirmed: no profile row for user 29");

  // 2. Try to list recent queue items for the portrait trainer
  // The Fal.ai queue API may allow listing jobs
  try {
    const queueList = await (fal.queue as any).list(FAL_MODEL, { status: "COMPLETED" });
    console.log("Queue list:", JSON.stringify(queueList, null, 2));
  } catch (e: any) {
    console.log("Queue list not supported:", e.message);
  }

  // 3. Try to find her job by checking recent request IDs
  // The request IDs follow a UUID v7 pattern (time-ordered)
  // Sarah signed up at 2026-05-28T04:54:36 UTC
  // The training would have started shortly after
  // Let's try to query the Fal.ai API directly for recent jobs
  try {
    const response = await fetch(`https://queue.fal.run/${FAL_MODEL}/requests`, {
      headers: {
        "Authorization": `Key ${FAL_API_KEY}`,
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    console.log("Direct API response:", JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.log("Direct API error:", e.message);
  }

  // 4. If we can't find the request ID, insert a minimal profile with lora_status=null
  // so at least the dashboard shows the correct "Add photos" state
  // (Better than showing wrong state)
  console.log("\nInserting minimal profile for Sarah with lora_status=null...");
  const { error: insertError } = await sb.from("profiles").insert({
    user_id: USER_ID,
    archetype: "luxury_minimal",
    mood: "soft",
    onboarding_complete: false,
    uploaded_photo_count: 0,
    lora_status: null,
    lora_trigger_phrase: TRIGGER_PHRASE,
  });
  if (insertError) {
    console.error("Insert error:", insertError.message);
  } else {
    console.log("Minimal profile inserted. Sarah will see 'Add photos' on dashboard.");
    console.log("She should re-upload her photos to retrain.");
  }
}

main().catch(console.error);
