/**
 * saveOrShare — unified save/share helper.
 *
 * iOS Safari critical constraint:
 *   navigator.share() MUST be called synchronously within a user gesture (tap).
 *   Any await before navigator.share() causes iOS to drop the gesture context,
 *   making share() fail silently or fall through to the blob anchor path,
 *   which opens a blank tab with a download bar.
 *
 * Strategy:
 *  1. iOS Safari: call navigator.share({ url }) IMMEDIATELY (synchronous, no await).
 *     iOS share sheet appears instantly. User taps "Save Image" → Photos.
 *     The URL must be an absolute URL that iOS can fetch itself.
 *  2. Desktop / Android Chrome with file share support:
 *     fetch blob → navigator.share({ files: [file] })
 *  3. Everything else: blob anchor <a download> click
 */

/** Returns true when running on iOS (iPhone or iPad). */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iP(hone|ad|od)/.test(navigator.userAgent);
}

/** Returns true when the browser supports navigator.share (basic URL sharing). */
function canShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/** Returns true when the browser supports navigator.share with File objects. */
function canShareFiles(): boolean {
  if (!canShare()) return false;
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

/** Make a relative URL absolute using the current origin. */
function toAbsoluteUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Save or share an image blob from a server endpoint.
 * Called with the blob endpoint URL (e.g. /api/style-card/123 or /api/download/123).
 *
 * On iOS Safari: calls navigator.share({ url }) SYNCHRONOUSLY to preserve the
 * user gesture, which shows the native share sheet with "Save Image" → Photos.
 *
 * On desktop / Android: fetches the blob then uses navigator.share({ files })
 * or falls back to <a download>.
 */
export async function saveOrShareBlob(
  blobEndpoint: string,
  filename: string,
  _shareText?: string
): Promise<void> {
  // iOS Safari: share the URL immediately (synchronous) to preserve user gesture.
  // iOS will fetch the image itself and show "Save Image" in the share sheet.
  if (isIOS() && canShare()) {
    try {
      const absoluteUrl = toAbsoluteUrl(blobEndpoint);
      await navigator.share({
        url: absoluteUrl,
        title: filename,
      });
      return;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return; // User dismissed
      // Fall through to blob fetch approach
    }
  }

  // Desktop / Android: fetch blob then share as file or download
  let blob: Blob;
  try {
    const res = await fetch(blobEndpoint, { credentials: "include" });
    if (!res.ok) throw new Error(`Server fetch failed: ${res.status}`);
    blob = await res.blob();
  } catch (err) {
    throw err;
  }

  if (canShareFiles()) {
    try {
      const mimeType = blob.type || "image/jpeg";
      const file = new File([blob], filename, { type: mimeType });
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      // Fall through to blob anchor download
    }
  }

  blobAnchorDownload(blob, filename);
}

/**
 * Save or share an image from a permanent storage URL.
 * Same strategy as saveOrShareBlob.
 */
export async function saveOrShare(
  serverUrl: string,
  filename: string,
  _shareText?: string
): Promise<void> {
  return saveOrShareBlob(serverUrl, filename, _shareText);
}
