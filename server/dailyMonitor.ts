/**
 * Daily monitoring heartbeat handler.
 *
 * Registered at POST /api/scheduled/daily-monitor
 * Fires every morning at 8:00 AM UTC via manus-heartbeat cron.
 *
 * Queries the last 24 hours of data from Supabase and sends a plain
 * summary email to the owner covering:
 *   - New signups
 *   - Upload funnel (started / completed / failed)
 *   - Training completion rate
 *   - Generation success / failure rate
 *   - Paid conversions
 *   - Recurring error patterns
 */

import type { Request, Response } from "express";
import { getSupabase } from "./_core/supabase";
import { Resend } from "resend";
import { ENV } from "./_core/env";

const OWNER_EMAIL = process.env.OWNER_EMAIL ?? "hello@frequencyplanner.com";

export async function handleDailyMonitor(req: Request, res: Response) {
  try {
    // CRON_SECRET bearer authentication is enforced by the route middleware.

    const sb = getSupabase() as any;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const now = new Date();

    // ── 1. New signups ──────────────────────────────────────────────────────
    const { data: newUsers, error: usersErr } = await sb
      .from("users")
      .select("id", { count: "exact", head: false })
      .gte("created_at", since);
    const signupCount = usersErr ? null : (newUsers?.length ?? 0);

    // ── 2. Total users ──────────────────────────────────────────────────────
    const { count: totalUsers } = await sb
      .from("users")
      .select("id", { count: "exact", head: true });

    // ── 3. Upload funnel from event_log ─────────────────────────────────────
    const { data: uploadEvents } = await sb
      .from("event_log")
      .select("event_type, metadata")
      .in("event_type", ["upload_started", "upload_completed", "upload_failed"])
      .gte("created_at", since);

    const uploadsStarted = uploadEvents?.filter((e: any) => e.event_type === "upload_started").length ?? 0;
    const uploadsCompleted = uploadEvents?.filter((e: any) => e.event_type === "upload_completed").length ?? 0;
    const uploadsFailed = uploadEvents?.filter((e: any) => e.event_type === "upload_failed").length ?? 0;
    const uploadFailErrors = uploadEvents
      ?.filter((e: any) => e.event_type === "upload_failed" && e.metadata?.error)
      .map((e: any) => String(e.metadata.error).slice(0, 120)) ?? [];

    // ── 4. Training funnel ──────────────────────────────────────────────────
    const { data: trainingEvents } = await sb
      .from("event_log")
      .select("event_type, metadata")
      .in("event_type", ["training_started", "training_completed", "training_failed"])
      .gte("created_at", since);

    const trainingsStarted = trainingEvents?.filter((e: any) => e.event_type === "training_started").length ?? 0;
    const trainingsCompleted = trainingEvents?.filter((e: any) => e.event_type === "training_completed").length ?? 0;
    const trainingsFailed = trainingEvents?.filter((e: any) => e.event_type === "training_failed").length ?? 0;

    // Average training duration from completed events that have duration_ms
    const completedWithDuration = trainingEvents?.filter(
      (e: any) => e.event_type === "training_completed" && typeof e.metadata?.duration_ms === "number"
    ) ?? [];
    const avgTrainingMs = completedWithDuration.length > 0
      ? completedWithDuration.reduce((sum: number, e: any) => sum + e.metadata.duration_ms, 0) / completedWithDuration.length
      : null;
    const avgTrainingMin = avgTrainingMs !== null ? Math.round(avgTrainingMs / 60000) : null;

    // Training failure reasons
    const trainingFailReasons = trainingEvents
      ?.filter((e: any) => e.event_type === "training_failed" && e.metadata?.reason)
      .map((e: any) => String(e.metadata.reason)) ?? [];

    // ── 5. Profiles stuck in training (potential stuck jobs) ────────────────
    const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data: stuckProfiles } = await sb
      .from("profiles")
      .select("user_id, updated_at")
      .eq("lora_status", "training")
      .lt("updated_at", cutoff48h);
    const stuckCount = stuckProfiles?.length ?? 0;

    // ── 6. Overall training status snapshot ─────────────────────────────────
    const { data: profileStats } = await sb
      .from("profiles")
      .select("lora_status");
    const totalReady = profileStats?.filter((p: any) => p.lora_status === "ready").length ?? 0;
    const totalFailed = profileStats?.filter((p: any) => p.lora_status === "failed").length ?? 0;
    const totalTraining = profileStats?.filter((p: any) => p.lora_status === "training").length ?? 0;
    const totalNeverUploaded = profileStats?.filter((p: any) => !p.lora_status).length ?? 0;

    // ── 7. Generation funnel ────────────────────────────────────────────────
    const { data: genEvents } = await sb
      .from("event_log")
      .select("event_type, metadata")
      .in("event_type", ["generation_attempted", "generation_completed", "generation_failed"])
      .gte("created_at", since);

    const gensAttempted = genEvents?.filter((e: any) => e.event_type === "generation_attempted").length ?? 0;
    const gensCompleted = genEvents?.filter((e: any) => e.event_type === "generation_completed").length ?? 0;
    const gensFailed = genEvents?.filter((e: any) => e.event_type === "generation_failed").length ?? 0;

    // ── 8. Paid conversions ─────────────────────────────────────────────────
    // Approximate by checking credits tier changes — credits.updated_at in window + tier != free
    const { data: paidCredits } = await sb
      .from("credits")
      .select("tier, updated_at")
      .neq("tier", "free")
      .gte("updated_at", since);
    const newPaidConversions = paidCredits?.length ?? 0;

    // Total paid users
    const { data: allPaid } = await sb
      .from("credits")
      .select("tier")
      .neq("tier", "free");
    const totalPaid = allPaid?.length ?? 0;

    // ── 9. Build email ──────────────────────────────────────────────────────
    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });

    const uploadRate = uploadsStarted > 0
      ? `${Math.round((uploadsCompleted / uploadsStarted) * 100)}%`
      : "no uploads";

    const trainingRate = trainingsStarted > 0
      ? `${Math.round((trainingsCompleted / trainingsStarted) * 100)}%`
      : "no training jobs";

    const genRate = gensAttempted > 0
      ? `${Math.round((gensCompleted / gensAttempted) * 100)}%`
      : "no generations";

    const errorLines: string[] = [];
    if (uploadFailErrors.length > 0) {
      const unique = Array.from(new Set(uploadFailErrors));
      errorLines.push(`Upload errors: ${unique.slice(0, 3).join(" | ")}`);
    }
    if (trainingFailReasons.length > 0) {
      const counts: Record<string, number> = {};
      trainingFailReasons.forEach((r: string) => { counts[r] = (counts[r] ?? 0) + 1; });
      const summary = Object.entries(counts).map(([k, v]) => `${k} (${v}x)`).join(", ");
      errorLines.push(`Training failures: ${summary}`);
    }
    if (stuckCount > 0) {
      errorLines.push(`Stuck in training >48h: ${stuckCount} user(s)`);
    }

    const lines = [
      `Meetha — Daily Report`,
      `${dateStr}`,
      ``,
      `SIGNUPS`,
      `New today: ${signupCount ?? "unavailable"}`,
      `Total: ${totalUsers ?? "unavailable"}`,
      ``,
      `UPLOAD FUNNEL (last 24h)`,
      `Started: ${uploadsStarted}`,
      `Completed: ${uploadsCompleted}`,
      `Failed: ${uploadsFailed}`,
      `Completion rate: ${uploadRate}`,
      ``,
      `TRAINING (last 24h)`,
      `Started: ${trainingsStarted}`,
      `Completed: ${trainingsCompleted}`,
      `Failed: ${trainingsFailed}`,
      `Success rate: ${trainingRate}`,
      avgTrainingMin !== null ? `Avg duration: ${avgTrainingMin} min` : `Avg duration: not enough data yet`,
      ``,
      `ALL-TIME TRAINING STATUS`,
      `Ready: ${totalReady}`,
      `Failed: ${totalFailed}`,
      `Still training: ${totalTraining}`,
      `Never uploaded: ${totalNeverUploaded}`,
      ``,
      `GENERATIONS (last 24h)`,
      `Attempted: ${gensAttempted}`,
      `Completed: ${gensCompleted}`,
      `Failed: ${gensFailed}`,
      `Success rate: ${genRate}`,
      ``,
      `PAID CONVERSIONS`,
      `New today: ${newPaidConversions}`,
      `Total paid users: ${totalPaid}`,
      ``,
      errorLines.length > 0 ? `ERRORS` : null,
      ...errorLines,
    ].filter((l) => l !== null).join("\n");

    const htmlLines = lines
      .split("\n")
      .map((line) => {
        if (!line) return "<br/>";
        if (
          line.startsWith("SIGNUPS") ||
          line.startsWith("UPLOAD") ||
          line.startsWith("TRAINING") ||
          line.startsWith("ALL-TIME") ||
          line.startsWith("GENERATIONS") ||
          line.startsWith("PAID") ||
          line.startsWith("ERRORS")
        ) {
          return `<p style="margin:16px 0 4px;font-size:11px;letter-spacing:0.15em;color:#8b7355;text-transform:uppercase;font-family:system-ui,sans-serif;">${line}</p>`;
        }
        if (line.startsWith("Meetha")) {
          return `<p style="margin:0 0 4px;font-size:18px;font-family:Georgia,serif;color:#2c1810;">${line}</p>`;
        }
        if (line.match(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/)) {
          return `<p style="margin:0 0 24px;font-size:13px;color:#8b7355;font-family:system-ui,sans-serif;">${line}</p>`;
        }
        return `<p style="margin:0 0 2px;font-size:14px;color:#3d2b1f;font-family:system-ui,sans-serif;">${line}</p>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f5f0ea;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0ea;padding:40px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#faf8f5;border-radius:4px;overflow:hidden;">
        <tr><td style="padding:32px 40px;">${htmlLines}</td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #e8e0d5;text-align:center;">
          <p style="margin:0;font-size:11px;color:#b0a898;font-family:system-ui,sans-serif;">meetha.studio internal report</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const resend = new Resend(ENV.resendApiKey);
    const utcDateKey = now.toISOString().slice(0, 10);
    const { error: sendErr } = await resend.emails.send({
      from: "Meetha <noreply@meetha.studio>",
      to: OWNER_EMAIL,
      subject: `Meetha Daily — ${dateStr}`,
      html,
      text: lines,
    }, {
      // Railway may retry a failed or interrupted cron run. Resend rejects a
      // duplicate request for this UTC report date instead of sending twice.
      idempotencyKey: `meetha-daily-monitor-${utcDateKey}`,
    });
    if (sendErr) throw new Error(`Resend error: ${sendErr.message}`);

    console.log(`[DailyMonitor] Report sent for ${dateStr}`);
    return res.json({ ok: true, date: dateStr });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[DailyMonitor] Error:", msg);
    return res.status(500).json({
      error: msg,
      stack: err instanceof Error ? err.stack : undefined,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
