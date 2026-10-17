const CACHE_NAME = "phase2-pwa-v3";
const OFFLINE_FALLBACK = "./index.html";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.png",
  "./schedule.pdf"
];

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        CORE_ASSETS.map((url) => cache.add(url))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResp) => {
          const copy = networkResp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return networkResp;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(event.request)) || (await cache.match(OFFLINE_FALLBACK));
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResp) => {
      if (cachedResp) return cachedResp;
      return fetch(event.request).then((networkResp) => {
        if (networkResp && networkResp.status === 200 && networkResp.type === "basic") {
          const copy = networkResp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResp;
      });
    })
  );
});
