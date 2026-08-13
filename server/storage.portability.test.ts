import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  createSignedUrl: vi.fn(),
}));

vi.mock("./_core/env", () => ({
  ENV: {
    supabaseUrl: "https://example.supabase.co",
    supabaseServiceRoleKey: "service-role",
    supabaseStorageBucket: "meetha-assets",
  },
}));

vi.mock("./_core/supabase", () => ({
  getSupabase: () => ({
    storage: {
      from: () => ({
        upload: mocks.upload,
        createSignedUrl: mocks.createSignedUrl,
      }),
    },
  }),
}));

import { storageGetSignedUrl, storagePut } from "./storage";

describe("portable storage", () => {
  beforeEach(() => {
    mocks.upload.mockReset();
    mocks.createSignedUrl.mockReset();
  });

  it("uploads only to the configured private Supabase bucket", async () => {
    mocks.upload.mockResolvedValue({ error: null });

    const result = await storagePut("generated/example.jpg", Buffer.from("image"), "image/jpeg");

    expect(mocks.upload).toHaveBeenCalledWith(
      expect.stringMatching(/^generated\/example_[a-f0-9]{8}\.jpg$/),
      expect.any(Buffer),
      expect.objectContaining({ contentType: "image/jpeg", upsert: false }),
    );
    expect(result.url).toMatch(/^\/manus-storage\/generated\/example_[a-f0-9]{8}\.jpg$/);
  });

  it("fails safely when a Supabase upload fails rather than using a legacy fallback", async () => {
    mocks.upload.mockResolvedValue({ error: { message: "access denied" } });

    await expect(storagePut("generated/example.jpg", Buffer.from("image"), "image/jpeg"))
      .rejects.toThrow("Supabase storage upload failed: access denied");
  });

  it("fails safely when a Supabase signed URL cannot be created", async () => {
    mocks.createSignedUrl.mockResolvedValue({ data: null, error: { message: "not found" } });

    await expect(storageGetSignedUrl("generated/missing.jpg"))
      .rejects.toThrow("Supabase storage signed URL failed: not found");
  });
});
