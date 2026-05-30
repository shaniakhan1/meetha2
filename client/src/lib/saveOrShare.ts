/**
 * saveOrShare — unified save/share helper.
 *
 * iOS Safari behaviour:
 *   - navigator.share({ files: [file] }) opens the native share sheet.
 *     The sheet shows "Save Image" as an option which saves directly to Photos.
 *   - window.open(url) opens a blank tab with a download bar — requires extra taps.
 *   - The correct iOS approach is: fetch blob → create File → navigator.share({ files })
 *
 * Priority order:
 *  1. Any browser with Web Share API + File support (iOS Safari, Android Chrome)
 *     → fetch blob → navigator.share({ files: [file] })
 *  2. Desktop + everything else → blob anchor <a download> click
 */

/** Returns true when running on iOS (iPhone or iPad). */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iP(hone|ad|od)/.test(navigator.userAgent);
}

/** Returns true when the browser supports navigator.share with File objects. */
function canShareFiles(): boolean {
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
 */
export async function saveOrShare(
  serverUrl: string,
  filename: string,
  _shareText?: string
): Promise<void> {
  // Fetch the blob first (works for both iOS and desktop)
  let blob: Blob;
  try {
    const res = await fetch(serverUrl, { credentials: "include" });
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    blob = await res.blob();
  } catch {
    // If fetch fails, open in new tab as last resort
    window.open(serverUrl, "_blank");
    return;
  }

  if (canShareFiles()) {
    // iOS Safari + Android Chrome: share sheet with "Save Image" option
    try {
      const mimeType = blob.type || "image/jpeg";
      const file = new File([blob], filename, { type: mimeType });
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return; // User dismissed share sheet
      // Fall through to blob anchor download
    }
  }

  // Desktop + fallback
  blobAnchorDownload(blob, filename);
}

/**
 * Convenience wrapper: fetch a server blob endpoint (e.g. /api/style-card/:id)
 * and then save/share the result.
 *
 * @param blobEndpoint  Server endpoint that returns the image blob.
 * @param filename      Suggested filename for the download.
 */
export async function saveOrShareBlob(
  blobEndpoint: string,
  filename: string,
  _shareText?: string
): Promise<void> {
  // Fetch the blob from the server endpoint
  let blob: Blob;
  try {
    const res = await fetch(blobEndpoint, { credentials: "include" });
    if (!res.ok) throw new Error(`Server fetch failed: ${res.status}`);
    blob = await res.blob();
  } catch (err) {
    throw err; // Let caller handle fetch errors
  }

  if (canShareFiles()) {
    // iOS Safari + Android Chrome: share sheet with "Save Image" option
    try {
      const mimeType = blob.type || "image/jpeg";
      const file = new File([blob], filename, { type: mimeType });
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return; // User dismissed share sheet
      // Fall through to blob anchor download
    }
  }

  // Desktop + fallback
  blobAnchorDownload(blob, filename);
}
