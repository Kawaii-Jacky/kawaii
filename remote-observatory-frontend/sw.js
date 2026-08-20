const CACHE_NAME = "astra-shell-20260820-05";
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/app.css?v=20260820-05",
  "/app.js?v=20260820-05",
  "/observatory-3d.js?v=20260817-23",
  "/vendor/lucide/lucide.min.js",
  "/assets/pwa/icon.svg",
  "/assets/pwa/icon-192.png",
  "/assets/pwa/icon-512.png",
  "/assets/observatory-cutout-solid.webp",
  "/assets/models/observatory-web-v3.glb?v=20260817-1"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS)));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

function isProtectedRequest(request, url) {
  return request.method !== "GET" || url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/admin-api/");
}

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (isProtectedRequest(request, url)) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put("/index.html", copy));
      return response;
    }).catch(() => caches.match("/index.html")));
    return;
  }
  event.respondWith(fetch(request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    }
    return response;
  }).catch(() => caches.match(request)));
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
