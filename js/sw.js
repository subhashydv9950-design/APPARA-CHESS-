/* =====================================
   APPARA CHESS — SERVICE WORKER
   PWA SUPPORT
===================================== */

const CACHE_NAME = "appara-chess-pwa-v1";
const APP_SCOPE = "/APPARA-CHESS-/";

/* INSTALL */
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.add(APP_SCOPE))
            .catch(() => {})
    );

    self.skipWaiting();
});

/* ACTIVATE */
self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            )
        )
    );

    self.clients.claim();
});

/* FETCH */
self.addEventListener("fetch", event => {

    const request = event.request;

    if (
        request.method !== "GET" ||
        new URL(request.url).origin !== self.location.origin
    ) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then(response => {

                if (response && response.ok) {
                    const copy = response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(request, copy));
                }

                return response;
            })
            .catch(() =>
                caches.match(request)
                    .then(cached =>
                        cached || caches.match(APP_SCOPE)
                    )
            )
    );
});
