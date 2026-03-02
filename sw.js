/**
 * Service Worker for Nerdiversary PWA
 * Network-first caching: always fetch from network, fall back to cache when offline.
 */

const CACHE_NAME = 'nerdiversary-v1';
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

/**
 * Install event - pre-cache assets for offline use, then activate immediately
 */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(OFFLINE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

/**
 * Activate event - clean up old caches and claim clients
 */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

/**
 * Fetch event - network first, fall back to cache when offline
 */
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') { return; }
    if (!event.request.url.startsWith(self.location.origin)) { return; }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache successful responses for offline use
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            })
            .catch(() =>
                // Network failed — serve from cache
                caches.match(event.request).then(cached => {
                    if (cached) { return cached; }
                    // Navigation requests fall back to cached index
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                    return new Response('', { status: 503 });
                })
            )
    );
});

/**
 * Push event - handle incoming push notifications
 */
self.addEventListener('push', event => {
    let data = {
        title: 'Nerdiversary Alert!',
        body: 'A nerdy milestone is coming up!',
        icon: './assets/icon-192x192.png',
        badge: './assets/favicon-96x96.png',
        tag: 'nerdiversary-notification',
        data: {}
    };

    // Parse push data if available
    if (event.data) {
        try {
            const pushData = event.data.json();
            data = { ...data, ...pushData };
        } catch {
            // If not JSON, use as body text
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
                title: 'View Details'
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

/**
 * Notification click event - handle user interaction
 */
self.addEventListener('notificationclick', event => {
    event.notification.close();

    const action = event.action;
    const notificationData = event.notification.data;

    if (action === 'dismiss') {
        return;
    }

    // Default action or 'view' action - open the results page
    // results.html will load family data from storage if no URL param is present
    const urlToOpen = (notificationData && notificationData.url) || './results.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(windowClients => {
                // Check if there's already a window open
                for (const client of windowClients) {
                    if (client.url.includes('results.html') && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window if none found
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

/**
 * Message event - handle messages from the main thread
 */
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    // Handle scheduled notification request
    if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
        const { title, body, icon, tag, timestamp, data } = event.data;
        const delay = timestamp - Date.now();

        if (delay > 0) {
            // Store in IndexedDB for persistence (simplified - using setTimeout for demo)
            // In production, use IndexedDB and periodic sync
            setTimeout(() => {
                self.registration.showNotification(title, {
                    body,
                    icon: icon || './assets/icon-192x192.png',
                    badge: './assets/favicon-96x96.png',
                    tag: tag || 'nerdiversary-scheduled',
                    data: data || {},
                    vibrate: [200, 100, 200],
                    requireInteraction: true
                });
            }, Math.min(delay, 2147483647)); // Max setTimeout delay
        }
    }
});
