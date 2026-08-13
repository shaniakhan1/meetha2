/**
 * Heartbeat cron handler for welcome emails.
 *
 * POST /api/scheduled/welcome-email
 *
 * Runs every 10 minutes (project-level Heartbeat, registered via manus-heartbeat CLI after deploy).
 *
 * Finds all users who:
 *   1. Signed up more than 10 minutes ago
 *   2. Have not yet received a welcome email (welcome_email_sent = false)
 *   3. Have a valid email address
 *
 * Sends a single welcome email and marks the flag so they never receive it again.
 * Idempotent: the welcome_email_sent flag prevents duplicate sends.
 */

import { Request, Response } from "express";
import { getSupabase } from "./_core/supabase";
import { sendWelcomeEmail } from "./_core/email";

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://meetha.studio"
    : "http://localhost:3000";

export async function handleWelcomeEmail(req: Request, res: Response) {
  try {
    // CRON_SECRET bearer authentication is enforced by the route middleware.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = getSupabase() as any;

    // Find users who signed up 10+ minutes ago, have an email, and haven't been welcomed yet
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: pendingUsers, error: fetchError } = await sb
      .from("users")
      .select("id, email, name, created_at")
      .eq("welcome_email_sent", false)
      .not("email", "is", null)
      .lt("created_at", tenMinutesAgo)
      .limit(50); // process max 50 per run to stay within 2-min timeout

    if (fetchError) {
      // Column may not exist yet -- fail gracefully
      console.error("[Welcome Cron] Failed to fetch pending users:", fetchError);
      return res.status(500).json({ error: "db fetch failed", detail: fetchError.message });
    }

    if (!pendingUsers || pendingUsers.length === 0) {
      return res.json({ ok: true, sent: 0, message: "no pending users" });
    }

    let sent = 0;
    let failed = 0;

    for (const u of pendingUsers as Array<{
      id: number;
      email: string;
      name: string | null;
    }>) {
      try {
        await sendWelcomeEmail({
          to: u.email,
          name: u.name,
          generateUrl: `${BASE_URL}/generate`,
          templatesUrl: `${BASE_URL}/templates`,
        });

        // Mark as sent so we never send again
        await sb
          .from("users")
          .update({ welcome_email_sent: true })
          .eq("id", u.id);

        sent++;
      } catch (emailErr) {
        console.error("[Welcome Cron] Failed to send welcome email to", u.email, emailErr);
        // Still mark as sent to avoid infinite retry on a bad address
        await sb.from("users").update({ welcome_email_sent: true }).eq("id", u.id);
        failed++;
      }
    }

    return res.json({ ok: true, sent, failed, timestamp: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Welcome Cron] Unhandled error:", message);
    return res.status(500).json({
      error: message,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
