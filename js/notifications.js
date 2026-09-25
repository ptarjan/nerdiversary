/**
 * Milestone notifications, delivered two ways:
 * - Server push: subscribeToPush registers this browser and the birthdays with
 *   the worker (worker/worker.js), whose cron sends a push at each alert time.
 *   Arrives with the page closed.
 * - Local timers: scheduleEventNotifications sets setTimeouts that show a
 *   notification through the service worker. Only fire while the page is open.
 * The results page uses one or the other, never both (startAlerts in
 * js/results.js), so an alert is never shown twice.
 *
 * Also registers the service worker (sw.js), which receives the pushes. Used by
 * js/results.js (the notification button) and index.html (registration only).
 * The on/off preference lives in localStorage and is per device.
 */

import { formatNotificationTitle, localToUtcWithTimezone, WORKER_URL } from './shared.js';

// localStorage keys
const STORAGE_KEY_NOTIFICATIONS_ENABLED = 'nerdiversary-notifications-enabled';
const STORAGE_KEY_NOTIFICATION_TIMES = 'nerdiversary-notification-times';

// Alert lead times in minutes: 1 day before, 1 hour before, at the moment.
// The worker falls back to the same list if a subscription omits it.
const DEFAULT_NOTIFICATION_TIMES = [1440, 60, 0];

/**
 * iPhone, iPad or iPod. iPadOS reports itself as a Mac, so a touch-screen
 * "MacIntel" counts too.
 * @returns {boolean}
 */
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Safari on iOS, as opposed to Chrome (CriOS), Firefox (FxiOS), Edge (EdgiOS)
 * or Opera (OPiOS) on iOS.
 * @returns {boolean}
 */
function isIOSSafari() {
    if (!isIOS()) { return false; }
    const ua = navigator.userAgent;
    return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
}

/**
 * Running as an installed app (from the Home Screen) rather than in a browser tab.
 * @returns {boolean}
 */
function isStandalonePWA() {
    return window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
}

/**
 * The browser has the Notification API and service workers.
 * @returns {boolean}
 */
function isSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * iOS Safari in a tab: notifications need the site added to the Home Screen first.
 * @returns {boolean}
 */
function requiresPWAInstall() {
    return isIOS() && isIOSSafari() && !isStandalonePWA();
}

/**
 * A non-Safari browser on iOS. These cannot install the site to the Home
 * Screen, so they can never show its notifications.
 * @returns {boolean}
 */
function isUnsupportedIOSBrowser() {
    return isIOS() && !isIOSSafari();
}

/**
 * Notifications plus the Push API, needed for alerts with the page closed.
 * @returns {boolean}
 */
function isPushSupported() {
    return isSupported() && 'PushManager' in window;
}

/**
 * The browser's notification permission.
 * @returns {NotificationPermission | 'unsupported'}
 */
function getPermissionStatus() {
    if (!isSupported()) {
        return 'unsupported';
    }
    return Notification.permission;
}

/**
 * Whether the user turned notifications on with the button on this device.
 * Separate from browser permission, which may be granted while this is off.
 * @returns {boolean}
 */
function isEnabled() {
    return localStorage.getItem(STORAGE_KEY_NOTIFICATIONS_ENABLED) === 'true';
}

/**
 * @param {boolean} enabled
 */
function setEnabled(enabled) {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS_ENABLED, enabled.toString());
}

/**
 * Alert lead times in minutes before each milestone. Nothing in the app writes
 * STORAGE_KEY_NOTIFICATION_TIMES, so this is DEFAULT_NOTIFICATION_TIMES unless
 * set by hand.
 * @returns {number[]}
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
 * Register sw.js for the whole site and wait until it is active.
 * @returns {Promise<ServiceWorkerRegistration|null>} null if unsupported or registration failed
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

        await navigator.serviceWorker.ready;

        return registration;
    } catch (error) {
        console.error('Service Worker registration failed:', error);
        return null;
    }
}

/**
 * Ask for notification permission if the browser has not already decided.
 * @returns {Promise<{granted: boolean, reason?: string}>} reason is 'unsupported',
 *   'denied', 'default' (prompt dismissed) or 'error' when not granted
 */
async function requestPermission() {
    if (!isSupported()) {
        return { granted: false, reason: 'unsupported' };
    }

    if (Notification.permission === 'granted') {
        return { granted: true };
    }

    if (Notification.permission === 'denied') {
        return { granted: false, reason: 'denied' };
    }

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
 * Show a notification now, through the service worker, falling back to
 * `new Notification` if that fails. A notification with the same `tag`
 * replaces the earlier one.
 * @param {string} title
 * @param {NotificationOptions & {vibrate?: number[], requireInteraction?: boolean}} [options]
 * @returns {Promise<boolean>} false if not permitted or both ways failed
 */
async function showNotification(title, options = {}) {
    if (!isSupported() || Notification.permission !== 'granted') {
        console.log('Notifications not available or not permitted');
        return false;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        const defaultOptions = {
            icon: './assets/icon-192x192.png',
            badge: './assets/favicon-96x96.png',
            vibrate: [200, 100, 200],
            requireInteraction: true,
            tag: 'nerdiversary-notification'
        };

        await registration.showNotification(title, { ...defaultOptions, ...options });
        return true;
    } catch (error) {
        console.error('Failed to show notification:', error);

        try {
            // Constructing it shows it. Assigning and logging it keeps eslint's
            // no-new rule quiet.
            const fallbackNotification = new Notification(title, options);
            console.log('Fallback notification shown:', fallbackNotification.title);
            return true;
        } catch (fallbackError) {
            console.error('Fallback notification failed:', fallbackError);
            return false;
        }
    }
}

/**
 * Set a timer to show one alert `minutesBefore` minutes ahead of `event`. The
 * timer dies with the page; server push covers the page being closed.
 * @param {{id: string, date: Date, icon: string, title: string}} event
 * @param {number} [minutesBefore=0]
 * @returns {{id: string, timeoutId: number, scheduledFor: Date}|null} null if
 *   notifications are off, the time has passed, or it is too far away
 */
function scheduleNotification(event, minutesBefore = 0) {
    if (!isSupported() || !isEnabled() || Notification.permission !== 'granted') {
        return null;
    }

    const notificationTime = new Date(event.date.getTime() - minutesBefore * 60 * 1000);
    const now = new Date();

    if (notificationTime <= now) {
        return null;
    }

    const delay = notificationTime.getTime() - now.getTime();

    // A delay over 2^31-1 ms (about 24.8 days) overflows setTimeout, which then
    // fires at once. Skip those; a later page load schedules them.
    if (delay > 2147483647) {
        return null;
    }

    const title = formatNotificationTitle(event.icon, minutesBefore);
    const body = event.title;

    // Also the notification's tag.
    const notificationId = `${event.id}-${minutesBefore}`;

    const timeoutId = setTimeout(async () => {
        if (isEnabled() && Notification.permission === 'granted') {
            await showNotification(title, {
                body,
                icon: './assets/icon-192x192.png',
                tag: notificationId,
                data: {
                    eventId: event.id,
                    url: window.location.href
                }
            });
        }
    }, delay);

    return {
        id: notificationId,
        timeoutId,
        scheduledFor: notificationTime
    };
}

/**
 * Schedule every lead time from getNotificationTimes for each event.
 * @param {Array<{id: string, date: Date, icon: string, title: string}>} events
 * @returns {Array<{id: string, timeoutId: number, scheduledFor: Date}>} pass to cancelScheduledNotifications
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
 * @param {Array<{timeoutId: number}>} scheduledNotifications - from scheduleEventNotifications
 */
function cancelScheduledNotifications(scheduledNotifications) {
    for (const notification of scheduledNotifications) {
        if (notification.timeoutId) {
            clearTimeout(notification.timeoutId);
        }
    }
}

/**
 * Subscribe this browser to push (reusing an existing subscription) and send
 * it with the birthdays to the worker, which replaces whatever it had stored
 * for this subscription. results.js calls this again on every visit with
 * notifications on, so the worker keeps the current birthdays.
 * @param {string} familyParam - The `family` URL parameter, as returned by URLSearchParams.get
 * @returns {Promise<{success: boolean, reason?: string, subscription?: PushSubscription, error?: Error}>}
 *   reason is 'unsupported', 'server-not-configured' (no VAPID key), 'server-error' or 'error'
 */
async function subscribeToPush(familyParam) {
    if (!isPushSupported()) {
        return { success: false, reason: 'unsupported' };
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            const response = await fetch(`${WORKER_URL}/push/vapid-public-key`);
            if (!response.ok) {
                console.log('Push notifications not yet configured on server');
                return { success: false, reason: 'server-not-configured' };
            }

            const { publicKey } = await response.json();

            const applicationServerKey = urlBase64ToUint8Array(publicKey);

            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey
            });
        }

        // Send birth times as UTC with no zone field. Converting here uses the
        // birth zone if one was given and this device's zone otherwise, matching
        // what the results page shows; the worker would read a zoneless time as UTC.
        // Names stay percent-encoded, as the worker's parseFamilyParam expects.
        const utcFamily = familyParam.split(',').map(member => {
            const parts = member.split('|');
            const name = parts[0];
            const dateStr = parts[1] || '';
            const timeStr = parts[2] || '00:00';
            const timezone = parts[3] || '';

            let utcDate;
            if (timezone) {
                utcDate = localToUtcWithTimezone(dateStr, timeStr, timezone);
            } else {
                utcDate = new Date(`${dateStr}T${timeStr}:00`);
            }

            // The worker drops entries it cannot parse.
            if (isNaN(utcDate.getTime())) { return member; }
            const utcDateStr = utcDate.toISOString().slice(0, 10);
            const utcTimeStr = utcDate.toISOString().slice(11, 16);
            return `${name}|${utcDateStr}|${utcTimeStr}`;
        }).join(',');

        // timezoneOffset 0: the times above are already UTC. `timezone` is the
        // device's, used by the worker to send shared holidays at local midnight.
        const saveResponse = await fetch(`${WORKER_URL}/push/subscribe`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                subscription: subscription.toJSON(),
                family: utcFamily,
                notificationTimes: getNotificationTimes(),
                timezoneOffset: 0,
                timezone: new Intl.DateTimeFormat().resolvedOptions().timeZone
            })
        });

        if (saveResponse.ok) {
            return { success: true, subscription };
        }
        return { success: false, reason: 'server-error' };
    } catch (error) {
        console.error('Push subscription failed:', error);
        return { success: false, reason: 'error', error };
    }
}

/**
 * Drop this browser's push subscription and tell the worker to delete it. The
 * worker call is best effort; the browser side is what stops the pushes.
 * @returns {Promise<{success: boolean, reason?: string, error?: Error}>}
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

            await fetch(`${WORKER_URL}/push/unsubscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    endpoint: subscription.endpoint
                })
            }).catch(() => { /* best effort, see above */ });
        }

        return { success: true };
    } catch (error) {
        console.error('Push unsubscription failed:', error);
        return { success: false, reason: 'error', error };
    }
}

/**
 * Decode base64url (the VAPID public key's encoding) to bytes.
 * @param {string} base64String
 * @returns {Uint8Array}
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
 * Register the service worker and report what the notification button can do.
 * @returns {Promise<{supported: boolean, permissionStatus: string, enabled: boolean, pushSupported?: boolean}>}
 */
async function initialize() {
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
