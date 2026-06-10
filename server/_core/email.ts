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

// ─── LoRA Training Started ────────────────────────────────────────────────────

export async function sendLoraTrainingStartedEmail({
  to,
  name,
}: {
  to: string;
  name: string | null;
}): Promise<void> {
  const resend = getResend();
  const firstName = name?.split(" ")[0] ?? null;

  const body = `
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;color:#8b7355;text-transform:uppercase;font-family:system-ui,sans-serif;">
      In progress
    </p>
    <p style="margin:0 0 24px;font-size:24px;color:#2c2c2c;font-weight:400;line-height:1.25;">
      Your model is being trained.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b6b6b;line-height:1.7;font-family:system-ui,sans-serif;">
      We're building your visual identity now using the photos you uploaded.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b6b6b;line-height:1.7;font-family:system-ui,sans-serif;">
      This usually takes around 15 to 20 minutes.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b6b6b;line-height:1.7;font-family:system-ui,sans-serif;">
      Once ready, you'll be able to generate cinematic portraits, explore your styling direction, and unlock your first style card.
    </p>
    <p style="margin:0 0 40px;font-size:14px;color:#6b6b6b;line-height:1.7;font-family:system-ui,sans-serif;">
      No need to stay on the page. We'll email you as soon as everything is ready.
    </p>
    <p style="margin:0;font-size:14px;color:#8b7355;line-height:1.7;font-family:system-ui,sans-serif;">
      — Meetha
    </p>`;

  const greeting = firstName ? `${firstName}, your` : "Your";
  const text = `Your model is being trained.\n\nWe're building your visual identity now using the photos you uploaded.\n\nThis usually takes around 15 to 20 minutes.\n\nOnce ready, you'll be able to generate cinematic portraits, explore your styling direction, and unlock your first style card.\n\nNo need to stay on the page. We'll email you as soon as everything is ready.\n\n— Meetha`;
  void greeting; // used only for plain text greeting variant if needed

  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_ADDRESS}>`,
    to,
    subject: "Your model is being trained",
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
      ${greeting}, your visual identity is ready.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.7;font-family:system-ui,sans-serif;">
      Your personal model has finished training. Every generation from here is calibrated to you specifically — your features, your light, your presence.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.7;font-family:system-ui,sans-serif;">
      Your first look is waiting.
    </p>
    ${ctaButton(generateUrl, "Generate Your First Look")}
    <p style="margin:0;font-size:12px;color:#9b9b9b;line-height:1.6;font-family:system-ui,sans-serif;">
      Your model is saved to your profile. You can retrain anytime from Profile settings.
    </p>`;

  const text = `${greeting}, your visual identity is ready.\n\nYour personal model has finished training. Every generation from here is calibrated to you specifically.\n\nYour first look is waiting.\n\n${generateUrl}`;

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
      This can happen if the photos were too similar or the upload timed out. Uploading a fresh set with more variety in lighting and angles usually resolves it.
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
      Your visual identity is waiting
    </p>
    <p style="margin:0 0 24px;font-size:24px;color:#2c2c2c;font-weight:400;line-height:1.25;">
      ${greeting}, you haven't seen your first look yet.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.7;font-family:system-ui,sans-serif;">
      Upload 5 to 10 photos and Meetha will build a personal model around your features, your light, and your presence. Training takes about 20 minutes.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.7;font-family:system-ui,sans-serif;">
      Your visual identity is waiting.
    </p>
    ${ctaButton(profileUrl, "Upload Your Photos")}`;

  const text = `${greeting}, you haven't seen your first look yet.\n\nUpload 5 to 10 photos and Meetha will build a personal model around your features, your light, and your presence. Training takes about 20 minutes.\n\nYour visual identity is waiting.\n\n${profileUrl}`;

  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_ADDRESS}>`,
    to,
    subject: "Your visual identity is waiting",
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
      A visual identity experience designed to help you see yourself the way a stylist, photographer, and creative director would.
    </h1>
    <p style="margin:0 0 16px;font-size:15px;color:#5c4a3a;line-height:1.7;font-family:system-ui,sans-serif;">
      You have 1 free generation waiting.
    </p>
    <p style="margin:0 0 4px;font-size:15px;color:#5c4a3a;line-height:1.7;font-family:system-ui,sans-serif;">Inside, you'll receive:</p>
    <ul style="margin:0 0 24px;padding-left:20px;font-size:15px;color:#5c4a3a;line-height:2;font-family:system-ui,sans-serif;">
      <li>cinematic portrait generations</li>
      <li>personalized styling direction</li>
      <li>visual identity insights</li>
      <li>aesthetic references tailored to your features, energy, and presence</li>
    </ul>
    <p style="margin:0 0 4px;font-size:15px;color:#5c4a3a;line-height:1.9;font-family:system-ui,sans-serif;">No posing stress.</p>
    <p style="margin:0 0 4px;font-size:15px;color:#5c4a3a;line-height:1.9;font-family:system-ui,sans-serif;">No endless Pinterest scrolling.</p>
    <p style="margin:0 0 32px;font-size:15px;color:#5c4a3a;line-height:1.9;font-family:system-ui,sans-serif;">No guessing what suits you.</p>
    <p style="margin:0 0 32px;font-size:15px;color:#5c4a3a;line-height:1.7;font-family:system-ui,sans-serif;">
      Just upload your photos and discover the version of you that already exists visually.
    </p>
    ${ctaButton(generateUrl, "Discover Your Visual Identity")}
    <p style="margin:0 0 8px;font-size:13px;color:#8b7355;line-height:1.6;font-family:system-ui,sans-serif;text-align:center;">
      Or explore the <a href="${templatesUrl}" style="color:#8b7355;">template library</a> for inspiration.
    </p>
  `;

  const text = `Welcome to Meetha.\n\nA visual identity experience designed to help you see yourself the way a stylist, photographer, and creative director would.\n\nYou have 1 free generation waiting.\n\nInside, you'll receive:\n- cinematic portrait generations\n- personalized styling direction\n- visual identity insights\n- aesthetic references tailored to your features, energy, and presence\n\nNo posing stress.\nNo endless Pinterest scrolling.\nNo guessing what suits you.\n\nJust upload your photos and discover the version of you that already exists visually.\n\nBegin your first generation: ${generateUrl}\n\nOr explore the template library: ${templatesUrl}`;

  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_ADDRESS}>`,
    to,
    subject: `Welcome to Meetha, ${firstName}.`,
    html: emailWrapper(body),
    text,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ─── Transformation Card Ready ────────────────────────────────────────────────

export async function sendTransformationCardReadyEmail({
  to,
  name,
  profileUrl,
}: {
  to: string;
  name: string | null;
  profileUrl: string;
}): Promise<void> {
  const resend = getResend();
  const firstName = name?.split(" ")[0] ?? "You";

  const body = `
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;color:#8b7355;text-transform:uppercase;font-family:system-ui,sans-serif;">
      Your visual transformation
    </p>
    <p style="margin:0 0 24px;font-size:24px;color:#2c2c2c;font-weight:400;line-height:1.25;">
      ${firstName}, your Transformation Card is ready.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.7;font-family:system-ui,sans-serif;">
      Meetha has created a personalized style card that captures your styling direction, your visual identity, and the version of you that feels most visually aligned. It is yours to save and share.
    </p>
    ${ctaButton(profileUrl, "View my Transformation Card")}
    <p style="margin:0;font-size:12px;color:#9b9b9b;line-height:1.6;font-family:system-ui,sans-serif;">
      You can download and share your card from the Profile page.
    </p>`;

  const text = `${firstName}, your Meetha Transformation Card is ready.\n\nView and download it from your profile: ${profileUrl}`;

  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_ADDRESS}>`,
    to,
    subject: `Your Transformation Card is ready, ${firstName}`,
    html: emailWrapper(body),
    text,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ─── Membership Activated ─────────────────────────────────────────────────────

export async function sendMembershipActivatedEmail({
  to,
  name,
  dashboardUrl,
}: {
  to: string;
  name: string | null;
  dashboardUrl: string;
}): Promise<void> {
  const resend = getResend();
  const firstName = name?.split(" ")[0] ?? null;
  const greeting = firstName ? `${firstName}, welcome` : "Welcome";

  const body = `
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;color:#8b7355;text-transform:uppercase;font-family:system-ui,sans-serif;">
      Membership active
    </p>
    <p style="margin:0 0 24px;font-size:24px;color:#2c2c2c;font-weight:400;line-height:1.25;">
      ${greeting} to Meetha membership.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#6b6b6b;line-height:1.7;font-family:system-ui,sans-serif;">Your access is now active. Inside, you'll find:</p>
    <ul style="margin:0 0 32px;padding-left:20px;font-size:14px;color:#6b6b6b;line-height:2;font-family:system-ui,sans-serif;">
      <li>expanded cinematic portrait generations</li>
      <li>premium styling direction</li>
      <li>your Identity Brief</li>
      <li>elevated aesthetic references</li>
    </ul>
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.7;font-family:system-ui,sans-serif;">
      Your visual identity experience is now fully unlocked.
    </p>
    ${ctaButton(dashboardUrl, "Enter Membership")}
    <p style="margin:24px 0 0;font-size:12px;color:#b8a898;line-height:1.7;font-family:system-ui,sans-serif;text-align:center;">
      To manage or cancel your membership at any time, visit your
      <a href="${dashboardUrl.replace('/dashboard', '/profile')}" style="color:#8b7355;text-decoration:none;">Profile page</a>
      and tap <strong>Manage Membership</strong>.
    </p>`;

  const text = `${greeting} to Meetha membership.\n\nYour access is now active. Inside, you'll find:\n- expanded cinematic portrait generations\n- premium styling direction\n- your Identity Brief\n- elevated aesthetic references\n\nYour visual identity experience is now fully unlocked.\n\n${dashboardUrl}\n\nTo manage or cancel your membership at any time, visit your Profile page and tap Manage Membership: ${dashboardUrl.replace('/dashboard', '/profile')}`;

  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_ADDRESS}>`,
    to,
    subject: "Your Meetha membership is active",
    html: emailWrapper(body),
    text,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ─── Founder Recovery Email ───────────────────────────────────────────────────
export async function sendRecoveryEmail({
  to,
  name,
  dashboardUrl,
}: {
  to: string;
  name: string | null;
  dashboardUrl: string;
}): Promise<void> {
  const resend = getResend();
  const firstName = name?.split(" ")[0] ?? null;

  const body = `
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.9;font-family:system-ui,sans-serif;">
      When Meetha launched, far more people joined than I expected.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.9;font-family:system-ui,sans-serif;">
      The excitement was incredible.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.9;font-family:system-ui,sans-serif;">
      The reality is that a few things behind the scenes weren't ready for the amount of traffic that came through, and some of you ran into issues when trying to upgrade your account.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.9;font-family:system-ui,sans-serif;">
      We've spent the last few days fixing those problems and making the experience much smoother.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.9;font-family:system-ui,sans-serif;">
      As a thank you for being one of our earliest supporters, I've added <strong style="color:#2c2c2c;">3 complimentary generations</strong> to your account.
    </p>
    <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.9;font-family:system-ui,sans-serif;">
      And if you decide to become a member, you'll receive <strong style="color:#2c2c2c;">3 additional bonus generations</strong> on top of your membership.
    </p>
    ${ctaButton(dashboardUrl, "Use My Generations")}
    <p style="margin:32px 0 8px;font-size:14px;color:#6b6b6b;line-height:1.9;font-family:system-ui,sans-serif;">
      Thank you for being here this early. Building Meetha has been one of the most meaningful projects I've ever worked on, and I'm so excited for you to experience what's next.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#6b6b6b;line-height:1.9;font-family:system-ui,sans-serif;">
      With gratitude,
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:#2c2c2c;font-weight:500;font-family:system-ui,sans-serif;">
      Shania
    </p>
    <p style="margin:0;font-size:12px;color:#9b9b9b;font-family:system-ui,sans-serif;">
      Founder, Meetha
    </p>`;

  const text = [
    "When Meetha launched, far more people joined than I expected.",
    "",
    "The excitement was incredible.",
    "",
    "The reality is that a few things behind the scenes weren't ready for the amount of traffic that came through, and some of you ran into issues when trying to upgrade your account.",
    "",
    "We've spent the last few days fixing those problems and making the experience much smoother.",
    "",
    "As a thank you for being one of our earliest supporters, I've added 3 complimentary generations to your account.",
    "",
    "And if you decide to become a member, you'll receive 3 additional bonus generations on top of your membership.",
    "",
    `Use your generations: ${dashboardUrl}`,
    "",
    "Thank you for being here this early. Building Meetha has been one of the most meaningful projects I've ever worked on, and I'm so excited for you to experience what's next.",
    "",
    "With gratitude,",
    "Shania",
    "Founder, Meetha",
  ].join("\n");

  const greeting = firstName ? `${firstName},` : "Hello,";
  void greeting; // firstName available if we want to personalise subject

  const { error } = await resend.emails.send({
    from: `Shania at Meetha <${FROM_ADDRESS}>`,
    to,
    subject: "A thank you from me — and 3 generations on us",
    html: emailWrapper(body),
    text,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

// ─── V58 Apology Email ────────────────────────────────────────────────────────

export async function sendApologyEmail({
  to,
  name,
  creditsRestored,
  dashboardUrl,
}: {
  to: string;
  name: string | null;
  creditsRestored: number;
  dashboardUrl: string;
}): Promise<void> {
  const resend = getResend();
  const firstName = name?.split(" ")[0] ?? null;
  const greeting = firstName ? firstName : "Hi";

  const body = `
    <p style="margin:0 0 24px;font-size:24px;color:#2c2c2c;font-weight:400;line-height:1.25;">
      ${greeting}, we owe you an apology.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b6b6b;line-height:1.9;font-family:system-ui,sans-serif;">
      Earlier today, a bug in our system deducted credits from your account without delivering the generation you were expecting.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#6b6b6b;line-height:1.9;font-family:system-ui,sans-serif;">
      We've fixed the issue and restored <strong>${creditsRestored} credit${creditsRestored !== 1 ? "s" : ""}</strong> to your account. They're available now.
    </p>
    <p style="margin:0 0 40px;font-size:14px;color:#6b6b6b;line-height:1.9;font-family:system-ui,sans-serif;">
      We're sorry this happened. Meetha is built to give you something beautiful, and we fell short of that today.
    </p>
    ${ctaButton(dashboardUrl, "Return to Meetha")}
    <p style="margin:0;font-size:13px;color:#8b7355;line-height:1.6;font-family:system-ui,sans-serif;">
      — Meetha
    </p>`;

  const text = `${greeting}, we owe you an apology.\n\nEarlier today, a bug in our system deducted credits from your account without delivering the generation you were expecting.\n\nWe've fixed the issue and restored ${creditsRestored} credit${creditsRestored !== 1 ? "s" : ""} to your account. They're available now.\n\nWe're sorry this happened.\n\n— Meetha\n\n${dashboardUrl}`;

  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_ADDRESS}>`,
    to,
    subject: "We fixed a bug and restored your credits",
    html: emailWrapper(body),
    text,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}
