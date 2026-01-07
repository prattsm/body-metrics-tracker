const CACHE_NAME = "bmt-pwa-v21";
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
  event.waitUntil(handlePushEvent());
});

async function handlePushEvent() {
  const fallback = {
    title: "Body Metrics Tracker",
    body: "Time to log your weight.",
    url: "/",
    tag: "bmt-reminder",
  };
  try {
    const subscription = await self.registration.pushManager.getSubscription();
    if (!subscription) {
      await self.registration.showNotification(fallback.title, {
        body: fallback.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: fallback.url },
        tag: fallback.tag,
      });
      return;
    }
    const response = await fetch("/relay?path=/v1/push/pending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });
    if (!response.ok) {
      throw new Error(`Pending fetch failed: ${response.status}`);
    }
    const payload = await response.json();
    const messages = Array.isArray(payload.messages) ? payload.messages : [];
    if (!messages.length) {
      await self.registration.showNotification(fallback.title, {
        body: fallback.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        data: { url: fallback.url },
        tag: fallback.tag,
      });
      return;
    }
    await Promise.all(
      messages.map((message) =>
        self.registration.showNotification(message.title || fallback.title, {
          body: message.body || fallback.body,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          data: { url: message.url || fallback.url },
          tag: message.tag || fallback.tag,
        }),
      ),
    );
  } catch (_err) {
    await self.registration.showNotification(fallback.title, {
      body: fallback.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: fallback.url },
      tag: fallback.tag,
    });
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(self.clients.openWindow(url));
});
