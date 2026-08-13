import { ENV } from "./_core/env";
import { getSupabase } from "./_core/supabase";

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function hasSupabaseStorage(): boolean {
  return Boolean(ENV.supabaseUrl && ENV.supabaseServiceRoleKey && ENV.supabaseStorageBucket);
}

function requireSupabaseBucket(): string {
  if (!hasSupabaseStorage()) {
    throw new Error("Private Supabase storage is not configured.");
  }
  return ENV.supabaseStorageBucket;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const { error } = await getSupabase().storage.from(requireSupabaseBucket()).upload(key, data, {
    contentType,
    upsert: false,
    cacheControl: "31536000",
  });
  if (error) {
    throw new Error(`Supabase storage upload failed: ${error.message}`);
  }
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  const { data, error } = await getSupabase().storage.from(requireSupabaseBucket()).createSignedUrl(key, 3600);
  if (error || !data?.signedUrl) {
    throw new Error(`Supabase storage signed URL failed: ${error?.message ?? "empty response"}`);
  }
  return data.signedUrl;
}
