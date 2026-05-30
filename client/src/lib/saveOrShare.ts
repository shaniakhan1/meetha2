/**
 * saveOrShare — unified save/share helper.
 *
 * iOS Safari behaviour notes:
 *   - navigator.share({ files }) opens the native share sheet.
 *     The sheet shows "Save to Files" as a prominent option and "Save Image"
 *     as a secondary one — users often tap "Save to Files" first by mistake.
 *   - The ONLY reliable way to trigger "Save Image → Photos" directly on iOS
 *     is to open the image in a new tab (window.open). iOS Safari shows a
 *     long-press / download button that saves to Photos.
 *   - On Android Chrome, navigator.share({ files }) works well and opens the
 *     native share sheet with "Save image" as the first option.
 *
 * Priority order:
 *  1. Android + Web Share API with File support → navigator.share({ files })
 *  2. iOS Safari → open image in new tab (user taps the download/share icon → Photos)
 *  3. Desktop + everything else → blob anchor <a download> click
 */

/** Returns true when running on iOS (iPhone or iPad). */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iP(hone|ad|od)/.test(navigator.userAgent);
}

/** Returns true when the browser supports navigator.share with File objects (non-iOS). */
function canShareFiles(): boolean {
  if (isIOS()) return false; // Skip share API on iOS — it routes to Files, not Photos
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return false;
  try {
    const probe = new File([new Uint8Array(1)], "probe.jpg", { type: "image/jpeg" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/** Fallback: blob anchor download — works on desktop and non-sharing mobile browsers. */
function blobAnchorDownload(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
}

/**
 * Save or share an image from a permanent server URL.
 *
 * @param serverUrl  A permanent server URL (e.g. /manus-storage/...).
 * @param filename   Suggested filename for the download.
 * @param shareText  Optional caption (unused — kept for API compatibility).
 */
export async function saveOrShare(
  serverUrl: string,
  filename: string,
  shareText?: string
): Promise<void> {
  void shareText;

  // ── iOS: open in new tab so user can save to Photos via the share icon ──────
  if (isIOS()) {
    window.open(serverUrl, "_blank");
    return;
  }

  if (canShareFiles()) {
    // ── Android / desktop with Web Share API ────────────────────────────────
    try {
      const res = await fetch(serverUrl, { credentials: "include" });
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      // Fall through to blob anchor download
    }
  }

  // ── Desktop + fallback: blob anchor download ─────────────────────────────
  try {
    const res = await fetch(serverUrl, { credentials: "include" });
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const blob = await res.blob();
    blobAnchorDownload(blob, filename);
  } catch {
    window.open(serverUrl, "_blank");
  }
}

/**
 * Convenience wrapper: fetch a server blob endpoint (e.g. /api/style-card/:id)
 * and then save/share the result.
 *
 * @param blobEndpoint  Server endpoint that returns the image blob.
 * @param filename      Suggested filename for the download.
 * @param shareText     Optional caption (unused — kept for API compatibility).
 */
export async function saveOrShareBlob(
  blobEndpoint: string,
  filename: string,
  shareText?: string
): Promise<void> {
  void shareText;

  // ── iOS: open the blob endpoint in a new tab → user saves to Photos ────────
  if (isIOS()) {
    window.open(blobEndpoint, "_blank");
    return;
  }

  const res = await fetch(blobEndpoint, { credentials: "include" });
  if (!res.ok) throw new Error(`Server fetch failed: ${res.status}`);
  const blob = await res.blob();

  if (canShareFiles()) {
    // ── Android / desktop with Web Share API ────────────────────────────────
    try {
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      // Fall through to blob anchor download
    }
  }

  // ── Desktop + fallback ───────────────────────────────────────────────────
  blobAnchorDownload(blob, filename);
}
