// Adventurers Guild Simulator — Application Entry Point
// =====================================================
// Wires together: store.js, entities.js, save-load.js
// Handles: initialization, state restoration, auto-save, rendering

import { createStore } from './store.js';
import { initStore, loadState, clearStore, enableAutoSave } from './save-load.js';
import { gameDefaults, validateGame, getFameLevel } from './entities/index.js';
import { renderCard, renderView } from './render.js';

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

// ─── View State (Phase 4-02) ───

/**
 * Current active view name — synced with tab navigation.
 * @type {string}
 */
let currentView = 'dashboard';

// ─── DOM Renderer (Phase 4) ───

/**
 * Update header stats display (day, gold, fame).
 * @param {Object} state - Current game state
 */
function updateHeaderStats(state) {
  const dayDisplay = document.getElementById('day-display');
  const goldDisplay = document.getElementById('gold-display');
  const fameDisplay = document.getElementById('fame-display');

  if (dayDisplay) dayDisplay.textContent = `Day: ${state.day}`;
  if (goldDisplay) goldDisplay.textContent = `Gold: ${state.gold}`;
  if (fameDisplay) {
    const fameLevel = getFameLevel(state.fame || 0);
    fameDisplay.textContent = `Fame: ${state.fame} (${fameLevel.name})`;
    fameDisplay.title = `Fame Level: ${fameLevel.name} — ${fameLevel.progress > 0.99 ? 'Max' : `${(fameLevel.progress * 100).toFixed(0)}% to ${fameLevel.nextLevel || 'Max'}`}`;
  }
}

/**
 * DOM-based renderer — delegates to renderView for view-specific rendering.
 * Called on every store dispatch for full re-render (D-07).
 * @param {Object} state - Current game state
 */
function render(state) {
  // Update header stats
  updateHeaderStats(state);

  // Render current view
  const viewName = state._currentView || currentView;
  renderView(viewName, state);
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

  // Expose store globally for UI components to dispatch actions
  window.__guildStore = store;

  // Step 4: Enable auto-save FIRST (before any dispatch)
  // This ensures MERGE_STATE dispatch triggers persistence (T-05-03 mitigation)
  enableAutoSave(store);

  // Step 5: Subscribe for rendering
  store.subscribe(render);

  // Step 6: Tab navigation wiring (Phase 4-02)
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Update active tab styling
      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update view state
      currentView = tab.dataset.tab;

      // Render the new view
      const state = store.getState();
      renderView(currentView, state);
    });
  });

  // Step 6b: Next Day button
  const nextDayBtn = document.getElementById('btn-next-day');
  if (nextDayBtn) {
    nextDayBtn.addEventListener('click', () => {
      if (window.__guildStore) {
        window.__guildStore.dispatch({ type: 'TICK', payload: { tickCount: 1 } });
      }
    });
  }

  // Step 6c: Save button (manual save, auto-save is already enabled)
  const saveBtn = document.getElementById('btn-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (window.__guildStore) {
        const state = window.__guildStore.getState();
        try {
          await saveState(state);
          saveBtn.textContent = 'Saved!';
          setTimeout(() => { saveBtn.textContent = 'Save Game'; }, 1500);
        } catch (e) {
          console.error('[App] Manual save failed:', e);
          saveBtn.textContent = 'Save Failed';
          setTimeout(() => { saveBtn.textContent = 'Save Game'; }, 1500);
        }
      }
    });
  }

  // Step 6d: Load button
  const loadBtn = document.getElementById('btn-load');
  if (loadBtn) {
    loadBtn.addEventListener('click', async () => {
      try {
        const savedState = await loadState();
        if (!savedState) {
          loadBtn.textContent = 'No Save Found';
          setTimeout(() => { loadBtn.textContent = 'Load Game'; }, 1500);
          return;
        }
        const validation = validateGameShape(savedState);
        if (!validation.valid) {
          console.warn(`[App] Saved state invalid: ${validation.reason}`);
          loadBtn.textContent = 'Corrupt Save';
          setTimeout(() => { loadBtn.textContent = 'Load Game'; }, 1500);
          return;
        }
        if (window.__guildStore) {
          window.__guildStore.dispatch({ type: 'MERGE_STATE', payload: savedState });
          currentView = savedState._currentView || 'dashboard';
          render(window.__guildStore.getState());
        }
        loadBtn.textContent = 'Loaded!';
        setTimeout(() => { loadBtn.textContent = 'Load Game'; }, 1500);
      } catch (e) {
        console.error('[App] Manual load failed:', e);
        loadBtn.textContent = 'Load Failed';
        setTimeout(() => { loadBtn.textContent = 'Load Game'; }, 1500);
      }
    });
  }

  // Step 6e: New Game button
  const newGameBtn = document.getElementById('btn-new-game');
  if (newGameBtn) {
    newGameBtn.addEventListener('click', async () => {
      if (!confirm('Start a new game? This will erase your current progress.')) return;
      try {
        await clearStore();
        if (window.__guildStore) {
          window.__guildStore.dispatch({ type: 'MERGE_STATE', payload: gameDefaults() });
          currentView = 'dashboard';
          render(window.__guildStore.getState());
        }
        newGameBtn.textContent = 'New Game!';
        setTimeout(() => { newGameBtn.textContent = 'New Game'; }, 1500);
      } catch (e) {
        console.error('[App] New game failed:', e);
        newGameBtn.textContent = 'Error';
        setTimeout(() => { newGameBtn.textContent = 'New Game'; }, 1500);
      }
    });
  }

  // Step 7: Restore saved state via dispatch (triggers auto-save + render)
  // MERGE_STATE reducer case (in store.js) replaces state with the payload
  if (savedState) {
    // Validate saved state shape before merging (T-05-01 mitigation)
    const validation = validateGameShape(savedState);
    if (!validation.valid) {
      console.warn(`[App] Saved state invalid: ${validation.reason} — starting fresh`);
      // Restore view from saved state or default
      currentView = savedState._currentView || 'dashboard';
      render(store.getState());
    } else {
      store.dispatch({ type: 'MERGE_STATE', payload: savedState });
      console.log('Loaded saved game state');
      // Restore view from saved state
      currentView = savedState._currentView || 'dashboard';
      render(store.getState());
    }
  } else {
    console.log('No saved state found — starting fresh');
    // Initial render for fresh start (no dispatch occurs, so render manually)
    render(store.getState());
  }
});
