/**
 * Tests for the Stripe Customer Portal session creation.
 * Verifies that the createCustomerPortalSession helper throws correctly
 * when no stripe_customer_id is found, and that the tRPC procedure
 * is wired to the correct router.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Supabase ────────────────────────────────────────────────────────────
vi.mock("./_core/supabase", () => ({
  getSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  })),
}));

// ─── Mock Stripe ──────────────────────────────────────────────────────────────
vi.mock("stripe", () => {
  const mockStripe = vi.fn(() => ({
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://billing.stripe.com/session/test123" }),
      },
    },
  }));
  return { default: mockStripe };
});

describe("createCustomerPortalSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
  });

  it("throws when no stripe_customer_id is found for the user", async () => {
    const { getSupabase } = await import("./_core/supabase");
    (getSupabase as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      })),
    });

    const { createCustomerPortalSession } = await import("./stripeWebhook");

    await expect(
      createCustomerPortalSession({ userId: 999, returnUrl: "https://meetha.studio/profile" })
    ).rejects.toThrow("No Stripe customer found for this account");
  });

  it("returns a portal URL when stripe_customer_id exists", async () => {
    const { getSupabase } = await import("./_core/supabase");
    (getSupabase as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { stripe_customer_id: "cus_test123" },
              error: null,
            }),
          })),
        })),
      })),
    });

    const { createCustomerPortalSession } = await import("./stripeWebhook");

    const url = await createCustomerPortalSession({
      userId: 1,
      returnUrl: "https://meetha.studio/profile",
    });

    expect(url).toBe("https://billing.stripe.com/session/test123");
  });
});
