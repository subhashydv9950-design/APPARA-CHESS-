
const CACHE_NAME = "appara-chess-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./css/screens.css",
  "./css/chess-arena.css",
  "./css/3d-effects.css",
  "./css/responsive.css",
  "./js/app.js"
];

// ============================================
// INSTALL — CACHE MAIN APPLICATION FILES
// ============================================

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        for (const file of APP_SHELL) {
          try {
            await cache.add(file);
          } catch (error) {
            console.warn(
              "APPARA CHESS: Could not cache:",
              file,
              error
            );
          }
        }
      })
      .then(() => self.skipWaiting())
  );
});

// ============================================
// ACTIVATE — REMOVE OLD APP CACHES
// ============================================

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return (
                name.startsWith("appara-chess-") &&
                name !== CACHE_NAME
              );
            })
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// ============================================
// FETCH — NETWORK FIRST FOR APP FILES
// ============================================

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Do not intercept external services or APIs.
  if (url.origin !== self.location.origin) return;

  // Navigation requests: network first.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put("./index.html", copy);
            });
          }

          return response;
        })
        .catch(async () => {
          return (
            await caches.match("./index.html")
          ) || Response.error();
        })
    );

    return;
  }

  // Static assets: cache first, then network.
  event.respondWith(
    caches.match(request)
      .then(async (cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        const response = await fetch(request);

        if (response && response.ok) {
          const copy = response.clone();

          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, copy);
        }

        return response;
      })
      .catch(() => {
        return new Response(
          "APPARA CHESS resource is unavailable offline.",
          {
            status: 503,
            headers: {
              "Content-Type": "text/plain"
            }
          }
        );
      })
  );
});

// ============================================
// MESSAGE — SKIP WAITING
// ============================================

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ============================================
// APPARA CHESS — FILE 81 COMPLETE
// ============================================
