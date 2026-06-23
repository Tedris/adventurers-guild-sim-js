// Adventurers Guild Simulator — Save/Load (IndexedDB Persistence)
// ================================================================
// Promise-wrapped IndexedDB adapter with auto-save support.
// Persist game state across browser sessions.

import type { GameState } from './types';

const STORE_NAME = 'adventurers-guild';
const STORE_VERSION: number = 1;
const STORE_KEY = 'gameState';

// ─── IndexedDB Helpers ───

/**
 * Open (or create) the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request: IDBOpenDBRequest = indexedDB.open(STORE_NAME, STORE_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db: IDBDatabase = (event.target as EventTarget & { result: IDBDatabase }).result;
      try {
        const oldVersion: number = event.oldVersion;
        if (oldVersion < 1 && !db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      } catch (e) {
        reject(e);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Read the current game state from IndexedDB.
 * @param {IDBDatabase} db
 * @returns {Promise<GameState | null>} Parsed state or null
 */
function readFromDB(db: IDBDatabase): Promise<GameState | null> {
  return new Promise((resolve, reject) => {
    const tx: IDBTransaction = db.transaction(STORE_NAME, 'readonly');
    const store: IDBObjectStore = tx.objectStore(STORE_NAME);
    const request: IDBRequest = store.get(STORE_KEY);

    request.onsuccess = () => {
      const result: { value: unknown } | null = request.result;
      const value = result?.value ?? null;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        resolve(value as GameState);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Write a state value to IndexedDB.
 * @param {IDBDatabase} db
 * @param {GameState} value
 * @returns {Promise<void>}
 */
function writeToDB(db: IDBDatabase, value: GameState): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx: IDBTransaction = db.transaction(STORE_NAME, 'readwrite');
    const store: IDBObjectStore = tx.objectStore(STORE_NAME);
    const request: IDBRequest = store.put({ key: STORE_KEY, value });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ─── Public API ───

/** Cached database handle. */
let db: IDBDatabase | null = null;

/**
 * Explicitly close and invalidate the database connection.
 * Sets db to null so the next operation will re-open.
 */
export function closeDB(): void {
  if (db) {
    db.close();
  }
  db = null;
  _connecting = null;
}

/** Promise for in-flight database connection. */
let _connecting: Promise<IDBDatabase> | null = null;

/** Last auto-save timestamp for debouncing. */
let _lastAutoSave: number = 0;

/** Debounce interval in milliseconds. */
const AUTO_SAVE_DEBOUNCE_MS = 500;

/** Whether auto-save is currently enabled. */
let _autoSaveEnabled = false;

/** Whether the first dispatch has been processed (skip auto-save on initial state). */
let _firstDispatchDone = false;

/**
 * Initialize the IndexedDB store. Returns the DB handle.
 * Idempotent — subsequent calls return the existing connection.
 * @returns {Promise<IDBDatabase>}
 */
export async function initStore(): Promise<IDBDatabase> {
  _firstDispatchDone = false;
  if (db) return db;
  if (_connecting) return _connecting;
  _connecting = openDB().then((dbConn) => {
    db = dbConn;
    _connecting = null;
    return dbConn;
  });
  return _connecting;
}

/**
 * Save the current game state to IndexedDB.
 * @param {GameState} state — Serializable game state object
 * @returns {Promise<void>}
 */
export async function saveState(state: GameState): Promise<void> {
  if (!db) await initStore();
  try {
    await writeToDB(db!, state);
  } catch (e) {
    console.warn('[SaveLoad] Write failed, reconnecting...', e);
    db = null;
    _connecting = null;
    await initStore();
    await writeToDB(db!, state);
  }
}

/**
 * Load the saved game state from IndexedDB.
 * Returns null if no state has been saved yet.
 * @returns {Promise<GameState | null>} Saved state or null
 */
export async function loadState(): Promise<GameState | null> {
  if (!db) await initStore();
  try {
    return await readFromDB(db!);
  } catch (e) {
    console.warn('[SaveLoad] Read failed, reconnecting...', e);
    db = null;
    _connecting = null;
    await initStore();
    return await readFromDB(db!);
  }
}

/**
 * Clear the saved game state from IndexedDB.
 * Also disables auto-save since the store is being reset.
 * @returns {Promise<void>}
 */
export async function clearStore(): Promise<void> {
  if (!db) await initStore();
  return new Promise((resolve, reject) => {
    const currentDb = db!;
    const tx: IDBTransaction = currentDb.transaction(STORE_NAME, 'readwrite');
    const store: IDBObjectStore = tx.objectStore(STORE_NAME);
    const request: IDBRequest = store.delete(STORE_KEY);
    request.onsuccess = () => {
      _autoSaveEnabled = false;
      _lastAutoSave = 0;
      _firstDispatchDone = false;
      closeDB();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// ─── Auto-save Integration ───

/**
 * Enable auto-save by subscribing to the store's state changes.
 * Every dispatch that produces a new state triggers saveState.
 * Idempotent — calling twice skips the duplicate subscription.
 * @param {Object} store — A store with a subscribe method
 */
export function enableAutoSave(
  store: { subscribe: (fn: (state: GameState) => void) => () => void },
): void {
  if (_autoSaveEnabled) return;
  _autoSaveEnabled = true;
  store.subscribe(async (state: GameState) => {
    if (!_firstDispatchDone) {
      _firstDispatchDone = true;
      return;
    }
    const now = Date.now();
    if (now - _lastAutoSave < AUTO_SAVE_DEBOUNCE_MS) return;
    _lastAutoSave = now;
    try {
      await saveState(state);
    } catch (e) {
      console.error('[SaveLoad] Auto-save failed:', e);
      // Reconnection logic — close stale connection and retry
      db = null;
      try {
        await initStore();
        await saveState(state);
      } catch (retryErr) {
        console.error('[SaveLoad] Auto-save reconnection failed:', retryErr);
      }
    }
  });
}
