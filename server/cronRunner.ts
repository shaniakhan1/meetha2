import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

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
 * Invoke one existing protected scheduled endpoint exactly once. The endpoint
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
    const response = await fetcher(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "X-Railway-Cron-Job": job,
      },
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`${job} returned HTTP ${response.status}: ${body.slice(0, 500)}`);
    }
    return { job, status: response.status, body };
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
