// Adventurers Guild Simulator — Click-to-Earn Gold Tests
// Tests for CLICK action, floating text, screen shake, and click SFX

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

// Import modules
Promise.all([
  import('./store.js'),
  import('./click-effects.js').catch(() => null),
]).then(([storeModule, effectsModule]) => {
  const { createStore } = storeModule;

  // ═══════════════════════════════════════════
  // CLICK Action Tests
  // ═══════════════════════════════════════════

  test('CLICK: dispatches and increments gold by 1', () => {
    const store = createStore({ gold: 10 });
    const result = store.dispatch({ type: 'CLICK' });
    assert(result === true, 'CLICK should return true');
    const state = store.getState();
    assert(state.gold === 11, `gold should be 11 after 1 click, got ${state.gold}`);
  });

  test('CLICK: increments gold by payload when specified', () => {
    const store = createStore({ gold: 10 });
    const result = store.dispatch({ type: 'CLICK', payload: 5 });
    assert(result === true, 'CLICK should return true with payload');
    const state = store.getState();
    assert(state.gold === 15, `gold should be 15 after 1 click of value 5, got ${state.gold}`);
  });

  test('CLICK: handles rapid successive clicks', () => {
    const store = createStore({ gold: 10 });
    for (let i = 0; i < 15; i++) {
      store.dispatch({ type: 'CLICK' });
    }
    const state = store.getState();
    assert(state.gold === 25, `gold should be 25 after 15 clicks, got ${state.gold}`);
  });

  test('CLICK: rapid clicks with mixed payloads', () => {
    const store = createStore({ gold: 10 });
    store.dispatch({ type: 'CLICK' });
    store.dispatch({ type: 'CLICK', payload: 3 });
    store.dispatch({ type: 'CLICK' });
    const state = store.getState();
    assert(state.gold === 15, `gold should be 15 (10+1+3+1), got ${state.gold}`);
  });

  test('CLICK: gold never goes below zero', () => {
    const store = createStore({ gold: 0 });
    const result = store.dispatch({ type: 'CLICK' });
    assert(result === true, 'CLICK should return true even at 0');
    const state = store.getState();
    assert(state.gold >= 0, `gold should be >= 0, got ${state.gold}`);
  });

  test('CLICK: without payload defaults to 1', () => {
    const store = createStore({ gold: 100 });
    store.dispatch({ type: 'CLICK' });
    store.dispatch({ type: 'CLICK' });
    store.dispatch({ type: 'CLICK' });
    const state = store.getState();
    assert(state.gold === 103, `gold should be 103 (100+1+1+1), got ${state.gold}`);
  });

  test('CLICK: falls back to baseClickValue from state when no payload', () => {
    const store = createStore({ gold: 10, baseClickValue: 5 });
    store.dispatch({ type: 'CLICK' });
    store.dispatch({ type: 'CLICK' });
    const state = store.getState();
    assert(state.gold === 20, `gold should be 20 (10+5+5), got ${state.gold}`);
  });

  // ═══════════════════════════════════════════
  // Floating Text Tests (browser-only)
  // ═══════════════════════════════════════════

  if (typeof document !== 'undefined' && effectsModule) {
    test('createFloatingText: creates a DOM element', () => {
      const { createFloatingText } = effectsModule;
      const container = document.createElement('div');
      document.body.appendChild(container);
      const el = createFloatingText(container, 100, 200, '+1G');
      assert(el instanceof HTMLElement, 'should return an HTMLElement');
      assert(el.textContent === '+1G', 'floating text should contain +1G');
      document.body.removeChild(container);
    });

    test('createFloatingText: positions element at given coordinates', () => {
      const { createFloatingText } = effectsModule;
      const container = document.createElement('div');
      document.body.appendChild(container);
      const el = createFloatingText(container, 50, 100, '+1G');
      assert(el.style.left === '50px', `left should be 50px, got ${el.style.left}`);
      assert(el.style.top === '100px', `top should be 100px, got ${el.style.top}`);
      document.body.removeChild(container);
    });

    test('createFloatingText: multiple rapid clicks create multiple elements', () => {
      const { createFloatingText } = effectsModule;
      const container = document.createElement('div');
      document.body.appendChild(container);
      const els = [];
      for (let i = 0; i < 10; i++) {
        els.push(createFloatingText(container, 50 + i * 5, 100, '+1G'));
      }
      assert(container.children.length === 10, `should have 10 floating texts, got ${container.children.length}`);
      document.body.removeChild(container);
    });
  }

  // ═══════════════════════════════════════════
  // Screen Shake Tests (browser-only)
  // ═══════════════════════════════════════════

  if (typeof document !== 'undefined' && effectsModule) {
    test('triggerScreenShake: plays WAAPI animation', () => {
      const { triggerScreenShake } = effectsModule;
      const element = document.createElement('div');
      document.body.appendChild(element);
      const animation = triggerScreenShake(element);
      assert(animation instanceof Animation, 'should return an Animation handle');
      assert(animation.playState === 'running', 'animation should be running');
      document.body.removeChild(element);
    });
  }

  // ═══════════════════════════════════════════
  // Audio Context Tests (browser-only)
  // ═══════════════════════════════════════════

  if (typeof window !== 'undefined' && effectsModule) {
    test('getAudioContext: initializes Web Audio API context', () => {
      const { getAudioContext } = effectsModule;
      const ctx = getAudioContext();
      assert(ctx instanceof AudioContext, 'should return an AudioContext');
    });

    test('getAudioContext: reuses existing AudioContext', () => {
      const { getAudioContext } = effectsModule;
      const ctx1 = getAudioContext();
      const ctx2 = getAudioContext();
      assert(ctx1 === ctx2, 'should return the same AudioContext instance');
    });
  }

  // Print summary
  console.log(`\n${testsPassed}/${testsRun} tests passed`);
  if (testsPassed < testsRun) process.exit(1);
});
