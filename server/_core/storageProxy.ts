import type { Express } from "express";
import { ENV } from "./env";
import { getSupabase } from "./supabase";

function contentTypeForKey(key: string): string {
  const ext = key.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "application/octet-stream";
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) return res.status(400).send("Missing storage key");

    try {
      const bucket = ENV.supabaseStorageBucket || "meetha-assets";
      const { data, error } = await getSupabase().storage.from(bucket).download(key);

      if (error || !data) {
        console.error(`[StorageProxy] download failed for ${key}:`, error?.message ?? "empty response");
        return res.status(404).send("Asset not found");
      }

      const buffer = Buffer.from(await data.arrayBuffer());
      res.set("Content-Type", data.type || contentTypeForKey(key));
      res.set("Content-Length", String(buffer.length));
      res.set("Cache-Control", "private, max-age=300");
      return res.status(200).send(buffer);
    } catch (error) {
      console.error("[StorageProxy] failed:", error);
      return res.status(502).send("Storage backend error");
    }
  });
}
