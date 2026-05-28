/**
 * One-time script: send launch-day recovery email to all users whose
 * LoRA model did not complete (lora_status is null, 'training', or 'failed').
 *
 * Run with:  node scripts/send-launch-recovery-email.mjs
 *
 * Safe to re-run: uses a dry-run flag and logs every action.
 */

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import "dotenv/config";

const DRY_RUN = process.argv.includes("--dry-run");
const FROM = "hello@meetha.studio";
const SUBJECT = "We may have broken ourselves on day one.";
const DELAY_MS = 250; // pause between sends to avoid Resend rate limits

const ONBOARDING_URL = "https://meetha.studio/onboarding";

function buildHtml(name) {
  const firstName = name ? name.split(" ")[0] : null;
  const greeting = firstName ? `${firstName},` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f5f0ea;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0ea;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#faf8f5;border-radius:4px;overflow:hidden;">
          <tr>
            <td style="padding:40px 48px 32px;text-align:center;border-bottom:1px solid #e8e0d5;">
              <p style="margin:0;font-size:11px;letter-spacing:0.25em;color:#8b7355;text-transform:uppercase;">MEETHA</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 48px;">
              ${greeting ? `<p style="margin:0 0 16px;font-size:15px;color:#5c4a3a;font-family:system-ui,sans-serif;">${greeting}</p>` : ""}
              <p style="margin:0 0 16px;font-size:15px;color:#5c4a3a;line-height:1.7;font-family:system-ui,sans-serif;">
                Launch day traffic hit harder than expected, and some photo uploads did not finish processing the way they should have.
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#5c4a3a;line-height:1.7;font-family:system-ui,sans-serif;">
                Which is honestly a good problem to have. But still, if you uploaded your photos and never received your style card, that is on us.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#5c4a3a;line-height:1.7;font-family:system-ui,sans-serif;">
                Everything is fixed now.
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#5c4a3a;line-height:1.7;font-family:system-ui,sans-serif;">
                Head back to onboarding, re-upload your photos, and Meetha will build your personal model properly this time.
              </p>
              <p style="margin:0 0 40px;font-size:15px;color:#5c4a3a;line-height:1.7;font-family:system-ui,sans-serif;">
                Your first look is waiting.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#2c1810;border-radius:2px;">
                    <a href="${ONBOARDING_URL}"
                       style="display:inline-block;padding:14px 36px;font-family:system-ui,sans-serif;font-size:12px;letter-spacing:0.15em;color:#faf8f5;text-decoration:none;text-transform:uppercase;">
                      Begin Again
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:14px;color:#8b7355;line-height:1.7;font-family:system-ui,sans-serif;">
                Meetha
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 48px;border-top:1px solid #e8e0d5;text-align:center;">
              <p style="margin:0;font-size:11px;color:#b0a898;font-family:system-ui,sans-serif;letter-spacing:0.05em;">
                Visual identity. Cinematic portraits. Styling direction.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildText(name) {
  const firstName = name ? name.split(" ")[0] : null;
  const greeting = firstName ? `${firstName},\n\n` : "";
  return `${greeting}Launch day traffic hit harder than expected, and some photo uploads did not finish processing the way they should have.

Which is honestly a good problem to have. But still, if you uploaded your photos and never received your style card, that is on us.

Everything is fixed now.

Head back to onboarding, re-upload your photos, and Meetha will build your personal model properly this time.

Your first look is waiting.

${ONBOARDING_URL}

Meetha`;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const sb = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Fetch all users whose model did not complete
  // lora_status IS NULL means they never uploaded
  // lora_status = 'failed' means training failed
  // lora_status = 'training' means it got stuck
  // Exclude lora_status = 'ready' (model completed successfully)
  const { data: profiles, error: profilesError } = await sb
    .from("profiles")
    .select("user_id, lora_status")
    .or("lora_status.is.null,lora_status.eq.failed,lora_status.eq.training");

  if (profilesError) {
    console.error("Failed to fetch profiles:", profilesError.message);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log("No affected users found. Nothing to send.");
    return;
  }

  const userIds = profiles.map((p) => p.user_id);
  console.log(`Found ${userIds.length} affected user(s).`);

  // Fetch emails and names for those users
  const { data: users, error: usersError } = await sb
    .from("users")
    .select("id, email, name")
    .in("id", userIds);

  if (usersError) {
    console.error("Failed to fetch users:", usersError.message);
    process.exit(1);
  }

  const eligible = users.filter((u) => u.email);
  console.log(`${eligible.length} user(s) have an email address.`);

  if (DRY_RUN) {
    console.log("\n--- DRY RUN (no emails sent) ---");
    eligible.forEach((u) => {
      const status = profiles.find((p) => p.user_id === u.id)?.lora_status ?? "null";
      console.log(`  [${status}] ${u.email} (${u.name ?? "no name"})`);
    });
    console.log("--- End dry run ---\n");
    return;
  }

  let sent = 0;
  let failed = 0;

  for (const user of eligible) {
    const status = profiles.find((p) => p.user_id === user.id)?.lora_status ?? "null";
    try {
      const { error } = await resend.emails.send({
        from: `Meetha <${FROM}>`,
        to: user.email,
        subject: SUBJECT,
        html: buildHtml(user.name),
        text: buildText(user.name),
      });
      if (error) {
        console.error(`  FAILED [${status}] ${user.email}: ${error.message}`);
        failed++;
      } else {
        console.log(`  SENT   [${status}] ${user.email}`);
        sent++;
      }
    } catch (err) {
      console.error(`  ERROR  [${status}] ${user.email}:`, err.message);
      failed++;
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nDone. Sent: ${sent}, Failed: ${failed}`);
}

main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
