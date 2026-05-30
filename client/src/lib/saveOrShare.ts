/**
 * saveOrShare — unified save/share helper.
 *
 * iOS Safari strategy:
 *   - navigator.share({ url }) shows the browser share sheet WITHOUT "Save Image"
 *     because iOS treats it as a link, not an image file.
 *   - navigator.share({ files: [imageFile] }) shows "Save Image" in the share sheet.
 *   - iOS Safari DOES allow navigator.share({ files }) after an async fetch,
 *     as long as the fetch completes within ~1 second and the share call
 *     is made directly inside the same async function that was triggered by the tap.
 *   - The key: the async function itself must be called synchronously from the tap handler.
 *     Do NOT wrap in setTimeout or detach from the call stack.
 *
 * Priority order:
 *  1. Any browser with Web Share API + File support (iOS Safari, Android Chrome)
 *     → fetch blob → navigator.share({ files: [imageFile] }) → "Save Image" appears
 *  2. Desktop + everything else → blob anchor <a download> click
 */

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
 * Save or share an image blob from a server endpoint.
 * On iOS Safari: fetches the blob then calls navigator.share({ files }) which
 * shows "Save Image" in the native share sheet.
 *
 * IMPORTANT: This function must be called directly from a tap/click handler
 * (not inside setTimeout or detached from the gesture call stack).
 */
export async function saveOrShareBlob(
  blobEndpoint: string,
  filename: string,
  _shareText?: string
): Promise<void> {
  // Fetch the blob from the server
  let blob: Blob;
  try {
    const res = await fetch(blobEndpoint, { credentials: "include" });
    if (!res.ok) throw new Error(`Server fetch failed: ${res.status}`);
    blob = await res.blob();
  } catch (err) {
    throw err;
  }

  // Use navigator.share with the actual file — this shows "Save Image" on iOS
  if (canShareFiles()) {
    try {
      const mimeType = blob.type || "image/jpeg";
      const file = new File([blob], filename, { type: mimeType });
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return; // User dismissed
      // Fall through to blob anchor download
    }
  }

  // Desktop + fallback
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
