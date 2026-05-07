// Adventurers Guild Simulator — Store Tests (RED)
// Tests for reactive state store behavior

const assert = (condition, msg) => {
  if (!condition) throw new Error(msg || 'assertion failed');
};

let testsRun = 0;
let testsPassed = 0;

const test = (name, fn) => {
  testsRun++;
  try { fn(); testsPassed++; console.log(`✓ ${name}`); }
  catch(e) { console.log(`✗ ${name}: ${e.message}`); }
};

// Import store module
import('./store.js').then((module) => {
  const { createStore, createAction } = module;

  // --- Tests for createStore ---

  test('createStore returns an object with dispatch, subscribe, getState', () => {
    const store = createStore({ gold: 10 });
    assert(typeof store.dispatch === 'function', 'dispatch should be a function');
    assert(typeof store.subscribe === 'function', 'subscribe should be a function');
    assert(typeof store.getState === 'function', 'getState should be a function');
  });

  test('dispatch with valid action updates state correctly', () => {
    const store = createStore({ gold: 10 });
    const action = { type: 'GOLD', payload: 5 };
    const result = store.dispatch(action);
    assert(result === true, 'dispatch should return true for valid action');
    const state = store.getState();
    assert(state.gold === 15, `state should be updated: expected gold=15, got ${state.gold}`);
  });

  test('dispatch with invalid action does NOT update state', () => {
    const store = createStore({ gold: 10 }, {
      GOLD: (state, payload) => payload > 0,
    });
    const result = store.dispatch({ type: 'GOLD', payload: -5 });
    assert(result === false, 'dispatch should return false for invalid action');
    const state = store.getState();
    assert(state.gold === 10, `state should not change: expected gold=10, got ${state.gold}`);
  });

  test('subscribe callback is called after valid dispatch', () => {
    const store = createStore({ gold: 10 });
    let receivedState = null;
    const unsub = store.subscribe((state) => { receivedState = state; });
    store.dispatch({ type: 'GOLD', payload: 5 });
    unsub();
    assert(receivedState !== null, 'subscriber should have received state');
    assert(receivedState.gold === 15, `subscriber should see updated state: expected gold=15, got ${receivedState?.gold}`);
  });

  test('subscribe callback is NOT called for invalid dispatch', () => {
    const store = createStore({ gold: 10 }, {
      GOLD: (state, payload) => payload > 0,
    });
    let callCount = 0;
    const unsub = store.subscribe(() => { callCount++; });
    store.dispatch({ type: 'GOLD', payload: -5 });
    unsub();
    assert(callCount === 0, `subscriber should NOT be called for invalid action: callCount=${callCount}`);
  });

  test('getState returns current state snapshot', () => {
    const store = createStore({ gold: 10, level: 1 });
    const state1 = store.getState();
    assert(state1.gold === 10, 'initial gold should be 10');
    assert(state1.level === 1, 'initial level should be 1');
  });

  test('multiple subscribers all receive updates', () => {
    const store = createStore({ gold: 0 });
    let countA = 0, countB = 0;
    const unsubA = store.subscribe(() => { countA++; });
    const unsubB = store.subscribe(() => { countB++; });
    store.dispatch({ type: 'GOLD', payload: 5 });
    unsubA();
    unsubB();
    assert(countA === 1, `subscriber A should have been called once: ${countA}`);
    assert(countB === 1, `subscriber B should have been called once: ${countB}`);
  });

  test('unsubscribe removes a subscriber', () => {
    const store = createStore({ gold: 0 });
    let callCount = 0;
    const unsub = store.subscribe(() => { callCount++; });
    store.dispatch({ type: 'GOLD', payload: 5 });
    unsub();
    store.dispatch({ type: 'GOLD', payload: 5 });
    assert(callCount === 1, `after unsubscribe, callCount should be 1: ${callCount}`);
  });

  // --- Tests for createAction ---

  test('createAction returns a factory function', () => {
    const incGold = createAction('GOLD', (p) => p);
    assert(typeof incGold === 'function', 'createAction should return a function');
  });

  test('createAction produces correct action shape', () => {
    const incGold = createAction('GOLD', (p) => p);
    const action = incGold(10);
    assert(action.type === 'GOLD', `action type should be 'GOLD', got '${action.type}'`);
    assert(action.payload === 10, `action payload should be 10, got ${action.payload}`);
  });

  // --- Tests for state immutability ---

  test('getState returns a deep clone, not the internal state', () => {
    const store = createStore({ gold: 10, inventory: { sword: true } });
    const state1 = store.getState();
    state1.gold = 999;
    state1.inventory.potion = true;
    const state2 = store.getState();
    assert(state2.gold === 10, 'state should not be affected by external mutation');
    assert(state2.inventory.potion !== true, 'nested state should not be affected by external mutation');
  });

  // Print summary
  console.log(`\n${testsPassed}/${testsRun} tests passed`);
  if (testsPassed < testsRun) process.exit(1);
});
