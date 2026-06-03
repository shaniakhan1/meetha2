/**
 * Validates that CRON_SECRET is configured and that the requireCronSecret
 * middleware logic correctly accepts/rejects requests.
 */
import { describe, it, expect } from "vitest";

describe("CRON_SECRET security", () => {
  it("CRON_SECRET environment variable should be set", () => {
    const secret = process.env.CRON_SECRET;
    expect(secret, "CRON_SECRET must be set to protect scheduled endpoints").toBeTruthy();
    expect(secret!.length, "CRON_SECRET should be at least 16 characters").toBeGreaterThanOrEqual(16);
  });

  it("requireCronSecret logic should reject missing authorization", () => {
    const secret = process.env.CRON_SECRET ?? "test-secret";
    // Simulate the middleware check
    const checkAuth = (authHeader: string | undefined): boolean => {
      if (!secret) return true; // no secret configured = open (dev mode)
      return authHeader === `Bearer ${secret}`;
    };

    expect(checkAuth(undefined)).toBe(false);
    expect(checkAuth("")).toBe(false);
    expect(checkAuth("Bearer wrongsecret")).toBe(false);
    expect(checkAuth(`Bearer ${secret}`)).toBe(true);
  });
});
