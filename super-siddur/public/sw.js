/* The Super Siddur — service worker. Offline-first app shell. */
const CACHE = "siddur-v24";
const SHELL = [
  "/",
  "/index.html",
  "/css/app.css",
  "/js/textdata.js",
  "/js/05-hebcal.js",
  "/js/00-engine.js",
  "/js/10-data.js",
  "/js/20-logic.js",
  "/js/25-calendar.js",
  "/js/30-views.js",
  "/js/40-admin.js",
  "/js/45-audio.js",
  "/js/50-import.js",
  "/js/60-adminx.js",
  "/manifest.webmanifest",
  "/icons/icon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Live content + admin calls: always go to the network.
  if (url.pathname.startsWith("/api/")) return;
  // App shell + assets: cache-first, fall back to network and cache it.
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        }).catch(() => caches.match("/index.html")),
    ),
  );
});
