# Meetha: Owner Operations Runbook

## Architecture and ownership

Meetha’s live operating path is **GitHub → Railway → Supabase**. GitHub repository `shaniakhan1/meetha2` is the source of truth. Railway hosts the web service and short-lived cron services. Supabase provides the existing database, Auth, and the private `meetha-assets` Storage bucket. Stripe, Resend, FAL, OpenAI, and Sentry remain the providers for payments, transactional email, model work, generation analysis, and error reporting.

Cloudflare is the active DNS authority for `meetha.studio`. The domain registration transfer away from Manus is a separate registrar step; never store its authorization code in source control. Manus is not part of the live runtime, asset, authentication, or DNS request path.

## Routine deployment

Make application changes in GitHub’s `main` branch. Railway automatically builds and deploys the web service and uses the same repository for the cron service source. Do not edit generated bundles or make code-only hotfixes in the Railway console; console-only code changes cannot be reproduced or reviewed.

After any deployment, verify the Railway service is **Success**, open the public domain, sign in, and check Railway logs for startup errors. If a deploy fails, use Railway’s deployment log first, then revert the GitHub commit through a new corrective commit or GitHub’s revert workflow.

## Railway services

| Service | UTC schedule | Runner command | Purpose |
|---|---:|---|---|
| `Meetha` | Always on | `pnpm start` | Web application and protected HTTP scheduled endpoints; custom domains must target **port 8080** |
| `meetha-cron-lora` | `*/5 * * * *` | `pnpm cron:run -- lora-check` | Checks active LoRA training and sends completion/failure email when appropriate |
| `meetha-cron-welcome` | **Disabled** | `pnpm cron:run -- welcome-email` | Permanently disabled because authentication already sends the one-time welcome email; do not restore this schedule |
| `meetha-cron-archive` | `0 3 * * *` | `pnpm cron:run -- archive-generations` | Archives generations using the existing job rules |
| `meetha-cron-daily` | `0 8 * * *` | `pnpm cron:run -- daily-monitor` | Sends the existing daily monitoring output |

All schedules are UTC. Each cron service uses `restartPolicyType=NEVER`, must finish and exit, and calls the protected Meetha endpoint with `CRON_SECRET`. Railway skips an overlapping scheduled run, so do not turn cron services into long-running workers. [1]

The active `meetha-cron-lora`, `meetha-cron-archive`, and `meetha-cron-daily` services use `CRON_TARGET_URL=https://meetha.studio`; do not change `CRON_SECRET`. Do not configure or re-enable the welcome-email cron service.

## Railway variables

Keep secrets in Railway’s **Variables** panel only, never in GitHub source. The web service requires the active values for `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `FAL_API_KEY`, `OPENAI_API_KEY`, `SENTRY_DSN`, and `CRON_SECRET`. `SUPABASE_STORAGE_BUCKET` defaults to `meetha-assets` if omitted.

The browser bundle requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Logged-out membership checkout also requires `VITE_STRIPE_STARTER_LINK` and `VITE_STRIPE_STARTER_ANNUAL_LINK`. These are public client configuration values, not service-role credentials. The active cron services contain only `CRON_SECRET` as a reference to `Meetha.CRON_SECRET` and `CRON_TARGET_URL`.

## Supabase operations

Supabase Auth retains the existing user identities. The three approved canonical duplicate-email anchors are preserved in Auth app metadata as legacy IDs `10`, `14`, and `13`; do not delete, merge, or overwrite their underlying legacy user rows without a separate data-migration plan.

The private `meetha-assets` bucket contains the verified migrated persistent assets. The application keeps the existing `/manus-storage/*` route as a compatibility path and redirects to short-lived Supabase signed URLs. Railway has no Manus/Forge storage fallback. Do not make the bucket public. Back up database records before any bulk change to generation, profile-card, or asset references.

## OAuth, payments, email, and monitoring

Supabase Auth URL Configuration must include the active domain callback in the form `https://<domain>/auth/callback`. Keep both the current staging callback and `https://meetha.studio/auth/callback` until the old rollback path is retired. Google OAuth is configured through Supabase; the provider callback remains Supabase’s own callback URL.

The live Meetha Stripe endpoint is `https://meetha.studio/api/stripe/webhook`; preserve its configured event list and signing secret. Do not change the separate Soft60 webhook. Resend magic-link delivery was verified through Railway staging. Review Sentry in its provider dashboard after any release; do not intentionally trigger user-facing exceptions in production just to test it.

## Pre-cutover and rollback

The current live validation includes successful Railway HTTPS on both public domains, normal sign-in, private Supabase asset delivery, a successful live generation after adding `OPENAI_API_KEY`, and a successful LoRA cron run. Cloudflare DNS records are `@` → `9jshzjm8.up.railway.app` and `www` → `mehte4af.up.railway.app`, both set to DNS-only during Railway certificate management.

If the Railway production path fails, first diagnose the service’s port mapping: the Meetha custom domains must remain assigned to **port 8080**. Keep the Stripe webhook at the live Meetha URL unless a deliberate, tested rollback is planned. Disable only the three active Railway cron services if background work must be paused; leave the welcome-email service disabled. The database and Supabase assets are shared resources, so rollback does not require a data restore.

## Known non-blocking UX items

The migration did not alter product UX. Two follow-up items remain separate from portability work: desktop image save currently requires a second click, and the Share action was unavailable during staging acceptance while image save worked.

## References

[1]: https://docs.railway.com/cron-jobs "Railway Cron Jobs"
