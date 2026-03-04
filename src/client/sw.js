const CACHE_NAME = "ideaforge-v17";
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/app.js",
  "/styles/global.css",
  "/manifest.json",
];

// Install: cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for shell assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API requests: network only (don't cache dynamic data)
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // App shell: cache-first, fallback to network
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          // Update cache with fresh version
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached); // If network fails, fall through to cached

      return cached || fetchPromise;
    })
  );
});

// Handle offline capture queue sync
self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_QUEUE") {
    syncOfflineQueue();
  }
});

async function syncOfflineQueue() {
  // Read queue from IndexedDB or rely on client-side localStorage sync
  // The client handles this — the SW just needs to not block captures
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({ type: "TRIGGER_SYNC" });
  }
}
