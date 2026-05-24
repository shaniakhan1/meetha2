/**
 * Validates that the RESEND_API_KEY is configured and the Resend API is reachable.
 * Does NOT send a real email — just verifies the key by listing domains.
 */
import { describe, it, expect } from "vitest";
import { Resend } from "resend";

describe("Resend API key", () => {
  it("should have RESEND_API_KEY set", () => {
    expect(process.env.RESEND_API_KEY).toBeTruthy();
  });

  it("should be able to connect to Resend API and list domains", async () => {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.domains.list();
    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data?.data)).toBe(true);
  });
});
