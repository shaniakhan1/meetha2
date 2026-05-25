/**
 * Test email sender -- sends all three Meetha transactional emails
 * to a specified address so you can preview them in a real inbox.
 *
 * Usage: node scripts/send-test-emails.mjs
 */
import "dotenv/config";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) {
  console.error("RESEND_API_KEY is not set. Make sure .env is present.");
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);
const FROM = "Meetha <hello@meetha.studio>";
const TO = "Shania@flpmarketinggroup.com";
const BASE_URL = "https://meetha.studio";

// ─── Shared primitives ────────────────────────────────────────────────────────

function emailWrapper(body) {
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
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 48px;border-top:1px solid #e8e0d5;text-align:center;">
              <p style="margin:0;font-size:11px;color:#b0a898;font-family:system-ui,sans-serif;letter-spacing:0.05em;">
                Cinematic social content, without filming.
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

function ctaButton(href, label) {
  return `<table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
    <tr>
      <td style="background:#2c1810;border-radius:2px;">
        <a href="${href}"
           style="display:inline-block;padding:14px 36px;font-family:system-ui,sans-serif;font-size:12px;letter-spacing:0.15em;color:#faf8f5;text-decoration:none;text-transform:uppercase;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

// ─── Email 1: LoRA Ready ──────────────────────────────────────────────────────

async function sendLoraReady() {
  const body = `
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;color:#8b7355;text-transform:uppercase;font-family:system-ui,sans-serif;">
      Your look is ready
    </p>
    <p style="margin:0 0 24px;font-size:24px;color:#2c2c2c;font-weight:400;line-height:1.25;">
      Shania, your personal model just finished training.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.7;font-family:system-ui,sans-serif;">
      Meetha has learned your colors, your light, your warmth. Every generation from here is calibrated to you specifically. Go make something worth posting.
    </p>
    ${ctaButton(`${BASE_URL}/generate`, "Generate my first image")}
    <p style="margin:0;font-size:12px;color:#9b9b9b;line-height:1.6;font-family:system-ui,sans-serif;">
      Your model is saved to your profile. You can retrain anytime from Profile settings.
    </p>`;

  const { error, data } = await resend.emails.send({
    from: FROM,
    to: TO,
    subject: "[TEST] Your look is ready on Meetha",
    html: emailWrapper(body),
    text: `Shania, your personal Meetha model just finished training.\n\nEvery generation from here is calibrated to you. Go make something worth posting.\n\n${BASE_URL}/generate`,
  });

  if (error) throw new Error(`LoRA Ready email failed: ${error.message}`);
  console.log("✓ LoRA Ready email sent:", data?.id);
}

// ─── Email 2: LoRA Failed ─────────────────────────────────────────────────────

async function sendLoraFailed() {
  const body = `
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;color:#8b7355;text-transform:uppercase;font-family:system-ui,sans-serif;">
      Something went wrong
    </p>
    <p style="margin:0 0 24px;font-size:24px;color:#2c2c2c;font-weight:400;line-height:1.25;">
      Shania, your model training did not complete.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.7;font-family:system-ui,sans-serif;">
      This can happen if the photos were too similar or the connection timed out. The fix is usually just uploading a fresh set with more variety in lighting and angles. It only takes a minute.
    </p>
    ${ctaButton(`${BASE_URL}/profile`, "Try again")}
    <p style="margin:0;font-size:12px;color:#9b9b9b;line-height:1.6;font-family:system-ui,sans-serif;">
      Tips: use 5 to 10 photos with varied lighting, different angles, and no heavy filters.
    </p>`;

  const { error, data } = await resend.emails.send({
    from: FROM,
    to: TO,
    subject: "[TEST] Your Meetha model did not finish training",
    html: emailWrapper(body),
    text: `Shania, your Meetha model training did not complete.\n\nUpload a fresh set with more variety and it should work.\n\n${BASE_URL}/profile`,
  });

  if (error) throw new Error(`LoRA Failed email failed: ${error.message}`);
  console.log("✓ LoRA Failed email sent:", data?.id);
}

// ─── Email 3: Onboarding Nudge ────────────────────────────────────────────────

async function sendOnboardingNudge() {
  const body = `
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;color:#8b7355;text-transform:uppercase;font-family:system-ui,sans-serif;">
      One thing left
    </p>
    <p style="margin:0 0 24px;font-size:24px;color:#2c2c2c;font-weight:400;line-height:1.25;">
      Shania, your look is not trained yet.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.7;font-family:system-ui,sans-serif;">
      Meetha generates better images when it knows your colors, your skin tone, your light. Upload 5 to 10 photos and your personal model trains in about 20 minutes. Every generation after that is calibrated to you, not a generic template.
    </p>
    ${ctaButton(`${BASE_URL}/profile`, "Train my look")}
    <p style="margin:0;font-size:12px;color:#9b9b9b;line-height:1.6;font-family:system-ui,sans-serif;">
      You can skip this and generate without a personal model anytime. This just makes results better.
    </p>`;

  const { error, data } = await resend.emails.send({
    from: FROM,
    to: TO,
    subject: "[TEST] Your Meetha look is not trained yet",
    html: emailWrapper(body),
    text: `Shania, your Meetha look is not trained yet.\n\nUpload 5 to 10 photos and your personal model trains in about 20 minutes.\n\n${BASE_URL}/profile`,
  });

  if (error) throw new Error(`Onboarding Nudge email failed: ${error.message}`);
  console.log("✓ Onboarding Nudge email sent:", data?.id);
}

// ─── Run all ──────────────────────────────────────────────────────────────────

console.log(`Sending 3 test emails to ${TO}...\n`);

try {
  await sendLoraReady();
  await sendLoraFailed();
  await sendOnboardingNudge();
  console.log("\nAll 3 test emails sent successfully.");
} catch (err) {
  console.error("\nFailed:", err.message);
  process.exit(1);
}
