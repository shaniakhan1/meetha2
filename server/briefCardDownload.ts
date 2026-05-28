/**
 * GET /api/download/brief-card
 *
 * Streams the authenticated user's identity brief card image directly from S3,
 * bypassing the /manus-storage/ proxy which is rate-limited (429).
 *
 * The server uses service-level credentials to get a fresh signed URL,
 * fetches the bytes, and pipes them to the client as image/png.
 */
import type { Request, Response } from "express";
import { authenticateRequest } from "./_core/auth";
import { getSupabase } from "./_core/supabase";
import { storageGetSignedUrl } from "./storage";

export async function handleBriefCardDownload(req: Request, res: Response) {
  // Authenticate
  const user = await authenticateRequest(req);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Fetch the user's identity_brief_card_url from Supabase
  const { data: profile, error } = await getSupabase()
    .from("profiles")
    .select("identity_brief_card_url")
    .eq("user_id", user.id)
    .single();

  if (error || !profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const cardUrl = (profile as { identity_brief_card_url: string | null }).identity_brief_card_url;
  if (!cardUrl) {
    return res.status(404).json({ error: "Identity brief card not yet generated" });
  }

  // Resolve the actual S3 URL using service credentials (bypasses proxy rate limit)
  let fetchUrl: string;
  try {
    if (cardUrl.startsWith("/manus-storage/")) {
      const key = cardUrl.replace("/manus-storage/", "");
      fetchUrl = await storageGetSignedUrl(key);
    } else if (cardUrl.startsWith("http")) {
      fetchUrl = cardUrl;
    } else {
      // Bare key
      fetchUrl = await storageGetSignedUrl(cardUrl);
    }
  } catch (err) {
    console.error("[BriefCardDownload] Failed to get signed URL:", err);
    return res.status(502).json({ error: "Failed to resolve image URL" });
  }

  // Fetch the image bytes server-side
  let imageBuffer: Buffer;
  try {
    const imageRes = await fetch(fetchUrl);
    if (!imageRes.ok) throw new Error(`Image fetch failed: ${imageRes.status}`);
    const arrayBuffer = await imageRes.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);
  } catch (err) {
    console.error("[BriefCardDownload] Image fetch error:", err);
    return res.status(502).json({ error: "Failed to fetch image" });
  }

  // Stream image to client with download headers
  res.setHeader("Content-Type", "image/png");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="meetha-identity-brief.png"`
  );
  res.setHeader("Content-Length", imageBuffer.length);
  res.setHeader("Cache-Control", "no-store");
  return res.send(imageBuffer);
}
