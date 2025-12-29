const CACHE_NAME = 'nerdiversary-v31';
const ASSETS = [
  './',
  './index.html',
  './results.html',
  './css/style.css',
  './js/milestones.js',
  './js/calculator.js',
  './js/nerdiversary.js',
  './js/ical.js',
  './js/main.js',
  './js/results.js',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './favicon.ico'
];

// Install - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches and take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - network-first for HTML/JS, cache-first for assets
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and external URLs
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  const url = new URL(event.request.url);

  // Dev mode: ?dev bypasses all caching - always fetch from network
  if (url.searchParams.has('dev')) {
    event.respondWith(fetch(event.request));
    return;
  }
  const isCodeFile = url.pathname.endsWith('.html') ||
                     url.pathname.endsWith('.js') ||
                     url.pathname.endsWith('.css') ||
                     url.pathname === '/' ||
                     url.pathname === '';

  if (isCodeFile) {
    // Network-first for code files - always get latest when online
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for static assets (images, fonts)
    event.respondWith(
      caches.match(event.request)
        .then((cached) => {
          if (cached) return cached;
          return fetch(event.request)
            .then((response) => {
              if (response.ok) {
                const clone = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => cache.put(event.request, clone));
              }
              return response;
            });
        })
    );
  }
});
