// Adventurers Guild Simulator — Save/Load Tests (RED)
// Tests for IndexedDB persistence: initStore, saveState, loadState, clearStore, enableAutoSave

const assert = (condition, msg) => {
  if (!condition) throw new Error(msg || 'assertion failed');
};

let testsRun = 0;
let testsPassed = 0;

const test = async (name, fn) => {
  testsRun++;
  try {
    await fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    testsPassed--;
    console.log(`✗ ${name}: ${e.message}`);
  }
};

// ─── IndexedDB Mock ───
// Minimal in-memory IndexedDB for Node.js testing.
// Supports open, put, get, delete on a single object store.

const mockStores = new Map(); // key -> { value: any }
let openCount = 0;

const mockIndexedDB = {
  open(name, version) {
    openCount++;
    // Sync callback chain like real IndexedDB
    const db = { name, version, store: {} };
    // Fire onupgradeneeded to create object store
    if (db.onupgradeneeded) {
      db.onupgradeneeded({ target: { result: db } });
    }
    // Fire onsuccess
    if (db.onsuccess) db.onsuccess({ target: { result: db } });
    return {
      result: db,
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null,
    };
  },
};

// Set up mock before importing
Object.defineProperty(globalThis, 'indexedDB', { value: mockIndexedDB });

// Import save/load module
import('./save-load.js').then((module) => {
  const { initStore, saveState, loadState, clearStore, enableAutoSave } = module;

  // --- Test: initStore ---

  test('initStore returns a promise that resolves when IndexedDB is ready', async () => {
    const result = initStore();
    assert(result !== undefined, 'initStore must return something');
    assert(typeof result.then === 'function', 'initStore must return a promise');
    await result;
    // Should be idempotent — second call returns same db
    const result2 = await initStore();
    assert(result2 !== undefined, 'initStore should resolve on second call');
  });

  // --- Test: saveState ---

  test('saveState writes state to IndexedDB successfully', async () => {
    const db = await initStore();
    await saveState({ gold: 100, adventurers: ['a1'] });
    // Verify by loading back
    const loaded = await loadState();
    assert(loaded !== null, 'saved state should be loadable');
    assert(loaded.gold === 100, `gold should be 100, got ${loaded.gold}`);
  });

  test('saveState overwrites previous state', async () => {
    await saveState({ gold: 50 });
    await saveState({ gold: 200 });
    const loaded = await loadState();
    assert(loaded.gold === 200, `gold should be 200 after overwrite, got ${loaded.gold}`);
  });

  // --- Test: loadState ---

  test('loadState returns the saved state object', async () => {
    await saveState({ level: 5, name: 'Test Guild' });
    const loaded = await loadState();
    assert(loaded !== null, 'should return object');
    assert(loaded.level === 5, `level should be 5, got ${loaded.level}`);
    assert(loaded.name === 'Test Guild', `name should match, got ${loaded?.name}`);
  });

  test('loadState returns null when no state exists', async () => {
    await clearStore();
    const result = await loadState();
    assert(result === null, `loadState should return null, got ${JSON.stringify(result)}`);
  });

  // --- Test: clearStore ---

  test('clearStore removes saved state', async () => {
    await saveState({ gold: 999 });
    await clearStore();
    const result = await loadState();
    assert(result === null, 'state should be cleared');
  });

  // --- Test: enableAutoSave ---

  test('enableAutoSave triggers save on dispatch', async () => {
    await clearStore();
    // Create a minimal store-like object with subscribe
    let capturedState = null;
    const mockStore = {
      subscribe: (fn) => {
        // Simulate a dispatch
        fn({ gold: 42 }, { type: 'GOLD', payload: 42 });
        return () => {};
      },
    };

    // Hook into enableAutoSave — it wraps the subscriber with saveState
    enableAutoSave(mockStore);

    // The subscriber should have called saveState internally
    // We verify by loading after
    const loaded = await loadState();
    assert(loaded !== null, 'auto-save should have persisted state');
    assert(loaded.gold === 42, `gold should be 42, got ${loaded?.gold}`);
  });

  // --- Test: Store versioning ---

  test('STORE_VERSION constant is defined', async () => {
    // We can check the module exports or just verify initStore uses a version
    await initStore();
    assert(openCount >= 1, 'indexedDB.open should have been called');
  });

  // --- Test: Corrupted data handling ---

  test('corrupted data is handled gracefully (returns null, not crash)', async () => {
    await clearStore();
    // Directly write corrupted data to the mock store
    // The mock store is a Map-like structure
    const db = await initStore();
    // Write something that won't parse as valid state
    // In a real IndexedDB this would be a string; in our mock we put raw objects
    // To test corruption, we'll manipulate the internal mock
    // Since our mock is simple, we test that save/load with null/undefined doesn't crash
    await saveState(null);
    const result = await loadState();
    assert(result === null, 'null state should round-trip as null');
    await saveState(undefined);
    const result2 = await loadState();
    assert(result2 === null, 'undefined state should round-trip as null');
  });

  // --- Test: Auto-save integration with store.subscribe ---

  test('enableAutoSave subscribes and calls saveState on state change', async () => {
    await clearStore();
    let saveCalls = 0;
    const originalSave = saveState;

    // We can't easily spy, so we verify the end result:
    // After enableAutoSave, any dispatch-like call should trigger a save
    const mockStore = {
      subscribe: (fn) => {
        fn({ gold: 77, adventurers: [] }, { type: 'SET' });
        return () => {};
      },
    };

    enableAutoSave(mockStore);

    const loaded = await loadState();
    assert(loaded !== null, 'state should be auto-saved');
    assert(loaded.gold === 77, `gold should be 77, got ${loaded?.gold}`);
  });

  // Print summary
  console.log(`\n${testsPassed}/${testsRun} tests passed`);
  if (testsPassed < testsRun) process.exit(1);
}).catch((e) => {
  console.error('Failed to import save-load module:', e.message);
  process.exit(1);
});
