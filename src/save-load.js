// Adventurers Guild Simulator — Save/Load (IndexedDB Persistence)
// ================================================================
// Promise-wrapped IndexedDB adapter with auto-save support.
// Persist game state across browser sessions.

const STORE_NAME = 'adventurers-guild';
const STORE_VERSION = 1;
const STORE_KEY = 'gameState';

// ─── IndexedDB Helpers ───

/**
 * Open (or create) the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(STORE_NAME, STORE_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Read the current game state from IndexedDB.
 * @param {IDBDatabase} db
 * @returns {Promise<*>} Parsed state or null
 */
function readFromDB(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(STORE_KEY);

    request.onsuccess = () => resolve(request.result?.value ?? null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Write a state value to IndexedDB.
 * @param {IDBDatabase} db
 * @param {*} value
 * @returns {Promise<void>}
 */
function writeToDB(db, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put({ key: STORE_KEY, value });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ─── Public API ───

/** Cached database handle. */
let db = null;

/**
 * Initialize the IndexedDB store. Returns the DB handle.
 * Idempotent — subsequent calls return the existing connection.
 * @returns {Promise<IDBDatabase>}
 */
export async function initStore() {
  if (db) return db;
  db = await openDB();
  return db;
}

/**
 * Save the current game state to IndexedDB.
 * @param {*} state — Serializable game state object
 * @returns {Promise<void>}
 */
export async function saveState(state) {
  if (!db) await initStore();
  await writeToDB(db, state);
}

/**
 * Load the saved game state from IndexedDB.
 * Returns null if no state has been saved yet.
 * @returns {Promise<*>} Saved state or null
 */
export async function loadState() {
  if (!db) await initStore();
  return await readFromDB(db);
}

/**
 * Clear the saved game state from IndexedDB.
 * @returns {Promise<void>}
 */
export async function clearStore() {
  if (!db) await initStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(STORE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ─── Auto-save Integration ───

/**
 * Enable auto-save by subscribing to the store's state changes.
 * Every dispatch that produces a new state triggers saveState.
 * @param {Object} store — A store with a subscribe method
 */
export function enableAutoSave(store) {
  store.subscribe(async (state) => {
    try {
      await saveState(state);
    } catch (e) {
      console.error('[SaveLoad] Auto-save failed:', e);
    }
  });
}
