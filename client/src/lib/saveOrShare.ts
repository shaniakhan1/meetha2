/**
 * saveOrShare — unified save/share helper.
 *
 * Priority order for both functions:
 *
 *  1. Web Share API with File support available (feature-detected, not UA-sniffed)
 *     → navigator.share({ files }) — presents native OS share sheet.
 *       On iOS Safari this shows "Save Image" → goes directly to Photos.
 *       On Android Chrome this shows the native share sheet.
 *
 *  2. Blob anchor download (all other browsers)
 *     → Creates a temporary object URL and clicks a hidden <a download> link.
 *       Works on desktop Chrome, Firefox, desktop Safari, and any browser
 *       that does not support navigator.share with files.
 *
 * Detection: canShareFiles() probes navigator.canShare({ files: [...] }) with
 * a dummy 1-byte PNG. This is the only reliable cross-browser signal — no
 * user-agent strings are inspected anywhere in this file.
 */

/** Returns true when the browser supports navigator.share with File objects. */
function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return false;
  try {
    // Probe with a minimal valid file — browsers that don't support file sharing
    // will return false here without throwing.
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
  void shareText; // kept for API compatibility

  if (canShareFiles()) {
    // ── Path 1: Web Share API with file support ──────────────────────────────
    try {
      const res = await fetch(serverUrl, { credentials: "include" });
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      // AbortError = user dismissed the share sheet — not an error, just return.
      if (e instanceof Error && e.name === "AbortError") return;
      // Any other error: fall through to blob anchor download.
    }
  }

  // ── Path 2: Blob anchor download (desktop + non-sharing browsers) ────────
  try {
    const res = await fetch(serverUrl, { credentials: "include" });
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const blob = await res.blob();
    blobAnchorDownload(blob, filename);
  } catch {
    // Last resort: open in new tab
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
  void shareText; // kept for API compatibility

  const res = await fetch(blobEndpoint, { credentials: "include" });
  if (!res.ok) throw new Error(`Server fetch failed: ${res.status}`);
  const blob = await res.blob();

  if (canShareFiles()) {
    // ── Path 1: Web Share API with file support ──────────────────────────────
    try {
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      // AbortError = user dismissed — not an error.
      if (e instanceof Error && e.name === "AbortError") return;
      // Fall through to blob anchor download.
    }
  }

  // ── Path 2: Blob anchor download ─────────────────────────────────────────
  blobAnchorDownload(blob, filename);
}
