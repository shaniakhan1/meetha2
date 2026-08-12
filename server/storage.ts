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

function getForgeConfig(): { forgeUrl: string; forgeKey: string } | null {
  if (!ENV.forgeApiUrl || !ENV.forgeApiKey) return null;
  return { forgeUrl: ENV.forgeApiUrl.replace(/\/+$/, ""), forgeKey: ENV.forgeApiKey };
}

async function forgePut(key: string, data: Buffer | Uint8Array | string, contentType: string): Promise<void> {
  const forge = getForgeConfig();
  if (!forge) throw new Error("No portable storage or Forge fallback is configured.");
  const presignUrl = new URL("v1/storage/presign/put", `${forge.forgeUrl}/`);
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, { headers: { Authorization: `Bearer ${forge.forgeKey}` } });
  if (!presignResp.ok) throw new Error(`Forge upload presign failed (${presignResp.status}).`);
  const { url } = await presignResp.json() as { url: string };
  const body = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data as any], { type: contentType });
  const uploadResp = await fetch(url, { method: "PUT", headers: { "Content-Type": contentType }, body });
  if (!uploadResp.ok) throw new Error(`Forge upload failed (${uploadResp.status}).`);
}

async function forgeSignedUrl(key: string): Promise<string> {
  const forge = getForgeConfig();
  if (!forge) throw new Error("No portable storage or Forge fallback is configured.");
  const getUrl = new URL("v1/storage/presign/get", `${forge.forgeUrl}/`);
  getUrl.searchParams.set("path", key);
  const resp = await fetch(getUrl, { headers: { Authorization: `Bearer ${forge.forgeKey}` } });
  if (!resp.ok) throw new Error(`Forge download presign failed (${resp.status}).`);
  const { url } = await resp.json() as { url: string };
  if (!url) throw new Error("Forge returned an empty signed URL.");
  return url;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  if (hasSupabaseStorage()) {
    const { error } = await getSupabase().storage.from(ENV.supabaseStorageBucket).upload(key, data, {
      contentType,
      upsert: false,
      cacheControl: "31536000",
    });
    if (!error) return { key, url: `/manus-storage/${key}` };
    if (!getForgeConfig()) throw new Error(`Supabase storage upload failed: ${error.message}`);
    console.warn(`[Storage] Supabase upload failed for ${key}; using Forge fallback: ${error.message}`);
  }
  await forgePut(key, data, contentType);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  if (hasSupabaseStorage()) {
    const { data, error } = await getSupabase().storage.from(ENV.supabaseStorageBucket).createSignedUrl(key, 3600);
    if (!error && data?.signedUrl) return data.signedUrl;
    if (!getForgeConfig()) throw new Error(`Supabase storage signed URL failed: ${error?.message ?? "empty response"}`);
    console.warn(`[Storage] Supabase signed URL failed for ${key}; using Forge fallback: ${error?.message ?? "empty response"}`);
  }
  return forgeSignedUrl(key);
}
