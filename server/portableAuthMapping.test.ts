import { describe, expect, it } from "vitest";
import { getMappedLegacyUserId } from "./_core/auth";

describe("portable auth legacy-user mappings", () => {
  it("accepts a positive integer mapping written by the server", () => {
    expect(getMappedLegacyUserId({ meetha_legacy_user_id: 14 })).toBe(14);
  });

  it("rejects absent, malformed, and non-positive mappings", () => {
    expect(getMappedLegacyUserId(null)).toBeNull();
    expect(getMappedLegacyUserId({ meetha_legacy_user_id: "14" })).toBeNull();
    expect(getMappedLegacyUserId({ meetha_legacy_user_id: 0 })).toBeNull();
    expect(getMappedLegacyUserId({ meetha_legacy_user_id: 14.5 })).toBeNull();
  });
});
