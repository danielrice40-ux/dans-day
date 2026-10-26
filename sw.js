/* sw.js — the service worker. It saves a copy of the app on the device so the
 * app opens instantly and still works with no signal.
 *
 * How it works, in short:
 *   1. install  - download the files listed in FILES and store them in a cache
 *   2. fetch    - answer requests from that cache first, then the network
 *   3. activate - delete caches from older versions of the app
 *
 * When you change any app file, bump CACHE_VERSION below (e.g. v2 -> v3) so
 * phones pick up the new files instead of the old cached ones.
 */

const CACHE_VERSION = 'dans-day-v1';

// Everything the app needs to open offline.
const FILES = [
  './',
  './index.html',
  './css/styles.css',
  './js/storage.js',
  './js/today.js',
  './js/shopping.js',
  './js/calendar.js',
  './js/app.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

// 1. Install: fetch and save the app files.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(FILES))
      .then(() => self.skipWaiting()) // start using this version right away
  );
});

// 3. Activate: throw away caches from previous versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((name) => name !== CACHE_VERSION).map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim()) // control open tabs immediately
  );
});

// 2. Fetch: cache first, network as a fallback.
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only handle simple page/file loads from this app; leave anything else alone.
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Keep a copy of anything new that loads successfully.
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          // Offline and not cached: for a page load, show the app shell anyway.
          if (request.mode === 'navigate') return caches.match('./index.html');
          return Response.error();
        });
    })
  );
});
