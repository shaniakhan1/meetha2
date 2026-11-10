import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveRequestedJob, runCronJob } from "./cronRunner";

vi.mock("node:timers/promises", () => ({ setTimeout: vi.fn().mockResolvedValue(undefined) }));
import { setTimeout as sleep } from "node:timers/promises";

const env = { CRON_TARGET_URL: "https://meetha.studio", CRON_SECRET: "test-secret" };

describe("Railway cron runner", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retries 429 with Retry-After and unchanged authentication", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response("rate limited", { status: 429, headers: { "Retry-After": "5" } }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    expect((await runCronJob("lora-check", env, fetcher)).status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0][1].headers).toEqual(fetcher.mock.calls[1][1].headers);
    expect(vi.mocked(sleep).mock.calls[0][0]).toBeGreaterThanOrEqual(5000);
  });

  it("exhausts at three attempts and fails instead of hiding persistent throttling", async () => {
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(new Response("rate limited", { status: 429 })));
    await expect(runCronJob("lora-check", env, fetcher)).rejects.toThrow("HTTP 429");
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("does not shorten Retry-After beyond its execution budget", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("rate limited", { status: 429, headers: { "Retry-After": "180" } }));
    await expect(runCronJob("lora-check", env, fetcher)).rejects.toThrow("HTTP 429");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("honors HTTP-date Retry-After", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response("rate limited", { status: 429, headers: { "Retry-After": new Date(Date.now() + 20000).toUTCString() } }))
      .mockResolvedValueOnce(new Response("ok"));
    await runCronJob("lora-check", env, fetcher);
    expect(vi.mocked(sleep).mock.calls[0][0]).toBeGreaterThan(18000);
  });

  it("does not replay network failures or server errors", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("connection lost"));
    await expect(runCronJob("lora-check", env, fetcher)).rejects.toThrow("connection lost");
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockReset().mockResolvedValue(new Response("failed", { status: 500 }));
    await expect(runCronJob("lora-check", env, fetcher)).rejects.toThrow("HTTP 500");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("calls one protected scheduled endpoint and returns after a successful response", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"ok":true}', { status: 200 }));
    const result = await runCronJob(
      "lora-check",
      { CRON_TARGET_URL: "http://meetha.railway.internal", CRON_SECRET: "test-secret" },
      fetcher,
    );

    expect(result).toEqual({ job: "lora-check", status: 200, body: '{"ok":true}' });
    expect(fetcher).toHaveBeenCalledWith(
      "http://meetha.railway.internal/api/scheduled/lora-check",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer test-secret" }),
      }),
    );
  });

  it("fails cleanly when the protected endpoint rejects the run", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    await expect(runCronJob(
      "daily-monitor",
      { CRON_TARGET_URL: "http://meetha.railway.internal", CRON_SECRET: "test-secret" },
      fetcher,
    )).rejects.toThrow("daily-monitor returned HTTP 401");
  });

  it("accepts pnpm's separator before the scheduled job argument", () => {
    expect(resolveRequestedJob(["--", "lora-check"])).toBe("lora-check");
    expect(resolveRequestedJob(["unexpected", "daily-monitor"])).toBe("daily-monitor");
    expect(resolveRequestedJob(["--"])).toBeNull();
  });
});
