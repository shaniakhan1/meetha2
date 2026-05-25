/**
 * Resend email helper -- transactional emails for Meetha.
 * Used for magic link sign-in, LoRA training notifications, and onboarding nudges.
 */
import { Resend } from "resend";
import { ENV } from "./env";

const FROM_ADDRESS = "hello@meetha.studio";
const FROM_NAME = "Meetha";

function getResend() {
  if (!ENV.resendApiKey) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(ENV.resendApiKey);
}

// ─── Shared HTML primitives ───────────────────────────────────────────────────

function emailWrapper(body: string): string {
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
          <!-- Header -->
          <tr>
            <td style="padding:40px 48px 32px;text-align:center;border-bottom:1px solid #e8e0d5;">
              <p style="margin:0;font-size:11px;letter-spacing:0.25em;color:#8b7355;text-transform:uppercase;">MEETHA</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;">
              ${body}
            </td>
          </tr>
          <!-- Footer -->
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

function ctaButton(href: string, label: string): string {
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

// ─── Magic Link ───────────────────────────────────────────────────────────────

export async function sendMagicLinkEmail({
  to,
  magicLink,
}: {
  to: string;
  magicLink: string;
}): Promise<void> {
  const resend = getResend();

  const body = `
    <p style="margin:0 0 8px;font-size:22px;color:#2c2c2c;font-weight:400;line-height:1.3;">
      Your sign-in link
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.7;font-family:system-ui,sans-serif;">
      Click the button below to sign in to your Meetha account. This link expires in 24 hours and can only be used once.
    </p>
    ${ctaButton(magicLink, "Sign in to Meetha")}
    <p style="margin:0;font-size:12px;color:#9b9b9b;line-height:1.6;font-family:system-ui,sans-serif;">
      If you did not request this link, you can safely ignore this email.
    </p>`;

  const text = `Sign in to Meetha\n\nClick the link below to sign in:\n${magicLink}\n\nThis link expires in 24 hours and can only be used once.\n\nIf you did not request this, you can safely ignore this email.`;

  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_ADDRESS}>`,
    to,
    subject: "Your Meetha sign-in link",
    html: emailWrapper(body),
    text,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ─── LoRA Training Ready ──────────────────────────────────────────────────────

export async function sendLoraReadyEmail({
  to,
  name,
  generateUrl,
}: {
  to: string;
  name: string | null;
  generateUrl: string;
}): Promise<void> {
  const resend = getResend();
  const greeting = name ? name.split(" ")[0] : "You";

  const body = `
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;color:#8b7355;text-transform:uppercase;font-family:system-ui,sans-serif;">
      Your look is ready
    </p>
    <p style="margin:0 0 24px;font-size:24px;color:#2c2c2c;font-weight:400;line-height:1.25;">
      ${greeting}, your personal model just finished training.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.7;font-family:system-ui,sans-serif;">
      Meetha has learned your colors, your light, your warmth. Every generation from here is calibrated to you specifically. Go make something worth posting.
    </p>
    ${ctaButton(generateUrl, "Generate my first image")}
    <p style="margin:0;font-size:12px;color:#9b9b9b;line-height:1.6;font-family:system-ui,sans-serif;">
      Your model is saved to your profile. You can retrain anytime from Profile settings.
    </p>`;

  const text = `${greeting}, your personal Meetha model just finished training.\n\nEvery generation from here is calibrated to you. Go make something worth posting.\n\n${generateUrl}`;

  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_ADDRESS}>`,
    to,
    subject: "Your look is ready on Meetha",
    html: emailWrapper(body),
    text,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ─── LoRA Training Failed ─────────────────────────────────────────────────────

export async function sendLoraFailedEmail({
  to,
  name,
  retryUrl,
}: {
  to: string;
  name: string | null;
  retryUrl: string;
}): Promise<void> {
  const resend = getResend();
  const greeting = name ? name.split(" ")[0] : "Hey";

  const body = `
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;color:#8b7355;text-transform:uppercase;font-family:system-ui,sans-serif;">
      Something went wrong
    </p>
    <p style="margin:0 0 24px;font-size:24px;color:#2c2c2c;font-weight:400;line-height:1.25;">
      ${greeting}, your model training did not complete.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.7;font-family:system-ui,sans-serif;">
      This can happen if the photos were too similar or the connection timed out. The fix is usually just uploading a fresh set with more variety in lighting and angles. It only takes a minute.
    </p>
    ${ctaButton(retryUrl, "Try again")}
    <p style="margin:0;font-size:12px;color:#9b9b9b;line-height:1.6;font-family:system-ui,sans-serif;">
      Tips: use 5 to 10 photos with varied lighting, different angles, and no heavy filters.
    </p>`;

  const text = `${greeting}, your Meetha model training did not complete.\n\nThis usually happens with photos that are too similar. Upload a fresh set with more variety and it should work.\n\n${retryUrl}`;

  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_ADDRESS}>`,
    to,
    subject: "Your Meetha model did not finish training",
    html: emailWrapper(body),
    text,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ─── Onboarding Nudge (skipped LoRA) ─────────────────────────────────────────

export async function sendLoraOnboardingNudgeEmail({
  to,
  name,
  profileUrl,
}: {
  to: string;
  name: string | null;
  profileUrl: string;
}): Promise<void> {
  const resend = getResend();
  const greeting = name ? name.split(" ")[0] : "Hey";

  const body = `
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;color:#8b7355;text-transform:uppercase;font-family:system-ui,sans-serif;">
      One thing left
    </p>
    <p style="margin:0 0 24px;font-size:24px;color:#2c2c2c;font-weight:400;line-height:1.25;">
      ${greeting}, your look is not trained yet.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.7;font-family:system-ui,sans-serif;">
      Meetha generates better images when it knows your colors, your skin tone, your light. Upload 5 to 10 photos and your personal model trains in about 20 minutes. Every generation after that is calibrated to you, not a generic template.
    </p>
    ${ctaButton(profileUrl, "Train my look")}
    <p style="margin:0;font-size:12px;color:#9b9b9b;line-height:1.6;font-family:system-ui,sans-serif;">
      You can skip this and generate without a personal model anytime. This just makes results better.
    </p>`;

  const text = `${greeting}, your Meetha look is not trained yet.\n\nUpload 5 to 10 photos and your personal model trains in about 20 minutes. Every generation after that is calibrated to you.\n\n${profileUrl}`;

  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_ADDRESS}>`,
    to,
    subject: "Your Meetha look is not trained yet",
    html: emailWrapper(body),
    text,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ─── Welcome Email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail({
  to,
  name,
  generateUrl,
  templatesUrl,
}: {
  to: string;
  name: string | null;
  generateUrl: string;
  templatesUrl: string;
}): Promise<void> {
  const resend = getResend();
  const firstName = name?.split(" ")[0] ?? "there";

  const body = `
    <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.1em;color:#8b7355;text-transform:uppercase;font-family:system-ui,sans-serif;">
      Welcome to Meetha
    </p>
    <h1 style="margin:0 0 24px;font-size:28px;font-weight:400;color:#2c1810;line-height:1.3;">
      You are the aesthetic, ${firstName}.
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#5c4a3a;line-height:1.7;font-family:system-ui,sans-serif;">
      You have 3 free generations waiting. Each one gives you a cinematic image, three editorial hooks, and a caption tuned to your frequency.
    </p>
    <p style="margin:0 0 32px;font-size:15px;color:#5c4a3a;line-height:1.7;font-family:system-ui,sans-serif;">
      No filming. No blank page. Just tap Generate and see what comes through.
    </p>
    ${ctaButton(generateUrl, "Create My First Post")}
    <p style="margin:0 0 8px;font-size:13px;color:#8b7355;line-height:1.6;font-family:system-ui,sans-serif;text-align:center;">
      Or browse the <a href="${templatesUrl}" style="color:#8b7355;">template library</a> for a starting point.
    </p>
  `;

  const text = `Welcome to Meetha, ${firstName}.\n\nYou have 3 free generations waiting. No filming. No blank page.\n\nCreate your first post: ${generateUrl}\n\nOr browse templates: ${templatesUrl}`;

  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_ADDRESS}>`,
    to,
    subject: `You are the aesthetic, ${firstName}.`,
    html: emailWrapper(body),
    text,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}
