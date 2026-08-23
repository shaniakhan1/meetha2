// Meetha Service Worker — minimal offline shell
const CACHE_NAME = "meetha-v4";
const OFFLINE_URLS = ["/", "/manifest.json"];

const LEGACY_IMAGE_FALLBACKS = {
  "editorial-01-window-4Ex7ySDHERfgQxSGrLgiqH.webp": "/editorial/editorial-diverse-black.jpg",
  "editorial-02-fullbody-cRGwTXz2gHjynX9ahHDVXB.webp": "/editorial/editorial-diverse-street.jpg",
  "curvy-silhouette-test-T6AYZCEqwSqBi8tbjG4HV2.webp": "/editorial/editorial-diverse-curvy.jpg",
  "editorial-03-restaurant-JxCbUv26xaboJFEWHABv6g.webp": "/editorial/editorial-diverse-black.jpg",
  "editorial-05-jewelry-E7PHF69YfVpDeTTDRyXXDd.webp": "/editorial/meetha-diverse-editorial.webp",
  "editorial-04-motion-PdCsKveuYL5VJ73Dzk4AZe.webp": "/editorial/editorial-diverse-street.jpg",
  "editorial-06-softlight-X9utC7yPfkFCBqUYhBXkqQ.webp": "/editorial/editorial-diverse-curvy.jpg",
};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);

  if (requestUrl.hostname === "d2xsxph8kpxj0f.cloudfront.net") {
    const filename = requestUrl.pathname.split("/").pop();
    const fallbackPath = filename ? LEGACY_IMAGE_FALLBACKS[filename] : undefined;
    if (fallbackPath) {
      event.respondWith(fetch(fallbackPath, { cache: "no-store" }));
      return;
    }
  }

  if (!event.request.url.startsWith(self.location.origin)) return;
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.mode === "navigate") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match("/") || new Response("Offline", { status: 503 }))
  );
});
