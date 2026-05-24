import { describe, it, expect } from "vitest";

describe("Supabase env vars", () => {
  it("SUPABASE_URL is set and looks like a valid URL", () => {
    const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    expect(url).toBeDefined();
    expect(url).toMatch(/^https:\/\/.+\.supabase\.co$/);
  });

  it("SUPABASE_ANON_KEY is set and is a JWT", () => {
    const key = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
    expect(key).toBeDefined();
    // JWTs have 3 parts separated by dots
    expect(key!.split(".").length).toBe(3);
  });

  it("SUPABASE_SERVICE_ROLE_KEY is set and is a JWT", () => {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(key).toBeDefined();
    expect(key!.split(".").length).toBe(3);
  });
});
