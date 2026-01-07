const CACHE_NAME = "bmt-pwa-v13";
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/app.js",
  "/manifest.webmanifest",
  "/icons/icon-180.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isGET = req.method === "GET";

  if (!isGET || !sameOrigin) {
    return;
  }

  const isAppShell =
    url.pathname === "/" ||
    url.pathname === "/index.html" ||
    url.pathname === "/app.js" ||
    url.pathname === "/manifest.webmanifest";

  if (isAppShell) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return response;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req)),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (err) {
      data = { body: event.data.text() };
    }
  }
  const title = data.title || "Body Metrics Tracker";
  const body = data.body || "Time to log your weight.";
  const url = data.url || "/";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url },
      tag: data.tag || "bmt-reminder",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(self.clients.openWindow(url));
});
