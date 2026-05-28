/**
 * Lightweight event logging to Supabase event_log table.
 * Used for daily monitoring reports — generation attempts/failures,
 * training start/completion with durations, upload events.
 *
 * All calls are fire-and-forget (non-blocking, non-throwing).
 */
import { getSupabase } from "./_core/supabase";

export type EventType =
  | "upload_started"
  | "upload_completed"
  | "upload_failed"
  | "training_started"
  | "training_completed"
  | "training_failed"
  | "generation_attempted"
  | "generation_completed"
  | "generation_failed";

export interface EventMeta {
  error?: string;
  duration_ms?: number;
  photo_count?: number;
  tier?: string;
  platform?: string;
  archetype?: string;
  [key: string]: unknown;
}

/**
 * Emit a monitoring event. Fire-and-forget — never throws, never blocks.
 */
export function emitEvent(
  eventType: EventType,
  userId: number | null,
  meta?: EventMeta
): void {
  const sb = getSupabase() as any;
  sb.from("event_log")
    .insert({ event_type: eventType, user_id: userId, metadata: meta ?? null })
    .then(({ error }: { error: any }) => {
      if (error) {
        console.warn(`[EventLog] Failed to emit ${eventType}:`, error.message);
      }
    })
    .catch(() => {
      // Silently ignore — monitoring must never affect the critical path
    });
}
