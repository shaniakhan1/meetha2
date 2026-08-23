// Meetha Service Worker — minimal offline shell
const CACHE_NAME = "meetha-v2";
const OFFLINE_URLS = ["/", "/manifest.json"];

const LEGACY_IMAGE_FALLBACKS = {
  "editorial-01-window-4Ex7ySDHERfgQxSGrLgiqH.webp": "/manus-storage/meetha-59-v2_acb77051.jpg",
  "editorial-02-fullbody-cRGwTXz2gHjynX9ahHDVXB.webp": "/manus-storage/founder-photo_b6c41300.webp",
  "curvy-silhouette-test-T6AYZCEqwSqBi8tbjG4HV2.webp": "/manus-storage/homepage-after-white_6a966c1e.jpg",
  "editorial-03-restaurant-JxCbUv26xaboJFEWHABv6g.webp": "/manus-storage/meetha-gallery-restaurant_33c494d6.webp",
  "editorial-05-jewelry-E7PHF69YfVpDeTTDRyXXDd.webp": "/manus-storage/gallery_hands_coffee_b7861070.webp",
  "editorial-04-motion-PdCsKveuYL5VJ73Dzk4AZe.webp": "/manus-storage/gallery_street_lights_8c7a051f.jpg",
  "editorial-06-softlight-X9utC7yPfkFCBqUYhBXkqQ.webp": "/manus-storage/meetha-gallery-sofa_84cbf7ec.webp",
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  // A few landing-page images still point at Manus-era CloudFront URLs.
  // If those legacy URLs are requested, serve an owned Supabase-backed image instead.
  if (requestUrl.hostname === "d2xsxph8kpxj0f.cloudfront.net") {
    const filename = requestUrl.pathname.split("/").pop();
    const fallbackPath = filename ? LEGACY_IMAGE_FALLBACKS[filename] : undefined;
    if (fallbackPath) {
      event.respondWith(fetch(fallbackPath, { cache: "no-store" }));
      return;
    }
  }

  // Only cache GET requests for same-origin navigation.
  if (!event.request.url.startsWith(self.location.origin)) return;

  // For API calls, always go to network.
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful navigation responses.
        if (response.ok && event.request.mode === "navigate") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline fallback: serve cached shell.
        return caches.match("/") || new Response("Offline", { status: 503 });
      })
  );
});
