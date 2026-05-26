/**
 * Heartbeat cron handler for nightly generation archiving.
 *
 * POST /api/scheduled/archive-generations
 *
 * Runs nightly at 03:00 UTC (project-level Heartbeat, registered via manus-heartbeat CLI after deploy).
 *
 * Archive policy (keeps costs near-zero at scale):
 *   - free tier:    archive generations older than 30 days
 *   - starter tier: archive generations older than 90 days
 *   - pro tier:     never archive (unlimited history)
 *
 * Idempotent: archived=true rows are skipped on subsequent runs.
 * The S3 objects are NOT deleted here - they are handled by a separate S3 lifecycle
 * policy (180 days). This means re-downloads will 404 gracefully after 180 days.
 */

import { Request, Response } from "express";
import { getSupabase } from "./_core/supabase";
import { archiveOldGenerations } from "./db";
import { sdk } from "./_core/sdk";

const ARCHIVE_POLICY: Record<string, number | null> = {
  free: 30,      // days
  starter: 90,   // days
  pro: null,     // never archive
};

export async function handleArchiveGenerations(req: Request, res: Response) {
  try {
    // Authenticate as cron - reject non-cron callers
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = getSupabase() as any;

    // Fetch all distinct users with their tier
    const { data: creditRows, error: fetchError } = await sb
      .from("credits")
      .select("user_id, tier");

    if (fetchError) {
      console.error("[Archive Cron] Failed to fetch credits:", fetchError);
      return res.status(500).json({ error: "db fetch failed", detail: fetchError.message });
    }

    if (!creditRows || creditRows.length === 0) {
      return res.json({ ok: true, processed: 0, archived: 0, message: "no users found" });
    }

    let totalArchived = 0;
    let processed = 0;
    let skipped = 0;

    for (const row of creditRows as Array<{ user_id: number; tier: string }>) {
      try {
        const cutoffDays = ARCHIVE_POLICY[row.tier] ?? ARCHIVE_POLICY["free"]!;

        // Pro users never get archived
        if (cutoffDays === null) {
          skipped++;
          continue;
        }

        const archived = await archiveOldGenerations(row.user_id, cutoffDays);
        totalArchived += archived;
        processed++;
      } catch (userErr) {
        console.error("[Archive Cron] Error processing user", row.user_id, userErr);
        // Continue - do not abort the whole run for one user
      }
    }

    return res.json({
      ok: true,
      processed,
      skipped,
      archived: totalArchived,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Archive Cron] Unhandled error:", message);
    return res.status(500).json({
      error: message,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
