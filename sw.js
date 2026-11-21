// Caches the app shell so it opens instantly and works offline.
// Bump CACHE when you change any file so phones pick up the update.
const CACHE = "shopping-v7";
const FILES = [
  "./",
  "index.html",
  "styles.css",
  "lists.css",
  "trip.css",
  "backup.css",
  "supermarkets.js",
  "logos/mercadona.png",
  "logos/carrefour.png",
  "logos/lidl.png",
  "logos/dia.png",
  "logos/aldi.png",
  "store.js",
  "lists.js",
  "trip.js",
  "backup.js",
  "app.js",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network first (so updates show up when online), fall back to cache offline.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("./")))
  );
});
