/**
 * saveOrShare — unified save/share helper with strict mobile vs desktop split.
 *
 * MOBILE  (touch device OR narrow viewport):
 *   → Use navigator.share() with the file blob for native share sheet.
 *   → Falls back to anchor download if share is not supported.
 *
 * DESKTOP (macOS Safari, Chrome, Firefox, etc.):
 *   → NEVER use navigator.share() — it hangs on macOS Safari.
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
 * @param shareText  Optional caption for the mobile share sheet.
 */
export async function saveOrShare(
  serverUrl: string,
  filename: string,
  shareText?: string
): Promise<void> {
  const mobile = isMobileDevice();

  if (mobile) {
    // ── MOBILE: use native share sheet ──────────────────────────────────────
    try {
      const res = await fetch(serverUrl, { credentials: "include" });
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const blob = await res.blob();
      const mimeType = blob.type || (filename.endsWith(".png") ? "image/png" : "image/jpeg");
      const file = new File([blob], filename, { type: mimeType });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Meetha",
          text: shareText ?? "Styled by Meetha.",
        });
        return;
      }
    } catch (e: unknown) {
      // AbortError = user dismissed sheet — treat as success
      if (e instanceof Error && e.name === "AbortError") return;
      // Fall through to anchor download
    }

    // Mobile fallback: blob anchor download
    try {
      const res = await fetch(serverUrl, { credentials: "include" });
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
 * and then save/share it using the mobile/desktop split.
 *
 * Use this when the permanent URL is not available and you must fetch a blob first.
 * On desktop, still avoids navigator.share.
 */
export async function saveOrShareBlob(
  blobEndpoint: string,
  filename: string,
  shareText?: string
): Promise<void> {
  const mobile = isMobileDevice();

  const res = await fetch(blobEndpoint, { credentials: "include" });
  if (!res.ok) throw new Error(`Server fetch failed: ${res.status}`);
  const blob = await res.blob();

  if (mobile) {
    const mimeType = blob.type || (filename.endsWith(".png") ? "image/png" : "image/jpeg");
    const file = new File([blob], filename, { type: mimeType });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Meetha",
          text: shareText ?? "Styled by Meetha.",
        });
        return;
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") return;
        // Fall through to blob download
      }
    }
  }

  // Desktop AND mobile fallback: blob anchor download (no navigator.share on desktop)
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
}
