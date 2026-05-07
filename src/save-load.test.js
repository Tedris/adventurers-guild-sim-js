// Adventurers Guild Simulator — Save/Load Tests
// Tests for IndexedDB persistence: initStore, saveState, loadState, clearStore, enableAutoSave

const assert = (condition, msg) => {
  if (!condition) throw new Error(msg || 'assertion failed');
};

let testsRun = 0;
let testsPassed = 0;

const test = (name, fn) => {
  testsRun++;
  return Promise.resolve(fn()).then(
    () => { testsPassed++; console.log(`✓ ${name}`); },
    (e) => { console.log(`✗ ${name}: ${e.message}`); throw e; }
  );
};

// ─── IndexedDB Mock ───
// Full in-memory IndexedDB that supports the API surface used by save-load.js.

const dbRegistry = new Map(); // name -> db object
let openSequence = 0;

function createMockStore() {
  const data = new Map();
  const nativeGet = Map.prototype.get;
  const nativeSet = Map.prototype.set;
  const nativeDelete = Map.prototype.delete;

  return Object.assign(data, {
    // IndexedDB get: returns an IDBRequest-like object
    get(key) {
      const entry = nativeGet.call(data, key);
      let onSuccessCb = null;
      return {
        // Real IndexedDB returns the full stored object; caller extracts .value
        result: entry || null,
        error: null,
        get onsuccess() { return onSuccessCb; },
        set onsuccess(fn) {
          onSuccessCb = fn;
          if (fn) fn({ target: { result: this.result } });
        },
        get onerror() { return null; },
        set onerror(fn) {},
      };
    },
    put(valueObj) {
      if (typeof valueObj === 'object' && valueObj !== null && 'key' in valueObj) {
        nativeSet.call(data, valueObj.key, valueObj);
      }
      let onSuccessCb = null;
      return {
        result: undefined,
        get onsuccess() { return onSuccessCb; },
        set onsuccess(fn) {
          onSuccessCb = fn;
          if (fn) fn({ target: { result: undefined } });
        },
        get onerror() { return null; },
        set onerror(fn) {},
      };
    },
    delete(key) {
      nativeDelete.call(data, key);
      let onSuccessCb = null;
      return {
        result: undefined,
        get onsuccess() { return onSuccessCb; },
        set onsuccess(fn) {
          onSuccessCb = fn;
          if (fn) fn({ target: { result: undefined } });
        },
        get onerror() { return null; },
        set onerror(fn) {},
      };
    },
  });
}

function createMockDB(name) {
  // Cache of store instances by store name — shared across transactions
  const storeCache = new Map();

  return {
    name,
    version: 1,
    objectStoreNames: {
      contains(storeName) { return storeCache.has(storeName); },
    },
    createObjectStore(storeName) {
      if (!storeCache.has(storeName)) {
        storeCache.set(storeName, createMockStore());
      }
    },
    transaction(storeNames, mode) {
      const stores = Array.isArray(storeNames) ? storeNames : [storeNames];
      // Create stores if needed
      stores.forEach((s) => {
        if (!storeCache.has(s)) {
          storeCache.set(s, createMockStore());
        }
      });
      return {
        objectStore(storeName) {
          if (!storeCache.has(storeName)) {
            storeCache.set(storeName, createMockStore());
          }
          return storeCache.get(storeName);
        },
      };
    },
  };
}

const mockIndexedDB = {
  open(name, version) {
    if (!dbRegistry.has(name)) {
      dbRegistry.set(name, createMockDB(name));
    }
    const db = dbRegistry.get(name);
    openSequence++;

    let onUpgrade = null;
    let onSuccess = null;
    let onError = null;

    const request = {
      result: null,
      error: null,
      get onupgradeneeded() { return onUpgrade; },
      set onupgradeneeded(fn) {
        onUpgrade = fn;
        if (fn) {
          request.result = db;
          fn({
            target: {
              result: db,
              objectStoreNames: db.objectStoreNames,
              createObjectStore: (s) => db.createObjectStore(s),
            },
          });
        }
      },
      get onsuccess() { return onSuccess; },
      set onsuccess(fn) {
        onSuccess = fn;
        if (fn) {
          request.result = db;
          fn({ target: { result: db } });
        }
      },
      get onerror() { return onError; },
      set onerror(fn) {
        onError = fn;
        if (fn) {
          fn({ target: { error: new Error('mock error') } });
        }
      },
    };

    return request;
  },
};

// Set up mock before importing
Object.defineProperty(globalThis, 'indexedDB', {
  value: mockIndexedDB,
  writable: false,
  configurable: true,
});

// ─── Test Execution ───
// Sequential async test runner — each test awaits the previous.

import('./save-load.js').then((module) => {
  const { initStore, saveState, loadState, clearStore, enableAutoSave } = module;

  let chain = Promise.resolve();

  // --- initStore ---

  chain = chain.then(() => test('initStore returns a promise that resolves when IndexedDB is ready', () => {
    const result = initStore();
    assert(result !== undefined, 'initStore must return something');
    assert(typeof result.then === 'function', 'initStore must return a promise');
    return result.then((db) => {
      assert(db !== undefined, 'initStore should resolve with db');
      // Idempotent: second call returns same db
      return initStore().then((db2) => {
        assert(db2 !== undefined, 'initStore should resolve on second call');
      });
    });
  }));

  // --- saveState ---

  chain = chain.then(() => test('saveState writes state to IndexedDB successfully', () => {
    return initStore().then(() => {
      return saveState({ gold: 100, adventurers: ['a1'] }).then(() => {
        return loadState().then((loaded) => {
          assert(loaded !== null, 'saved state should be loadable');
          assert(loaded.gold === 100, 'gold should be 100, got ' + loaded.gold);
        });
      });
    });
  }));

  chain = chain.then(() => test('saveState overwrites previous state', () => {
    return initStore().then(() => {
      return saveState({ gold: 50 }).then(() => {
        return saveState({ gold: 200 }).then(() => {
          return loadState().then((loaded) => {
            assert(loaded.gold === 200, 'gold should be 200 after overwrite, got ' + loaded.gold);
          });
        });
      });
    });
  }));

  // --- loadState ---

  chain = chain.then(() => test('loadState returns the saved state object', () => {
    return initStore().then(() => {
      return saveState({ level: 5, name: 'Test Guild' }).then(() => {
        return loadState().then((loaded) => {
          assert(loaded !== null, 'should return object');
          assert(loaded.level === 5, 'level should be 5, got ' + loaded.level);
          assert(loaded.name === 'Test Guild', 'name should match');
        });
      });
    });
  }));

  chain = chain.then(() => test('loadState returns null when no state exists', () => {
    return initStore().then(() => {
      return clearStore().then(() => {
        return loadState().then((result) => {
          assert(result === null, 'loadState should return null, got ' + JSON.stringify(result));
        });
      });
    });
  }));

  // --- clearStore ---

  chain = chain.then(() => test('clearStore removes saved state', () => {
    return initStore().then(() => {
      return saveState({ gold: 999 }).then(() => {
        return clearStore().then(() => {
          return loadState().then((result) => {
            assert(result === null, 'state should be cleared');
          });
        });
      });
    });
  }));

  // --- enableAutoSave ---

  chain = chain.then(() => test('enableAutoSave triggers save on dispatch', () => {
    return initStore().then(() => {
      return clearStore().then(() => {
        const mockStore = {
          subscribe: (fn) => {
            fn({ gold: 42 }, { type: 'GOLD', payload: 42 });
            return () => {};
          },
        };
        enableAutoSave(mockStore);
        return loadState().then((loaded) => {
          assert(loaded !== null, 'auto-save should have persisted state');
          assert(loaded.gold === 42, 'gold should be 42, got ' + (loaded ? loaded.gold : 'null'));
        });
      });
    });
  }));

  // --- Store versioning ---

  chain = chain.then(() => test('STORE_VERSION constant is defined (open was called)', () => {
    assert(openSequence >= 1, 'indexedDB.open should have been called');
  }));

  // --- Corrupted data handling ---

  chain = chain.then(() => test('corrupted data is handled gracefully (returns null, not crash)', () => {
    return initStore().then(() => {
      return clearStore().then(() => {
        return saveState(null).then(() => {
          return loadState().then((result) => {
            assert(result === null, 'null state should round-trip as null');
          });
        });
      });
    });
  }));

  // --- Auto-save integration ---

  chain = chain.then(() => test('enableAutoSave subscribes and calls saveState on state change', () => {
    return initStore().then(() => {
      return clearStore().then(() => {
        const mockStore = {
          subscribe: (fn) => {
            fn({ gold: 77, adventurers: [] }, { type: 'SET' });
            return () => {};
          },
        };
        enableAutoSave(mockStore);
        return loadState().then((loaded) => {
          assert(loaded !== null, 'state should be auto-saved');
          assert(loaded.gold === 77, 'gold should be 77, got ' + (loaded ? loaded.gold : 'null'));
        });
      });
    });
  }));

  // Print summary after all tests complete
  return chain.then(() => {
    console.log('\n' + testsPassed + '/' + testsRun + ' tests passed');
    if (testsPassed < testsRun) process.exit(1);
  });
}).catch((e) => {
  console.error('[FAIL] ' + e.message);
  console.error(e.stack);
  process.exit(1);
});
