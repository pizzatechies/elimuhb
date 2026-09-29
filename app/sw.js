/* Elimuhub demo: keeps the whole app on the device so it opens instantly and works offline.
   VERSION is stamped by publish-web.sh; a new version replaces the old cache. */
const VERSION = "elimuhub-demo-15c3b383af35";
const FILES = [
  "./", "index.html", "app.css", "app.js", "data.js", "manifest.webmanifest",
  "img/elimuhub.svg", "img/pizza-emblem.png",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-192.png", "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png", "icons/badge-96.png", "icons/favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("elimuhub-demo-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.type === "basic") {
        const copy = res.clone();
        caches.open(VERSION).then((cache) => cache.put(req, copy));
      }
      return res;
    }).catch(() => (req.mode === "navigate" ? caches.match("index.html") : Response.error()))),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const scope = self.registration.scope;
      const win = wins.find((w) => w.url.startsWith(scope));
      return win ? win.focus() : self.clients.openWindow(scope);
    }),
  );
});
