const SHELL_CACHE = "zapsters-shell-v1";
const STATIC_CACHE = "zapsters-static-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        cache.addAll([OFFLINE_URL, "/offline-course.html", "/manifest.json"]),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.reduce((staleKeys, key) => {
            if (key !== SHELL_CACHE && key !== STATIC_CACHE && key !== "zapsters-course-content-v1") staleKeys.push(key);
            return staleKeys;
          }, []).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    if (new URL(request.url).pathname.startsWith("/offline/course/")) {
      event.respondWith(
        fetch(request).catch(() => caches.match("/offline-course.html")),
      );
      return;
    }
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  if (
    url.pathname.startsWith("/checkout") ||
    url.pathname.startsWith("/labs") ||
    url.pathname.startsWith("/judge") ||
    url.pathname.startsWith("/assessments")
  ) {
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/vs/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (!response.ok) return response;
          const copy = response.clone();
          void caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          return response;
        });
      }),
    );
  }
});
