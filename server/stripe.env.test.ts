import { describe, it, expect } from "vitest";

describe("Stripe environment variables", () => {
  it("VITE_STRIPE_STARTER_LINK is set and is a valid Stripe URL", () => {
    const link = process.env.VITE_STRIPE_STARTER_LINK;
    expect(link).toBeTruthy();
    expect(link).toMatch(/^https:\/\/buy\.stripe\.com\//);
  });

  it("VITE_STRIPE_PRO_LINK is set and is a valid Stripe URL", () => {
    const link = process.env.VITE_STRIPE_PRO_LINK;
    expect(link).toBeTruthy();
    expect(link).toMatch(/^https:\/\/buy\.stripe\.com\//);
  });
});
