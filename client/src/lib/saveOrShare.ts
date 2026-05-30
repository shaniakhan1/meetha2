/**
 * saveOrShare — unified image save helper.
 *
 * Strategy:
 * - iOS (Safari + Chrome): fetch blob → return object URL for caller to show in full-screen overlay.
 *   The user long-presses the image to save. This is the only reliable path on iOS.
 * - Desktop / Android: trigger anchor download directly.
 *
 * navigator.share is intentionally NOT used — it breaks when the fetch async gap
 * consumes the iOS gesture context, causing silent failures on Safari.
 */

/** Detect any iOS device */
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/** Fallback: blob anchor download — works on desktop and Android */
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
 * Fetch an image from a server endpoint and either:
 * - iOS: return an object URL string for the caller to display in a full-screen overlay
 * - Desktop/Android: trigger a direct anchor download and return null
 *
 * Callers on iOS MUST show the returned URL in a full-screen <img> so the user
 * can long-press to save. Call URL.revokeObjectURL() when done.
 */
export async function fetchForSave(
  endpoint: string,
  filename: string
): Promise<string | null> {
  const res = await fetch(endpoint, { credentials: "include" });
  if (!res.ok) throw new Error(`Server fetch failed: ${res.status}`);
  const blob = await res.blob();

  if (isIOS()) {
    return URL.createObjectURL(blob);
  }

  // Desktop / Android: download directly
  blobAnchorDownload(blob, filename);
  return null;
}

/**
 * Legacy wrapper — kept for Profile.tsx compatibility.
 * On iOS this opens a new tab with the blob (long-press to save).
 * On desktop it triggers a download.
 */
export async function saveOrShareBlob(
  blobEndpoint: string,
  filename: string,
  _shareText?: string
): Promise<void> {
  const res = await fetch(blobEndpoint, { credentials: "include" });
  if (!res.ok) throw new Error(`Server fetch failed: ${res.status}`);
  const blob = await res.blob();

  if (isIOS()) {
    // Open in new tab — user long-presses image → Save to Photos
    const blobUrl = URL.createObjectURL(blob);
    const newTab = window.open(blobUrl, "_blank");
    if (!newTab) {
      // Popup blocked — fall back to anchor
      blobAnchorDownload(blob, filename);
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    return;
  }

  blobAnchorDownload(blob, filename);
}

/**
 * Convenience wrapper for saving from a permanent storage URL.
 */
export async function saveOrShare(
  serverUrl: string,
  filename: string,
  _shareText?: string
): Promise<void> {
  return saveOrShareBlob(serverUrl, filename, _shareText);
}
