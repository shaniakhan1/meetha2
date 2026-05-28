/**
 * One-time re-engagement email for the 4 users who signed up on 2026-05-28
 * but whose Meetha setup is incomplete.
 *
 * Users:
 *   26 - Mary Cahill        maryfcahill@gmail.com
 *   27 - Satheene Chambrier satheene.chambrier@gmail.com
 *   28 - Anjali Kumar       anjalikumars@gmail.com
 *   29 - Sarah              sarah@flpmarketinggroup.com
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Meetha <hello@meetha.studio>';
const SETUP_URL = 'https://meetha.studio/onboarding';

const users = [
  { name: 'Mary', email: 'maryfcahill@gmail.com' },
  { name: 'Satheene', email: 'satheene.chambrier@gmail.com' },
  { name: 'Anjali', email: 'anjalikumars@gmail.com' },
  { name: 'Sarah', email: 'sarah@flpmarketinggroup.com' },
];

function buildHtml(firstName) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9f6f1;font-family:system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f6f1;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:48px 40px;">
          <tr>
            <td>
              <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.2em;color:#8b7355;text-transform:uppercase;">
                Your setup is not complete yet
              </p>
              <p style="margin:0 0 24px;font-size:24px;color:#2c2c2c;font-weight:400;line-height:1.25;">
                ${firstName}, your personal model is not ready yet.
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b6b6b;line-height:1.7;">
                That might be because you have not uploaded your photos yet, or because something went wrong on our end when you did.
              </p>
              <p style="margin:0 0 32px;font-size:14px;color:#6b6b6b;line-height:1.7;">
                Either way, the fix is the same: head to your profile, upload 8 to 10 photos, and your model will train automatically. It takes about 2 minutes.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#2c2c2c;padding:14px 32px;">
                    <a href="${SETUP_URL}" style="color:#f9f6f1;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;text-decoration:none;font-family:system-ui,sans-serif;">
                      Complete your setup
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:12px;color:#9b9b9b;line-height:1.6;">
                If you run into any issues, just reply to this email and we will sort it out.
              </p>
            </td>
          </tr>
        </table>
        <table width="480" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <p style="margin:0;font-size:11px;color:#b0a898;letter-spacing:0.1em;">MEETHA</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildText(firstName) {
  return `${firstName}, your Meetha setup is not complete yet.

Your personal model is not ready. That might be because you have not uploaded your photos yet, or because something went wrong on our end when you did.

Either way, the fix is the same: head to your profile, upload 8 to 10 photos, and your model will train automatically. It takes about 2 minutes.

${SETUP_URL}

If you run into any issues, just reply to this email and we will sort it out.

Meetha`;
}

let sent = 0;
let failed = 0;

for (const user of users) {
  const firstName = user.name.split(' ')[0];
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: user.email,
      subject: 'Your Meetha setup is not complete yet',
      html: buildHtml(firstName),
      text: buildText(firstName),
    });
    if (error) {
      console.error(`FAILED ${user.email}:`, error.message);
      failed++;
    } else {
      console.log(`SENT   ${user.email} (id: ${data.id})`);
      sent++;
    }
  } catch (e) {
    console.error(`ERROR  ${user.email}:`, e.message);
    failed++;
  }
}

console.log(`\nDone. Sent: ${sent}, Failed: ${failed}`);
