import multer from "multer";
import sharp from "sharp";
import { Request, Response } from "express";
import { storagePut } from "./storage";
import { authenticateRequest } from "./_core/auth";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    cb(null, allowed.includes(file.mimetype));
  },
});

export const beforePhotoUploadMiddleware = upload.single("file");

export async function handleBeforePhotoUpload(req: Request, res: Response) {
  try {
    const user = await authenticateRequest(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    // Convert to JPEG and resize to reasonable dimensions for the card
    const processed = await sharp(file.buffer)
      .rotate() // auto-orient from EXIF
      .resize(800, 1200, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const key = `before-photos/${user.id}/${Date.now()}.jpg`;
    const { url } = await storagePut(key, processed, "image/jpeg");

    return res.json({ url, key });
  } catch (err) {
    console.error("[BeforePhotoUpload] Error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
}
