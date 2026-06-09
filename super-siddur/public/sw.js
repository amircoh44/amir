/* The Super Siddur — service worker: SELF-DESTRUCT.
   The offline cache caused stale/mixed bundles during active development.
   This version deletes all caches, unregisters itself, and reloads open tabs,
   so the app always loads fresh from the server. (Re-introduce real offline
   caching later once the app has stabilised.) */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
    try {
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((c) => c.navigate(c.url));
    } catch (_) {}
  })());
});

/* Pass everything straight to the network — no caching. */
self.addEventListener("fetch", () => {});
