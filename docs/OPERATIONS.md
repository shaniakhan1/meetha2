# Meetha: Owner Operations Runbook

## Architecture and ownership

Meetha’s intended operating path is **GitHub → Railway → Supabase**. GitHub repository `shaniakhan1/meetha2` is the source of truth. Railway hosts the web service and four short-lived cron services. Supabase provides the existing database, Auth, and the private `meetha-assets` Storage bucket. Stripe, Resend, FAL, and Sentry remain the providers for payments, transactional email, model work, and error reporting.

Manus remains live only as the temporary rollback target until the final DNS and Stripe webhook cutover is approved. It is not the intended runtime after cutover.

## Routine deployment

Make application changes in GitHub’s `main` branch. Railway automatically builds and deploys the web service and uses the same repository for the cron service source. Do not edit generated bundles or make code-only hotfixes in the Railway console; console-only code changes cannot be reproduced or reviewed.

After any deployment, verify the Railway service is **Success**, open the public domain, sign in, and check Railway logs for startup errors. If a deploy fails, use Railway’s deployment log first, then revert the GitHub commit through a new corrective commit or GitHub’s revert workflow.

## Railway services

| Service | UTC schedule | Runner command | Purpose |
|---|---:|---|---|
| `Meetha` | Always on | `pnpm start` | Web application and protected HTTP scheduled endpoints |
| `meetha-cron-lora` | `*/5 * * * *` | `pnpm cron:run -- lora-check` | Checks active LoRA training and sends completion/failure email when appropriate |
| `meetha-cron-welcome` | `2-59/10 * * * *` | `pnpm cron:run -- welcome-email` | Sends pending welcome email work |
| `meetha-cron-archive` | `0 3 * * *` | `pnpm cron:run -- archive-generations` | Archives generations using the existing job rules |
| `meetha-cron-daily` | `0 8 * * *` | `pnpm cron:run -- daily-monitor` | Sends the existing daily monitoring output |

All schedules are UTC. Each cron service uses `restartPolicyType=NEVER`, must finish and exit, and calls the protected Meetha endpoint with `CRON_SECRET`. Railway skips an overlapping scheduled run, so do not turn cron services into long-running workers. [1]

The current staging target is `https://meetha2-production.up.railway.app`. After custom-domain cutover, change `CRON_TARGET_URL` on all four cron services to `https://meetha.studio`; do not change `CRON_SECRET`.

## Railway variables

Keep secrets in Railway’s **Variables** panel only, never in GitHub source. The web service requires the active values for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `FAL_API_KEY`, `SENTRY_DSN`, and `CRON_SECRET`.

The browser bundle requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. They are public client configuration values, not service-role credentials. The cron services contain only `CRON_SECRET` as a reference to `Meetha.CRON_SECRET` and `CRON_TARGET_URL`.

## Supabase operations

Supabase Auth retains the existing user identities. The three approved canonical duplicate-email anchors are preserved in Auth app metadata as legacy IDs `10`, `14`, and `13`; do not delete, merge, or overwrite their underlying legacy user rows without a separate data-migration plan.

The private `meetha-assets` bucket contains the verified migrated persistent assets. The application keeps the existing `/manus-storage/*` route as a compatibility path and redirects to short-lived Supabase signed URLs. Do not make the bucket public. Back up database records before any bulk change to generation, profile-card, or asset references.

## OAuth, payments, email, and monitoring

Supabase Auth URL Configuration must include the active domain callback in the form `https://<domain>/auth/callback`. Keep both the current staging callback and `https://meetha.studio/auth/callback` until the old rollback path is retired. Google OAuth is configured through Supabase; the provider callback remains Supabase’s own callback URL.

Before moving the public domain, keep Stripe’s existing live webhook untouched. After DNS cutover and a successful payment test, add or switch the Stripe endpoint to `https://meetha.studio/api/stripe/webhook`, verify a signed test event, and retain the Manus endpoint only until the rollback window closes. Resend magic-link delivery was verified through Railway staging. Review Sentry in its provider dashboard after any release; do not intentionally trigger user-facing exceptions in production just to test it.

## Pre-cutover and rollback

Do not change DNS or the live Stripe webhook until all of the following are true: Railway has a successful deployment, email and Google sign-in work, dashboard credits and existing images load, a generation is saved to Supabase Storage, and Railway cron services are configured. The confirmed staging generation was saved in private Supabase Storage and the LoRA cron runner completed its protected check with HTTP 200.

For DNS cutover, point `meetha.studio` and `www.meetha.studio` to Railway according to the custom-domain records Railway supplies. Set all four `CRON_TARGET_URL` values to `https://meetha.studio`, then verify one protected cron call and one real sign-in. Only after that should the Stripe webhook endpoint be updated.

If the Railway production path fails during the rollback window, restore the prior Manus DNS records, retain the current Stripe webhook or point it back to the known Manus endpoint, and disable the four Railway cron services to avoid duplicate scheduled work. The database and Supabase assets are shared resources, so rollback does not require a data restore.

## Known non-blocking UX items

The migration did not alter product UX. Two follow-up items remain separate from portability work: desktop image save currently requires a second click, and the Share action was unavailable during staging acceptance while image save worked.

## References

[1]: https://docs.railway.com/cron-jobs "Railway Cron Jobs"
