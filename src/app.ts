// Adventurers Guild Simulator — Application Entry Point
// =====================================================
// Wires together: store, entities, save-load
// Handles: initialization, state restoration, auto-save, rendering

import { createStore } from './store.js';
import { initStore, loadState, clearStore, enableAutoSave, saveState } from './save-load';
import { gameDefaults, getFameLevel } from './entities/index.js';
import { renderCard, renderView, showConfirmModal, hideModal, showEventModal } from './render/index.js';
import type { ViewName } from './render/tab.js';
import { createGameTicker } from './ticker.js';
import type { GameState, StoreAction, ValidationResult } from './types.js';



// ─── Validation ───

/**
 * Validate the full game state shape before merging saved data.
 * Protects against corrupted or tampered saves (T-05-01 mitigation).
 */
function validateGameShape(state: GameState): ValidationResult {
  if (!Array.isArray(state.adventurers)) return { valid: false, reason: 'Missing adventurers array' };
  if (!Array.isArray(state.quests)) return { valid: false, reason: 'Missing quests array' };
  if (!state.party || typeof state.party !== 'object') return { valid: false, reason: 'Missing party object' };
  return { valid: true };
}

// ─── View State (Phase 4-02) ───

/**
 * Current active view name — synced with tab navigation.
 */
let currentView: ViewName = 'dashboard';

// ─── DOM Renderer (Phase 4) ───

/**
 * Update header stats display (day, gold, fame).
 * @param state - Current game state
 */
function updateHeaderStats(state: GameState, dayDisplay: HTMLElement | null, goldDisplay: HTMLElement | null, fameDisplay: HTMLElement | null): void {
  if (dayDisplay) dayDisplay.textContent = `Day: ${state.day}`;
  if (goldDisplay) goldDisplay.textContent = `Gold: ${state.gold}`;
  if (fameDisplay) {
    const fameLevel = getFameLevel(state.fame ?? 0);
    fameDisplay.textContent = `Fame: ${state.fame} (${fameLevel.name})`;
    fameDisplay.title = `Fame Level: ${fameLevel.name} — ${fameLevel.progress > 0.99 ? 'Max' : `${(fameLevel.progress * 100).toFixed(0)}% to ${fameLevel.nextLevel || 'Max'}`}`;
  }
}

/**
 * DOM-based renderer — delegates to renderView for view-specific rendering.
 * Called on every store dispatch for full re-render (D-07).
 * @param state - Current game state
 */
function render(state: GameState, dayDisplay: HTMLElement | null, goldDisplay: HTMLElement | null, fameDisplay: HTMLElement | null, dispatch?: (action: StoreAction) => boolean): void {
  // Update header stats
  updateHeaderStats(state, dayDisplay, goldDisplay, fameDisplay);

  // Render current view
  const viewName = getValidViewName(state._currentView) ?? currentView;
  renderView(viewName, state, dispatch);
}

/**
 * Validate and return a valid ViewName from a potentially invalid string.
 * Returns 'dashboard' as fallback if the input is invalid or undefined.
 */
function getValidViewName(viewName: string | undefined): ViewName | null {
  if (!viewName) return null;
  const validViews: ViewName[] = ['dashboard', 'roster', 'recruitment', 'quests', 'events', 'upgrades'];
  if (validViews.includes(viewName as ViewName)) {
    return viewName as ViewName;
  }
  return null;
}

// ─── Initialization ───

// Create initial state from entity defaults
const initialState = gameDefaults() as unknown as GameState;

document.addEventListener('DOMContentLoaded', async (): Promise<void> => {
  console.log('Adventurers Guild Simulator — Foundation initialized');

  // Step 0: Cache DOM element references (must be after DOM ready)
  const dayDisplay = document.getElementById('day-display');
  const goldDisplay = document.getElementById('gold-display');
  const fameDisplay = document.getElementById('fame-display');

  // Step 1: Initialize IndexedDB (required before loadState)
  await initStore();

  // Step 2: Attempt to load saved state
  const savedState: GameState | null = await loadState();

  // Step 3: Create store with entity defaults
  const store = createStore(initialState);

  // Step 4: Enable auto-save FIRST (before any dispatch)
  // This ensures MERGE_STATE dispatch triggers persistence (T-05-03 mitigation)
  enableAutoSave(store);

  // Step 4.5: Start the game ticker for auto quest completion
  const ticker = createGameTicker(store);

  // Step 5: Subscribe for rendering
  const unsubscribe = store.subscribe((state, _action) => { render(state, dayDisplay, goldDisplay, fameDisplay, store.dispatch); });

  // Cleanup subscription on page unload to prevent memory leaks
  window.addEventListener('beforeunload', () => {
    unsubscribe();
    ticker.stop();
  });

  // Step 6: Tab navigation wiring (Phase 4-02)
  const navTabs: NodeListOf<HTMLElement> = document.querySelectorAll('.nav-tab');
  navTabs.forEach((tab: HTMLElement): void => {
    tab.addEventListener('click', (event: MouseEvent): void => {
      event.preventDefault();

      // Update active tab styling
      navTabs.forEach((t: HTMLElement): void => t.classList.remove('active'));
      tab.classList.add('active');

      // Update view state
      const tabView = getValidViewName(tab.dataset.tab ?? '');
      currentView = tabView ?? 'dashboard';

      // Render the new view
      const state = store.getState();
      renderView(currentView, state, store.dispatch);
    });
  });

  // Step 6b: Next Day button
  const nextDayBtn: HTMLElement | null = document.getElementById('btn-next-day');
  if (nextDayBtn) {
    nextDayBtn.addEventListener('click', (): void => {
      store.dispatch({ type: 'TICK', payload: { tickCount: 1 } });
    });
  }

  // Step 6c: Save button (manual save, auto-save is already enabled)
  const saveBtn: HTMLElement | null = document.getElementById('btn-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', async (): Promise<void> => {
      const state: GameState = store.getState();
      try {
        await saveState(state);
        saveBtn.textContent = 'Saved!';
        setTimeout(() => { saveBtn.textContent = 'Save Game'; }, 1500);
      } catch (e: unknown) {
        console.error('[App] Manual save failed:', e);
        saveBtn.textContent = 'Save Failed';
        setTimeout(() => { saveBtn.textContent = 'Save Game'; }, 1500);
      }
    });
  }

  // Step 6d: Load button
  const loadBtn: HTMLElement | null = document.getElementById('btn-load');
  if (loadBtn) {
    loadBtn.addEventListener('click', async (): Promise<void> => {
      try {
        const loadedState: GameState | null = await loadState();
        if (!loadedState) {
          loadBtn.textContent = 'No Save Found';
          setTimeout(() => { loadBtn.textContent = 'Load Game'; }, 1500);
          return;
        }
        const validation: ValidationResult = validateGameShape(loadedState);
        if (!validation.valid) {
          console.warn(`[App] Saved state invalid: ${validation.reason}`);
          loadBtn.textContent = 'Corrupt Save';
          setTimeout(() => { loadBtn.textContent = 'Load Game'; }, 1500);
          return;
         }
        store.dispatch({ type: 'MERGE_STATE', payload: loadedState });
        const view = getValidViewName(loadedState._currentView);
        currentView = view ?? 'dashboard';
        render(store.getState(), dayDisplay, goldDisplay, fameDisplay, store.dispatch);
        loadBtn.textContent = 'Loaded!';
        setTimeout(() => { loadBtn.textContent = 'Load Game'; }, 1500);
      } catch (e: unknown) {
        console.error('[App] Manual load failed:', e);
        loadBtn.textContent = 'Load Failed';
        setTimeout(() => { loadBtn.textContent = 'Load Game'; }, 1500);
      }
    });
  }

  // Step 6e: New Game button
  const newGameBtn: HTMLElement | null = document.getElementById('btn-new-game');
  if (newGameBtn) {
    newGameBtn.addEventListener('click', async (): Promise<void> => {
      if (!confirm('Start a new game? This will erase your current progress.')) return;
      try {
        await clearStore();
        store.dispatch({ type: 'MERGE_STATE', payload: gameDefaults() as unknown as GameState });
        currentView = 'dashboard';
        render(store.getState(), dayDisplay, goldDisplay, fameDisplay, store.dispatch);
        newGameBtn.textContent = 'New Game!';
        setTimeout(() => { newGameBtn.textContent = 'New Game'; }, 1500);
      } catch (e: unknown) {
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
    const validation: ValidationResult = validateGameShape(savedState);
    if (!validation.valid) {
      console.warn(`[App] Saved state invalid: ${validation.reason} — starting fresh`);
      // Restore view from saved state or default
      const view = getValidViewName(savedState._currentView);
      currentView = view ?? 'dashboard';
render(store.getState(), dayDisplay, goldDisplay, fameDisplay, store.dispatch);
     } else {
        store.dispatch({ type: 'MERGE_STATE', payload: savedState });
        console.log('Loaded saved game state');
        // Restore view from saved state
        const view = getValidViewName(savedState._currentView);
        currentView = view ?? 'dashboard';
        render(store.getState(), dayDisplay, goldDisplay, fameDisplay, store.dispatch);
      }
   } else {
      console.log('No saved state found — starting fresh');
      // Initial render for fresh start (no dispatch occurs, so render manually)
      render(store.getState(), dayDisplay, goldDisplay, fameDisplay, store.dispatch);
    }
});
