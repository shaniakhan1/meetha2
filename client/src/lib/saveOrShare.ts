/**
 * saveOrShare — unified save/share helper for iOS Safari, Chrome iOS, and desktop.
 *
 * Browser matrix:
 *
 * iOS Safari:
 *   - navigator.share({ files: [imageFile] }) works and shows "Save Image" in share sheet
 *   - Must call navigator.share directly from the async function triggered by the tap
 *
 * Chrome on iOS:
 *   - navigator.share({ files }) routes to app share targets (Instagram, etc.) NOT system Photos
 *   - Best approach: open blob URL in new tab → user long-presses image → "Save to Photos"
 *   - This is the standard Chrome iOS save flow
 *
 * Desktop / Android Chrome:
 *   - <a download> blob anchor click works reliably
 */

/** Detect iOS Safari (not Chrome/Firefox on iOS) */
function isIOSSafari(): boolean {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIOS && isSafari;
}

/** Detect Chrome on iOS (CriOS) */
function isChromeiOS(): boolean {
  return /CriOS/.test(navigator.userAgent);
}

/** Returns true when the browser supports navigator.share with File objects (iOS Safari only) */
function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  if (typeof navigator.canShare !== "function") return false;
  // Only use file sharing on iOS Safari — Chrome iOS routes to app targets instead of Photos
  if (!isIOSSafari()) return false;
  try {
    const probe = new File([new Uint8Array(1)], "probe.jpg", { type: "image/jpeg" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

/** Open blob URL in new tab — Chrome iOS: user long-presses image to "Save to Photos" */
function openBlobInNewTab(blob: Blob): void {
  const blobUrl = URL.createObjectURL(blob);
  const newTab = window.open(blobUrl, "_blank");
  if (!newTab) {
    // Popup blocked — fall back to anchor download
    const a = document.createElement("a");
    a.href = blobUrl;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
}

/** Fallback: blob anchor download — works on desktop */
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

  // Chrome on iOS: open in new tab so user can long-press → Save to Photos
  if (isChromeiOS()) {
    openBlobInNewTab(blob);
    return;
  }

  // iOS Safari: use navigator.share({ files }) which shows "Save Image" in share sheet
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

  // Desktop + everything else: blob anchor download
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
