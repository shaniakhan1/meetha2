/**
 * Tests for the referral router procedures.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/trpc";

// Mock db module
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getOrCreateReferralCode: vi.fn().mockResolvedValue("TESTCODE"),
    getReferralsByUser: vi.fn().mockResolvedValue([
      { id: 1, referrer_user_id: 42, referred_email: "a@b.com", referred_user_id: 99, completed: true, created_at: new Date().toISOString(), completed_at: new Date().toISOString() },
      { id: 2, referrer_user_id: 42, referred_email: "c@d.com", referred_user_id: null, completed: false, created_at: new Date().toISOString(), completed_at: null },
    ]),
    getUserByReferralCode: vi.fn().mockImplementation(async (code: string) => {
      if (code === "TESTCODE") return { id: 42, name: "Alice", email: "alice@example.com" };
      return null;
    }),
  };
});

function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: {
      id: 42,
      open_id: "supabase-uid-42",
      email: "alice@example.com",
      name: "Alice",
      role: "user",
      created_at: new Date().toISOString(),
      login_method: "magic_link",
    },
    req: {} as never,
    res: {
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as never,
    ...overrides,
  };
}

describe("referral.getLink", () => {
  it("returns referral code, completed count, and total", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.referral.getLink();

    expect(result.code).toBe("TESTCODE");
    expect(result.completed).toBe(1);
    expect(result.total).toBe(2);
  });
});

describe("referral.getReferrer", () => {
  it("returns referrer name for a valid code", async () => {
    const caller = appRouter.createCaller(makeCtx({ user: undefined as never }));
    const result = await caller.referral.getReferrer({ code: "TESTCODE" });

    expect(result).not.toBeNull();
    expect(result?.name).toBe("Alice");
  });

  it("returns null for an unknown code", async () => {
    const caller = appRouter.createCaller(makeCtx({ user: undefined as never }));
    const result = await caller.referral.getReferrer({ code: "BADCODE" });

    expect(result).toBeNull();
  });
});
