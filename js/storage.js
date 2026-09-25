/**
 * Keeps the entered birthdays on this device so a returning visitor skips the
 * form. Used by js/main.js (save on submit, load to prefill and auto-open
 * results) and js/results.js (load when the URL has no `family` parameter,
 * as when a push notification opens results.html).
 *
 * Every save goes to both localStorage and IndexedDB. iOS can clear a home-screen
 * app's localStorage while keeping IndexedDB, so a load falls back to IndexedDB
 * and copies what it finds back into localStorage.
 *
 * Stored value: Array<{name: string, date: 'YYYY-MM-DD', time: 'HH:MM' | '', timezone: string}>,
 * the same fields as one entry of the `family` URL parameter.
 */

const DB_NAME = 'nerdiversary';
const DB_VERSION = 1;
const STORE_NAME = 'family';
const STORAGE_KEY = 'nerdiversary_family';

let db = null;

/**
 * Reject if `promise` has not settled after `ms`. IndexedDB requests can hang
 * without ever firing success or error, most often in iOS home-screen apps.
 * @param {Promise} promise
 * @param {number} ms
 * @param {string} label - Names the step in the rejection message
 * @returns {Promise}
 */
function withTimeout(promise, ms, label) {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        )
    ]);
}

/**
 * Open the database once and reuse the connection. One object store, `family`,
 * holding a single record under STORAGE_KEY.
 * @returns {Promise<IDBDatabase>}
 */
function initDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            resolve(db);
            return;
        }

        if (!window.indexedDB) {
            reject(new Error('IndexedDB not supported'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = event => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME);
            }
        };
    });
}

/**
 * Write the family record. Rejects on failure or after 3 s per step, so
 * saveFamily can tell whether this copy exists.
 * @param {Array<Object>} family
 * @returns {Promise<void>}
 */
async function saveToIndexedDB(family) {
    const database = await withTimeout(initDB(), 3000, 'IndexedDB init');
    return await withTimeout(new Promise((resolve, reject) => {
        const transaction = database.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(family, STORAGE_KEY);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    }), 3000, 'IndexedDB save');
}

/**
 * Read the family record. Never rejects: any failure or timeout is logged and
 * returns null.
 * @returns {Promise<Array<Object>|null>}
 */
async function loadFromIndexedDB() {
    try {
        const database = await withTimeout(initDB(), 3000, 'IndexedDB init');
        return await withTimeout(new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(STORAGE_KEY);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result || null);
        }), 3000, 'IndexedDB load');
    } catch (e) {
        console.warn('IndexedDB load failed:', e);
        return null;
    }
}

/**
 * True if a localStorage write can be read back. It can throw or be missing
 * altogether in private browsing and when storage is disabled.
 * @returns {boolean}
 */
function isLocalStorageAvailable() {
    try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, testKey);
        const result = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        return result === testKey;
    } catch {
        return false;
    }
}

/**
 * Save to both stores.
 * @param {Array<Object>} family
 * @returns {Promise<boolean>} True if at least one store now holds the data;
 *   false means the birthdays will be gone on the next visit
 */
async function saveFamily(family) {
    let localStorageOk = false;
    let indexedDBOk = false;

    if (isLocalStorageAvailable()) {
        try {
            const dataToSave = JSON.stringify(family);
            localStorage.setItem(STORAGE_KEY, dataToSave);
            const savedData = localStorage.getItem(STORAGE_KEY);
            localStorageOk = savedData === dataToSave;
        } catch (e) {
            console.warn('localStorage save failed:', e);
        }
    }

    try {
        await saveToIndexedDB(family);
        indexedDBOk = true;
    } catch (e) {
        console.warn('IndexedDB save failed:', e);
    }

    return localStorageOk || indexedDBOk;
}

/**
 * Load from localStorage, or from IndexedDB if localStorage has nothing usable.
 * Members whose date is not YYYY-MM-DD are dropped.
 * @returns {Promise<Array<Object>|null>} null if neither store has a member with a valid date
 */
async function loadFamily() {
    if (isLocalStorageAvailable()) {
        try {
            const storedFamily = localStorage.getItem(STORAGE_KEY);
            if (storedFamily) {
                const family = JSON.parse(storedFamily);
                if (Array.isArray(family) && family.length > 0) {
                    const validFamily = family.filter(m => m.date && m.date.match(/^\d{4}-\d{2}-\d{2}$/));
                    if (validFamily.length > 0) {
                        return validFamily;
                    }
                }
            }
        } catch (e) {
            console.warn('localStorage load failed:', e);
        }
    }

    try {
        const family = await loadFromIndexedDB();
        if (Array.isArray(family) && family.length > 0) {
            const validFamily = family.filter(m => m.date && m.date.match(/^\d{4}-\d{2}-\d{2}$/));
            if (validFamily.length > 0) {
                if (isLocalStorageAvailable()) {
                    try {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(validFamily));
                    } catch {
                        // The IndexedDB copy is enough to return
                    }
                }
                return validFamily;
            }
        }
    } catch (e) {
        console.warn('IndexedDB load failed:', e);
    }

    return null;
}

export { saveFamily, loadFamily };
