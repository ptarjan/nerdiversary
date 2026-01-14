/**
 * Notification utilities for Nerdiversary PWA
 * Handles service worker registration, permissions, and notification scheduling
 */

// Storage keys
const STORAGE_KEY_NOTIFICATIONS_ENABLED = 'nerdiversary-notifications-enabled';
const STORAGE_KEY_NOTIFICATION_TIMES = 'nerdiversary-notification-times';
const STORAGE_KEY_PUSH_SUBSCRIPTION = 'nerdiversary-push-subscription';

// Cloudflare Worker URL for push subscriptions
// To use a different endpoint, update this URL to your deployed worker
const PUSH_WORKER_URL = 'https://nerdiversary-calendar.curly-unit-b9e0.workers.dev';

// Default notification times (minutes before event)
const DEFAULT_NOTIFICATION_TIMES = [1440, 60, 0]; // 1 day, 1 hour, at event time

/**
 * Check if we're on iOS/iPadOS
 */
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Check if we're in Safari on iOS (not Chrome, Firefox, etc.)
 * iOS Chrome has "CriOS", Firefox has "FxiOS", Edge has "EdgiOS", etc.
 */
function isIOSSafari() {
    if (!isIOS()) return false;
    const ua = navigator.userAgent;
    // Check for non-Safari iOS browsers
    return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

/**
 * Check if running as a standalone PWA (added to Home Screen)
 */
function isStandalonePWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
}

/**
 * Check if notifications are supported
 */
function isSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Check if notifications require PWA installation (iOS Safari)
 */
function requiresPWAInstall() {
    return isIOS() && isIOSSafari() && !isStandalonePWA();
}

/**
 * Check if we're on an iOS browser that doesn't support notifications at all
 * (Chrome, Firefox, etc. on iOS don't support PWA notifications)
 */
function isUnsupportedIOSBrowser() {
    return isIOS() && !isIOSSafari();
}

/**
 * Check if push notifications are supported
 */
function isPushSupported() {
    return isSupported() && 'PushManager' in window;
}

/**
 * Get current notification permission status
 */
function getPermissionStatus() {
    if (!isSupported()) {
        return 'unsupported';
    }
    return Notification.permission;
}

/**
 * Check if notifications are enabled by user preference
 */
function isEnabled() {
    return localStorage.getItem(STORAGE_KEY_NOTIFICATIONS_ENABLED) === 'true';
}

/**
 * Set notification enabled preference
 */
function setEnabled(enabled) {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS_ENABLED, enabled.toString());
}

/**
 * Get notification times preference (minutes before event)
 */
function getNotificationTimes() {
    const stored = localStorage.getItem(STORAGE_KEY_NOTIFICATION_TIMES);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch {
            return DEFAULT_NOTIFICATION_TIMES;
        }
    }
    return DEFAULT_NOTIFICATION_TIMES;
}

/**
 * Set notification times preference
 */
function setNotificationTimes(times) {
    localStorage.setItem(STORAGE_KEY_NOTIFICATION_TIMES, JSON.stringify(times));
}

/**
 * Register the service worker
 */
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.log('Service workers not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('./sw.js', {
            scope: './'
        });

        console.log('Service Worker registered:', registration.scope);

        // Wait for the service worker to be ready
        await navigator.serviceWorker.ready;

        return registration;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
    }
}

/**
 * Request notification permission
 */
async function requestPermission() {
    if (!isSupported()) {
        return { granted: false, reason: 'unsupported' };
    }

    // Already granted
    if (Notification.permission === 'granted') {
        return { granted: true };
    }

    // Already denied
    if (Notification.permission === 'denied') {
        return { granted: false, reason: 'denied' };
    }

    // Request permission
    try {
        const permission = await Notification.requestPermission();
        return {
            granted: permission === 'granted',
            reason: permission
        };
    } catch (error) {
        console.error('Failed to request notification permission:', error);
        return { granted: false, reason: 'error' };
    }
}

/**
 * Show a local notification immediately
 */
async function showNotification(title, options = {}) {
    if (!isSupported() || Notification.permission !== 'granted') {
        console.log('Notifications not available or not permitted');
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        const defaultOptions = {
            icon: './assets/icon-192.png',
            badge: './assets/favicon-96x96.png',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            tag: 'nerdiversary-notification'
        };

        await registration.showNotification(title, { ...defaultOptions, ...options });
        return true;
    } catch (error) {
        console.error('Failed to show notification:', error);

        // Fallback to regular Notification API
        try {
            const fallbackNotification = new Notification(title, options);
            // Notification is created for its side effect (displaying)
            // Log to satisfy linter that the variable is used
            console.log('Fallback notification shown:', fallbackNotification.title);
            return true;
        } catch (fallbackError) {
            console.error('Fallback notification failed:', fallbackError);
            return false;
        }
    }
}

/**
 * Schedule a notification for a future time
 */
function scheduleNotification(event, minutesBefore = 0) {
    if (!isSupported() || !isEnabled() || Notification.permission !== 'granted') {
        return null;
    }

    const notificationTime = new Date(event.date.getTime() - minutesBefore * 60 * 1000);
    const now = new Date();

    // Don't schedule if time has passed
    if (notificationTime <= now) {
        return null;
    }

    const delay = notificationTime.getTime() - now.getTime();

    // Generate notification content
    let title;
    let body;
    if (minutesBefore === 0) {
        title = `${event.icon} It's happening NOW!`;
        body = event.title;
    } else if (minutesBefore < 60) {
        title = `${event.icon} ${minutesBefore} minutes away!`;
        body = event.title;
    } else if (minutesBefore < 1440) {
        const hours = Math.round(minutesBefore / 60);
        title = `${event.icon} ${hours} hour${hours > 1 ? 's' : ''} away!`;
        body = event.title;
    } else {
        const days = Math.round(minutesBefore / 1440);
        title = `${event.icon} ${days} day${days > 1 ? 's' : ''} away!`;
        body = event.title;
    }

    // Store scheduled notification ID for potential cancellation
    const notificationId = `${event.id}-${minutesBefore}`;

    // Schedule via setTimeout (for immediate scheduling)
    // In production, this would be handled by the service worker or server
    const timeoutId = setTimeout(async () => {
        if (isEnabled() && Notification.permission === 'granted') {
            await showNotification(title, {
                body,
                icon: './assets/icon-192.png',
                tag: notificationId,
                data: {
                    eventId: event.id,
                    url: window.location.href
                }
            });
        }
    }, Math.min(delay, 2147483647)); // Max safe setTimeout value

    return {
        id: notificationId,
        timeoutId,
        scheduledFor: notificationTime
    };
}

/**
 * Schedule notifications for an array of events
 */
function scheduleEventNotifications(events) {
    if (!isSupported() || !isEnabled()) {
        return [];
    }

    const times = getNotificationTimes();
    const scheduled = [];

    for (const event of events) {
        for (const minutesBefore of times) {
            const notification = scheduleNotification(event, minutesBefore);
            if (notification) {
                scheduled.push(notification);
            }
        }
    }

    return scheduled;
}

/**
 * Cancel scheduled notifications
 */
function cancelScheduledNotifications(scheduledNotifications) {
    for (const notification of scheduledNotifications) {
        if (notification.timeoutId) {
            clearTimeout(notification.timeoutId);
        }
    }
}

/**
 * Subscribe to push notifications (requires server support)
 */
async function subscribeToPush(familyParam) {
    if (!isPushSupported()) {
        return { success: false, reason: 'unsupported' };
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // Get VAPID public key from server
            const response = await fetch(`${PUSH_WORKER_URL}/push/vapid-public-key`);
            if (!response.ok) {
                console.log('Push notifications not yet configured on server');
                return { success: false, reason: 'server-not-configured' };
            }

            const { publicKey } = await response.json();

            // Convert base64 to Uint8Array
            const applicationServerKey = urlBase64ToUint8Array(publicKey);

            // Subscribe
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey
            });
        }

        // Send subscription to server
        const saveResponse = await fetch(`${PUSH_WORKER_URL}/push/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                family: familyParam
            })
        });

        if (saveResponse.ok) {
            localStorage.setItem(STORAGE_KEY_PUSH_SUBSCRIPTION, JSON.stringify(subscription.toJSON()));
            return { success: true, subscription };
        }
        return { success: false, reason: 'server-error' };
    } catch (error) {
        console.error('Push subscription failed:', error);
        return { success: false, reason: 'error', error };
    }
}

/**
 * Unsubscribe from push notifications
 */
async function unsubscribeFromPush() {
    if (!isPushSupported()) {
        return { success: false, reason: 'unsupported' };
    }

    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            await subscription.unsubscribe();

            // Notify server
            await fetch(`${PUSH_WORKER_URL}/push/unsubscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    endpoint: subscription.endpoint
                })
            }).catch(() => { /* Ignore server errors */ });
        }

        localStorage.removeItem(STORAGE_KEY_PUSH_SUBSCRIPTION);
        return { success: true };
    } catch (error) {
        console.error('Push unsubscription failed:', error);
        return { success: false, reason: 'error', error };
    }
}

/**
 * Convert URL-safe base64 to Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Initialize notifications system
 */
async function initialize() {
    // Register service worker
    const registration = await registerServiceWorker();

    if (!registration) {
        return {
            supported: false,
            permissionStatus: 'unsupported',
            enabled: false
        };
    }

    return {
        supported: true,
        permissionStatus: getPermissionStatus(),
        enabled: isEnabled(),
        pushSupported: isPushSupported()
    };
}

// Export for ES modules
const Notifications = {
    isSupported,
    isPushSupported,
    isIOS,
    isIOSSafari,
    isStandalonePWA,
    requiresPWAInstall,
    isUnsupportedIOSBrowser,
    getPermissionStatus,
    isEnabled,
    setEnabled,
    getNotificationTimes,
    setNotificationTimes,
    registerServiceWorker,
    requestPermission,
    showNotification,
    scheduleNotification,
    scheduleEventNotifications,
    cancelScheduledNotifications,
    subscribeToPush,
    unsubscribeFromPush,
    initialize
};

export default Notifications;

// Also expose on window for backwards compatibility
if (typeof window !== 'undefined') {
    window.Notifications = Notifications;
}
