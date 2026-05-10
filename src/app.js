// Adventurers Guild Simulator — Application Entry Point
// =====================================================
// Wires together: store.js, entities.js, save-load.js
// Handles: initialization, state restoration, auto-save, rendering

import { createStore } from './store.js';
import { initStore, loadState, enableAutoSave } from './save-load.js';
import { gameDefaults, validateGame } from './entities.js';
import { renderCard } from './render.js';

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

// ─── DOM Renderer (Phase 4) ───

/**
 * DOM-based renderer — clears #game-content and renders cards based on state.
 * Called on every store dispatch for full re-render (D-07).
 * @param {Object} state - Current game state
 */
function render(state) {
  const container = document.getElementById('game-content');
  if (!container) return; // DOM not ready yet

  // Clear existing content
  container.innerHTML = '';

  // Render based on current active view
  const currentView = state._currentView || 'dashboard';

  // Dashboard view: show overview cards
  if (currentView === 'dashboard') {
    renderDashboardView(container, state);
  }
  // Roster view: show adventurer cards
  else if (currentView === 'roster') {
    renderRosterView(container, state);
  }
  // Quest Board view: show quest cards
  else if (currentView === 'quests') {
    renderQuestBoardView(container, state);
  }
  // Events view: show event cards
  else if (currentView === 'events') {
    renderEventsView(container, state);
  }
  // Upgrades view: placeholder (Phase 5)
  else if (currentView === 'upgrades') {
    renderUpgradesView(container, state);
  }
  // Default: show a simple placeholder
  else {
    const placeholder = document.createElement('div');
    placeholder.className = 'card';
    placeholder.textContent = `View: ${currentView} — Day ${state.day}`;
    container.appendChild(placeholder);
  }
}

/**
 * Render dashboard view cards.
 */
function renderDashboardView(container, state) {
  // Show active quest if any
  if (state.activeQuest) {
    const questCard = renderCard('quest', state.activeQuest.questData || state.activeQuest, state);
    if (questCard) container.appendChild(questCard);
  }

  // Show recent events
  const events = state.events || [];
  const recentEvents = events.filter(e => !e.resolved).slice(-3).reverse();
  for (const event of recentEvents) {
    const eventCard = renderCard('event', event, state);
    if (eventCard) container.appendChild(eventCard);
  }

  // Show adventurers count card if no active quest or events
  if (recentEvents.length === 0 && !state.activeQuest) {
    const summary = document.createElement('div');
    summary.className = 'card';
    summary.style.gridColumn = '1 / -1';
    summary.style.textAlign = 'center';
    summary.style.padding = '32px';
    summary.innerHTML = `
      <h3 style="margin-bottom: 8px;">Guild Dashboard</h3>
      <p>Day <strong>${state.day}</strong> | Gold: <strong>${state.gold}</strong> | Fame: <strong>${state.fame}</strong></p>
      <p>Adventurers: <strong>${(state.adventurers || []).length}</strong> | Quests available: <strong>${(state.quests || []).length}</strong></p>
    `;
    container.appendChild(summary);
  }
}

/**
 * Render roster view — adventurer cards for all rostered adventurers.
 */
function renderRosterView(container, state) {
  const adventurers = state.adventurers || [];
  if (adventurers.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card';
    empty.style.gridColumn = '1 / -1';
    empty.style.textAlign = 'center';
    empty.style.padding = '32px';
    empty.textContent = 'No adventurers yet. Hire from the recruitment pool!';
    container.appendChild(empty);
  } else {
    for (const adventurer of adventurers) {
      const card = renderCard('adventurer', adventurer, state);
      if (card) container.appendChild(card);
    }
  }
}

/**
 * Render quest board view — available quest cards.
 */
function renderQuestBoardView(container, state) {
  const quests = state.quests || [];
  if (quests.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card';
    empty.style.gridColumn = '1 / -1';
    empty.style.textAlign = 'center';
    empty.style.padding = '32px';
    empty.textContent = 'No quests available. Check back later!';
    container.appendChild(empty);
  } else {
    for (const quest of quests) {
      const card = renderCard('quest', quest, state);
      if (card) container.appendChild(card);
    }
  }
}

/**
 * Render events view — unresolved event cards.
 */
function renderEventsView(container, state) {
  const events = state.events || [];
  const unresolved = events.filter(e => !e.resolved);
  if (unresolved.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card';
    empty.style.gridColumn = '1 / -1';
    empty.style.textAlign = 'center';
    empty.style.padding = '32px';
    empty.textContent = 'No active events. All clear!';
    container.appendChild(empty);
  } else {
    for (const event of unresolved) {
      const card = renderCard('event', event, state);
      if (card) container.appendChild(card);
    }
  }
}

/**
 * Render upgrades view — placeholder for Phase 5.
 */
function renderUpgradesView(container, state) {
  const placeholder = document.createElement('div');
  placeholder.className = 'card';
  placeholder.style.gridColumn = '1 / -1';
  placeholder.style.textAlign = 'center';
  placeholder.style.padding = '32px';
  placeholder.textContent = 'Upgrades — Coming in a future update!';
  container.appendChild(placeholder);
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
