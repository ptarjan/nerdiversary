/**
 * Service Worker for Nerdiversary PWA
 * Handles push notifications and offline caching
 */

const CACHE_NAME = 'nerdiversary-v3';
const OFFLINE_ASSETS = [
    './',
    './index.html',
    './results.html',
    './css/style.css',
    './js/milestones.js',
    './js/calculator.js',
    './js/nerdiversary.js',
    './js/ical.js',
    './js/results.js',
    './js/storage.js',
    './js/main.js',
    './js/notifications.js',
    './manifest.json',
    './assets/logo.svg',
    './assets/icon-192.png',
    './assets/icon-512.png'
];

/**
 * Install event - cache essential assets
 */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(OFFLINE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

/**
 * Fetch event - serve from cache, fallback to network (stale-while-revalidate)
 */
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') { return; }

    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) { return; }

    event.respondWith(
        caches.match(event.request)
            .then(cached => {
                // Always initiate network fetch to update cache
                const fetchPromise = fetch(event.request)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200) {
                            return response;
                        }

                        // Cache successful responses
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(event.request, responseToCache));

                        return response;
                    })
                    .catch(() => {
                        // Network failed - return cached version if available
                        if (cached) { return cached; }
                        // No cache and network failed - return offline fallback for navigation
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        return null;
                    });

                // Return cached immediately if available, otherwise wait for network
                return cached || fetchPromise;
            })
    );
});

/**
 * Push event - handle incoming push notifications
 */
self.addEventListener('push', event => {
    let data = {
        title: 'Nerdiversary Alert!',
        body: 'A nerdy milestone is coming up!',
        icon: './assets/icon-192.png',
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
        icon: data.icon || './assets/icon-192.png',
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
    const urlToOpen = notificationData.url || './results.html' + (notificationData.family ? `?family=${notificationData.family}` : '');

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
                    icon: icon || './assets/icon-192.png',
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
