import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

export const RAILWAY_CRON_JOBS = [
  "lora-check",
  "welcome-email",
  "archive-generations",
  "daily-monitor",
] as const;

export type RailwayCronJob = (typeof RAILWAY_CRON_JOBS)[number];

type CronEnvironment = {
  CRON_TARGET_URL?: string;
  CRON_SECRET?: string;
};

type FetchLike = typeof fetch;

export function isRailwayCronJob(value: string): value is RailwayCronJob {
  return (RAILWAY_CRON_JOBS as readonly string[]).includes(value);
}

export function resolveRequestedJob(args: string[]): RailwayCronJob | null {
  return args.find(isRailwayCronJob) ?? null;
}

/**
 * Invoke an existing protected scheduled endpoint, retrying explicit throttling only. The endpoint
 * retains all business logic and its own idempotency guarantees; this runner
 * only provides Railway with a short-lived process that terminates on return.
 */
export async function runCronJob(
  job: RailwayCronJob,
  env: CronEnvironment = process.env as CronEnvironment,
  fetcher: FetchLike = fetch,
): Promise<{ job: RailwayCronJob; status: number; body: string }> {
  const target = env.CRON_TARGET_URL?.trim();
  const secret = env.CRON_SECRET?.trim();
  if (!target) throw new Error("CRON_TARGET_URL is required");
  if (!secret) throw new Error("CRON_SECRET is required");

  const endpoint = new URL(`/api/scheduled/${job}`, target).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 110_000);

  try {
    // A shared deadline prevents retries from overlapping the next five-minute run.
    const deadline = Date.now() + 110_000;
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetcher(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "X-Railway-Cron-Job": job,
        },
        signal: controller.signal,
      });
      const body = await response.text();
      if (response.ok) return { job, status: response.status, body };
      const diagnosticHeaders = Object.fromEntries(
        ["server", "retry-after", "x-request-id", "x-railway-request-id"].flatMap(name => {
          const value = response.headers.get(name);
          return value ? [[name, value.replace(/[\r\n\x00-\x1f\x7f]/g, " ").slice(0, 160)]] : [];
        }),
      );
      // Response bodies can contain sensitive application data. Log only safe metadata.
      console.warn(JSON.stringify({ job, status: response.status, attempt: attempt + 1, headers: diagnosticHeaders }));
      const error = new Error(`${job} returned HTTP ${response.status}`);
      // Never replay ambiguous transport failures, auth failures or application errors.
      if (response.status !== 429 || attempt === 2) throw error;
      const retryAfter = response.headers.get("retry-after");
      const seconds = retryAfter && /^\d+(?:\.\d+)?$/.test(retryAfter.trim())
        ? Number(retryAfter) * 1000 : NaN;
      const dateDelay = retryAfter ? Date.parse(retryAfter) - Date.now() : NaN;
      const requestedDelay = Number.isFinite(seconds) ? seconds
        : Number.isFinite(dateDelay) ? Math.max(0, dateDelay) : 0;
      const delay = Math.max(requestedDelay, 2000 * 2 ** attempt) + Math.floor(Math.random() * 1000);
      // Respect long Retry-After values by failing, never retrying earlier than requested.
      if (delay + 1000 >= deadline - Date.now()) throw error;
      console.warn(JSON.stringify({ job, status: 429, attempt: attempt + 1, retryInMs: delay }));
      await sleep(delay, undefined, { signal: controller.signal });
    }
    throw new Error(`${job} exhausted retries`);

  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  // pnpm forwards script arguments as `node dist/cronRunner.js -- <job>`.
  // Select the first valid job name rather than treating the separator as input.
  const requestedJob = resolveRequestedJob(process.argv.slice(2)) ?? "";
  if (!isRailwayCronJob(requestedJob)) {
    throw new Error(`Usage: cron:run <${RAILWAY_CRON_JOBS.join("|")}>`);
  }
  const result = await runCronJob(requestedJob);
  console.log(JSON.stringify({ ok: true, ...result, completedAt: new Date().toISOString() }));
}

const invokedFile = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (import.meta.url === invokedFile) {
  main().catch((error) => {
    console.error("[RailwayCron]", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
