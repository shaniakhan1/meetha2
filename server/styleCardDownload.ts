/**
 * GET /api/download/style-card
 *
 * Streams the authenticated user's Visual Identity style card image directly from S3,
 * bypassing the /manus-storage/ proxy which is rate-limited (429).
 */
import type { Request, Response } from "express";
import { authenticateRequest } from "./_core/auth";
import { getSupabase } from "./_core/supabase";
import { storageGetSignedUrl } from "./storage";

export async function handleStyleCardDownload(req: Request, res: Response) {
  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { data: profile, error } = await getSupabase()
    .from("profiles")
    .select("transformation_card_url")
    .eq("user_id", user.id)
    .single();

  if (error || !profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const cardUrl = (profile as { transformation_card_url: string | null }).transformation_card_url;
  if (!cardUrl) {
    return res.status(404).json({ error: "Style card not yet generated" });
  }

  let fetchUrl: string;
  try {
    if (cardUrl.startsWith("/manus-storage/")) {
      const key = cardUrl.replace("/manus-storage/", "");
      fetchUrl = await storageGetSignedUrl(key);
    } else if (cardUrl.startsWith("http")) {
      fetchUrl = cardUrl;
    } else {
      fetchUrl = await storageGetSignedUrl(cardUrl);
    }
  } catch (err) {
    console.error("[StyleCardDownload] Failed to get signed URL:", err);
    return res.status(502).json({ error: "Failed to resolve image URL" });
  }

  let imageBuffer: Buffer;
  try {
    const imageRes = await fetch(fetchUrl);
    if (!imageRes.ok) throw new Error(`Image fetch failed: ${imageRes.status}`);
    imageBuffer = Buffer.from(await imageRes.arrayBuffer());
  } catch (err) {
    console.error("[StyleCardDownload] Image fetch error:", err);
    return res.status(502).json({ error: "Failed to fetch image" });
  }

  const isJpeg = cardUrl.includes(".jpg") || cardUrl.includes(".jpeg");
  res.setHeader("Content-Type", isJpeg ? "image/jpeg" : "image/png");
  res.setHeader("Content-Disposition", `attachment; filename="meetha-style-card.jpg"`);
  res.setHeader("Content-Length", imageBuffer.length);
  res.setHeader("Cache-Control", "no-store");
  return res.send(imageBuffer);
}
