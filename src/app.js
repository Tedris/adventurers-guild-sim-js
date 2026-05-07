// Adventurers Guild Simulator — Application Entry Point
// =====================================================

import { createStore } from './store.js';
import { initStore, loadState, enableAutoSave } from './save-load.js';
import { gameDefaults, validateGame } from './entities.js';

// ─── Validation ───

/**
 * Validate the full game state shape before merging saved data.
 * Protects against corrupted or tampered saves (T-05-01 mitigation).
 */
function validateGameShape(state) {
  if (!Array.isArray(state.adventurers)) return { valid: false, reason: 'Missing adventurers array' };
  if (!Array.isArray(state.quests)) return { valid: false, reason: 'Missing quests array' };
  if (!state.party || typeof state.party !== 'object') return { valid: false, reason: 'Missing party object' };
  return { valid: true };
}

// ─── Console Renderer (Phase 1) ───

// Phase 1: Console render for verification.
// TODO: Replace with DOM-based renderer in Phase 4 (src/render.js)
function render(state) {
  console.log('\n=== Game State ===');
  console.log(`Day: ${state.day} | Gold: ${state.gold} | Fame: ${state.fame}`);
  console.log(`Adventurers: ${state.adventurers.length}`);
  console.log(`Quests: ${state.quests.length}`);
  console.log(`Party: ${state.party?.adventurerIds?.length || 0} members`);
  console.log('=================\n');
}

// ─── Initialization ───

// Create initial state from entity defaults
const initialState = gameDefaults();

document.addEventListener("DOMContentLoaded", async () => {
  console.log("Adventurers Guild Simulator — Foundation initialized");

  // Step 1: Initialize IndexedDB (required before loadState)
  await initStore();

  // Step 2: Attempt to load saved state
  const savedState = await loadState();

  // Step 3: Create store with entity defaults
  const store = createStore(initialState, {});

  // Step 4: Enable auto-save FIRST (before any dispatch)
  // This ensures MERGE_STATE dispatch triggers persistence (T-05-03 mitigation)
  enableAutoSave(store);

  // Step 5: Subscribe for rendering
  store.subscribe(render);

  // Step 6: Restore saved state via dispatch (triggers auto-save + render)
  // MERGE_STATE reducer case (in store.js) replaces state with the payload
  if (savedState) {
    // Validate saved state shape before merging (T-05-01 mitigation)
    const validation = validateGameShape(savedState);
    if (!validation.valid) {
      console.warn(`[App] Saved state invalid: ${validation.reason} — starting fresh`);
      render(store.getState());
    } else {
      store.dispatch({ type: 'MERGE_STATE', payload: savedState });
      console.log('Loaded saved game state');
    }
  } else {
    console.log('No saved state found — starting fresh');
    // Initial render for fresh start (no dispatch occurs, so render manually)
    render(store.getState());
  }
});
