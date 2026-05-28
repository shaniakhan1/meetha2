/**
 * saveOrShare — unified save/share helper with strict mobile vs desktop split.
 *
 * MOBILE  (touch device OR narrow viewport):
 *   → Use blob anchor download — saves directly to Photos on iOS Safari.
 *   → navigator.share() is intentionally NOT used: it routes to Files, not Photos.
 *
 * DESKTOP (macOS Safari, Chrome, Firefox, etc.):
 *   → Use a direct anchor download with the permanent server URL.
 *   → Also open in a new tab as a Safari fallback.
 */

/** Returns true when we are confident the user is on a touch/mobile device. */
function isMobileDevice(): boolean {
  // Prefer pointer media query — most reliable cross-browser signal
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 768;
  return coarse || narrow;
}

/**
 * Save or share an image.
 *
 * @param serverUrl  A permanent server URL (e.g. /manus-storage/...) — used directly on desktop.
 * @param filename   Suggested filename for the download.
 * @param shareText  Optional caption (unused — kept for API compatibility).
 */
export async function saveOrShare(
  serverUrl: string,
  filename: string,
  shareText?: string
): Promise<void> {
  void shareText; // kept for API compatibility

  if (isMobileDevice()) {
    // ── MOBILE: blob anchor download — saves to Photos on iOS Safari ──────────
    try {
      const res = await fetch(serverUrl, { credentials: "include" });
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    } catch {
      // Last resort
      window.open(serverUrl, "_blank");
    }
  } else {
    // ── DESKTOP: direct anchor download — never use navigator.share ─────────
    // Use the permanent server URL directly so Safari doesn't hang on blobs.
    const a = document.createElement("a");
    a.href = serverUrl;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Safari desktop sometimes ignores the anchor click for cross-origin-ish URLs.
    // Open in new tab as a reliable fallback.
    setTimeout(() => {
      window.open(serverUrl, "_blank", "noopener");
    }, 300);
  }
}

/**
 * Convenience wrapper: fetch a server blob endpoint (e.g. /api/style-card/:id)
 * and then save it using the mobile/desktop split.
 *
 * On mobile: blob anchor download → saves directly to Photos on iOS Safari.
 * On desktop: blob anchor download (no navigator.share).
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

  // Blob anchor download on all devices — saves to Photos on iOS, Downloads on desktop
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
}
