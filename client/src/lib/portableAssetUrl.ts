/** Maps former Manus CloudFront media to the copied private-storage object route. */
export function portableAssetUrl(url: string): string {
  if (!url.includes("cloudfront.net/")) return url;
  const key = btoa(url).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `/manus-storage/external/${key}`;
}
