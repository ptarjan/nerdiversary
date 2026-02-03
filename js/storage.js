/**
 * Storage module with IndexedDB fallback for iOS PWA persistence
 * iOS aggressively evicts localStorage for PWAs - IndexedDB is more resilient
 */

const DB_NAME = 'nerdiversary';
const DB_VERSION = 1;
const STORE_NAME = 'family';
const STORAGE_KEY = 'nerdiversary_family';

let db = null;

/**
 * Race a promise against a timeout
 * @param {Promise} promise - The promise to race
 * @param {number} ms - Timeout in milliseconds
 * @param {string} label - Label for error message
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
 * Initialize IndexedDB
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
 * Save to IndexedDB
 * @param {Array} family - Family data to save
 * @returns {Promise<void>}
 */
async function saveToIndexedDB(family) {
    try {
        const database = await withTimeout(initDB(), 3000, 'IndexedDB init');
        return await withTimeout(new Promise((resolve, reject) => {
            const transaction = database.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(family, STORAGE_KEY);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        }), 3000, 'IndexedDB save');
    } catch (e) {
        console.warn('IndexedDB save failed:', e);
    }
}

/**
 * Load from IndexedDB
 * @returns {Promise<Array|null>}
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
 * Check if localStorage is available and working
 * @returns {boolean}
 */
function isLocalStorageAvailable() {
    try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, testKey);
        const result = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        return result === testKey;
    } catch (e) {
        return false;
    }
}

/**
 * Save family data to both localStorage and IndexedDB
 * @param {Array} family - Family data to save
 * @returns {Promise<boolean>} - True if at least one save succeeded
 */
async function saveFamily(family) {
    let localStorageOk = false;
    let indexedDBOk = false;

    // Try localStorage first
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

    // Also save to IndexedDB as backup
    try {
        await saveToIndexedDB(family);
        indexedDBOk = true;
    } catch (e) {
        console.warn('IndexedDB save failed:', e);
    }

    return localStorageOk || indexedDBOk;
}

/**
 * Load family data from localStorage or IndexedDB fallback
 * @returns {Promise<Array|null>}
 */
async function loadFamily() {
    // Try localStorage first (faster)
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

    // Fall back to IndexedDB
    try {
        const family = await loadFromIndexedDB();
        if (Array.isArray(family) && family.length > 0) {
            const validFamily = family.filter(m => m.date && m.date.match(/^\d{4}-\d{2}-\d{2}$/));
            if (validFamily.length > 0) {
                // Restore to localStorage if it was missing
                if (isLocalStorageAvailable()) {
                    try {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(validFamily));
                    } catch (e) {
                        // Ignore - at least we have IndexedDB
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

// Export for use in main.js
window.NerdiversaryStorage = {
    saveFamily,
    loadFamily,
    isLocalStorageAvailable
};
