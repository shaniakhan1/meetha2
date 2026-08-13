import { describe, expect, it, vi } from "vitest";
import { runCronJob } from "./cronRunner";

describe("Railway cron runner", () => {
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
});
