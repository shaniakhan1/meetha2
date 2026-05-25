/**
 * Resend email helper — transactional emails for Meetha.
 * Currently used for magic link sign-in delivery.
 */
import { Resend } from "resend";
import { ENV } from "./env";

const FROM_ADDRESS = "hello@meetha.studio";
const FROM_NAME = "Meetha";

function getResend() {
  if (!ENV.resendApiKey) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(ENV.resendApiKey);
}

export async function sendMagicLinkEmail({
  to,
  magicLink,
}: {
  to: string;
  magicLink: string;
}): Promise<void> {
  const resend = getResend();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in to Meetha</title>
</head>
<body style="margin:0;padding:0;background:#f5f0ea;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0ea;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#faf8f5;border-radius:4px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:40px 48px 32px;text-align:center;border-bottom:1px solid #e8e0d5;">
              <p style="margin:0;font-size:13px;letter-spacing:0.2em;color:#8b7355;text-transform:uppercase;">MEETHA</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;">
              <p style="margin:0 0 8px;font-size:22px;color:#2c2c2c;font-weight:400;line-height:1.3;">
                Your sign-in link
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#6b6b6b;line-height:1.6;font-family:system-ui,sans-serif;">
                Click the button below to sign in to your Meetha account. This link expires in 24 hours and can only be used once.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td style="background:#2c2c2c;border-radius:2px;">
                    <a href="${magicLink}"
                       style="display:inline-block;padding:14px 36px;font-family:system-ui,sans-serif;font-size:13px;letter-spacing:0.12em;color:#faf8f5;text-decoration:none;text-transform:uppercase;">
                      Sign in to Meetha
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;color:#9b9b9b;line-height:1.6;font-family:system-ui,sans-serif;">
                If you did not request this link, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px;border-top:1px solid #e8e0d5;text-align:center;">
              <p style="margin:0;font-size:12px;color:#b0a898;font-family:system-ui,sans-serif;">
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

  const text = `Sign in to Meetha\n\nClick the link below to sign in:\n${magicLink}\n\nThis link expires in 24 hours and can only be used once.\n\nIf you did not request this, you can safely ignore this email.`;

  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_ADDRESS}>`,
    to,
    subject: "Your Meetha sign-in link",
    html,
    text,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}
