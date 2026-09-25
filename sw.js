/**
 * Service worker, registered by js/notifications.js from every page that
 * loads it (index.html, results.html). Two jobs:
 * - Offline: network first for same-origin GETs, cache when the network fails.
 *   Online visitors always get the deployed files, so a deploy needs no version
 *   bump here.
 * - Push: show the notifications the worker (worker/worker.js) sends, and open
 *   or focus the results page when one is tapped.
 */

// Changing the name makes the next activation delete every older cache.
const CACHE_NAME = 'nerdiversary-v4';
// Pre-cached at install so the app works offline after one visit. cache.addAll
// fails the whole install if any one of these is missing, so remove entries
// along with the files.
const OFFLINE_ASSETS = [
    './',
    './index.html',
    './results.html',
    './css/style.css',
    './js/shared.js',
    './js/milestones.js',
    './js/calculator.js',
    './js/nerdiversary.js',
    './js/results.js',
    './js/storage.js',
    './js/main.js',
    './js/notifications.js',
    './manifest.json',
    './assets/android-chrome-192x192.png',
    './assets/android-chrome-512x512.png',
    './assets/apple-touch-icon.png',
    './favicon.ico',
    './assets/logo.svg'
];

// Pre-cache, then take over from any previous worker without waiting for its
// tabs to close.
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(OFFLINE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Delete caches from other CACHE_NAMEs and control already-open pages.
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// Cross-origin requests (fonts, the worker's API) and non-GETs go straight to
// the network untouched.
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') { return; }
    if (!event.request.url.startsWith(self.location.origin)) { return; }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Every successful response refreshes the cache, so anything
                // visited once is available offline.
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() =>
                caches.match(event.request).then(cached => {
                    if (cached) { return cached; }
                    // An uncached page, e.g. results.html?family=..., gets the home
                    // page, which forwards to results from device storage.
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    return new Response('', { status: 503 });
                })
            )
    );
});

// The worker sends JSON {title, body}; any field it omits falls back to these
// defaults. A non-JSON payload becomes the body.
self.addEventListener('push', event => {
    let data = {
        title: 'Nerdiversary',
        body: 'You have a milestone coming up. Tap to see which one.',
        icon: './assets/icon-192x192.png',
        badge: './assets/favicon-96x96.png',
        tag: 'nerdiversary-notification',
        data: {}
    };

    if (event.data) {
        try {
            const pushData = event.data.json();
            data = { ...data, ...pushData };
        } catch {
            data.body = event.data.text();
        }
    }

    const options = {
        body: data.body,
        icon: data.icon || './assets/icon-192x192.png',
        badge: data.badge || './assets/favicon-96x96.png',
        tag: data.tag || 'nerdiversary-notification',
        data: data.data || {},
        vibrate: [200, 100, 200],
        requireInteraction: true,
        actions: [
            {
                action: 'view',
                title: 'Open'
            },
            {
                action: 'dismiss',
                title: 'Dismiss'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Also handles the notifications js/notifications.js shows through this
// worker's registration.
self.addEventListener('notificationclick', event => {
    event.notification.close();

    const action = event.action;
    const notificationData = event.notification.data;

    if (action === 'dismiss') {
        return;
    }

    // Local notifications carry the page URL in data.url; server pushes carry
    // none, and a bare results.html loads the birthdays from device storage.
    const urlToOpen = (notificationData && notificationData.url) || './results.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(windowClients => {
                // Any open results tab wins over opening urlToOpen.
                for (const client of windowClients) {
                    if (client.url.includes('results.html') && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
