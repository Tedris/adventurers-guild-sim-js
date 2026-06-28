// Adventurers Guild Simulator — Tab View Management
// ===================================================
// View rendering and navigation logic extracted from render.js.
// Handles dashboard, roster, recruitment, quests, events, and upgrades views.

import type { GameState, Adventurer, OfficeLevelResult, FameLevelResult, EventTemplate, Quest, Stats } from '../types.js';
import {
  calculateOfficeLevel,
  getFameLevel,
  getAvailableUpgrades,
  getUpgradeEffect,
  getFameGatedQuestPool,
  generateRecruitmentPool,
  calculateStatContribution,
  calculatePartyEffectiveStat,
  calculateQuestSuccessRate,
  calculateSynergyScore,
  PERSONALITY_TRAIT_TABLE,
  MAX_PARTY_SIZE,
  MIN_PARTY_SIZE,
  computePartyStatBreakdown,
  computePerAdventurerStatContribution,
} from '../entities/index.js';
import { renderCard, trackEventListener, detachAllListeners } from './card.js';
import type { CardType, DispatchFn } from './card.js';
import { hideTooltip, showFameMechanicTooltip, showWageMechanicTooltip, showEvolutionMechanicTooltip, showStatBreakdownTooltip, showStatAttributionTooltip, isTooltipVisible, positionTooltip } from './tooltip.js';
import { CLASS_EVOLUTIONS } from '../entities/index.js';
import { showConfirmModal } from './event-display.js';
import {
  slideInFromRight,
  fadeOutAndShrink,
  playAnimation,
  playAnimationAsync,
  prefersReducedMotion,
  tabSlideTransition,
  upgradeSuccessAnimation,
} from '../animation.js';
import { VirtualList } from '../virtual-list.js';

// ─── Animation State Tracking ──────────────────────────

/**
 * Tracks previously rendered card elements per container, keyed by container element.
 * Used to detect card additions/removals for animation purposes.
 */
const _oldCards = new WeakMap<HTMLElement, HTMLElement[]>();

// ─── Virtual List State ────────────────────────────────

/**
 * The active VirtualList instance for the roster view (if virtualization is active).
 * Stored per-container to support view switching.
 */
const _virtualLists = new WeakMap<HTMLElement, VirtualList>();

/**
 * Threshold: use virtual list when adventurer count exceeds this value.
 */
const VIRTUAL_LIST_THRESHOLD = 20;

/**
 * Fixed height for each adventurer card row (including gap).
 * Estimated from CSS: padding + header + stats + morale + equipment + footer.
 */
const CARD_ROW_HEIGHT = 220;

/**
 * Highlight roster cards matching the given adventurer IDs.
 * Adds `.highlighted-stat-contributor` class to matching cards.
 * @param adventurerIds — Array of adventurer IDs to highlight
 */
function highlightRosterCards(adventurerIds: string[]): void {
  const allCards = document.querySelectorAll('.roster-card');
  for (const card of allCards) {
    const cardId = card.getAttribute('data-adventurer-id');
    if (cardId && adventurerIds.includes(cardId)) {
      card.classList.add('highlighted-stat-contributor');
    }
  }
}

/**
 * Clear all roster card highlights.
 */
function clearRosterHighlights(): void {
  document.querySelectorAll('.roster-card.highlighted-stat-contributor').forEach((card) => {
    card.classList.remove('highlighted-stat-contributor');
  });
}

// ─── Drag-and-Drop Helpers ─────────────────────────────

/**
 * MIME type for drag-and-drop data transfer.
 */
const DND_ADVENTURER_ID_TYPE = 'application/adventurer-id';

/**
 * Global drag-in-progress flag — set to true when any drag is active.
 * Prevents virtual list card recycling from interfering with active drags.
 */
let _isDragging = false;

/**
 * Create a drag ghost element for HTML5 drag-and-drop.
 * The ghost is a clone of the source card with reduced opacity and shadow.
 * Visual styles are applied via .drag-ghost CSS class; only positioning
 * is set inline to keep the ghost off-screen until setDragImage captures it.
 */
function createDragGhost(source: HTMLElement): HTMLElement {
  const ghost = source.cloneNode(true) as HTMLElement;
  ghost.style.position = 'fixed';
  ghost.style.top = '-9999px';
  ghost.style.left = '-9999px';
  ghost.classList.add('drag-ghost');
  document.body.appendChild(ghost);
  return ghost;
}

/**
 * Clean up the drag ghost element.
 */
function cleanupDragGhost(): void {
  const ghost = document.querySelector('.drag-ghost');
  if (ghost) {
    ghost.remove();
  }
}

/**
 * Remove the 'dragging' class from all roster cards.
 * Called when drag ends or is cancelled.
 */
function clearDraggingClasses(): void {
  document.querySelectorAll('.roster-card.dragging').forEach((el) => {
    el.classList.remove('dragging');
  });
}

/**
 * Show a brief validation error message in a panel.
 * Displays a toast notification and flashes the drop target red.
 * Auto-dismisses after 1.5 seconds.
 * @param panel — The panel element to render the toast within
 * @param message — Error message to display
 */
 function showValidationError(panel: HTMLElement, message: string): void {
  const existingToast = panel.querySelector('.validation-toast');
  if (existingToast) existingToast.remove();

  if (!panel.style.position || panel.style.position === 'static') {
    panel.style.position = 'relative';
  }

  const toast = document.createElement('div');
  toast.className = 'validation-toast';
  toast.textContent = message;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');

  panel.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    setTimeout(() => toast.remove(), 300);
  }, 1500);
}

/**
 * Attach drag-and-drop event handlers to a roster card element.
 * Makes the card draggable and sets up drag ghost creation.
 */
function attachDragSourceHandlers(
  card: HTMLElement,
  adventurerId: string,
  dispatch?: DispatchFn,
  state?: GameState,
  partyId?: string,
): void {
  card.setAttribute('draggable', 'true');

  const dragStartHandler = (e: DragEvent) => {
    _isDragging = true;
    const dt = e.dataTransfer;
    if (!dt) return;

    dt.effectAllowed = 'move';
    dt.setData(DND_ADVENTURER_ID_TYPE, adventurerId);

    card.classList.add('dragging');

    // Create visual drag ghost
    const ghost = createDragGhost(card);
    // Set ghost position relative to cursor (50px right, 20px down from top-left of cursor)
    e.dataTransfer.setDragImage(ghost, 50, 20);
    // Clean up ghost after a frame (let the browser capture the image)
    requestAnimationFrame(() => {
      cleanupDragGhost();
    });
  };

  const dragEndHandler = () => {
    _isDragging = false;
    card.classList.remove('dragging');
  };

  trackEventListener(card, 'dragstart', dragStartHandler);
  trackEventListener(card, 'dragend', dragEndHandler);
}

/**
 * Attach drag-and-drop event handlers to a party member item in the overview panel.
 * Makes the party member slot a drop target for adding adventurers.
 */
function attachDropTargetHandlers(
  memberItem: HTMLElement,
  targetAction: 'add' | 'remove',
  dispatch?: DispatchFn,
  state?: GameState,
  partyId?: string,
): void {
  memberItem.setAttribute('data-party-drop', targetAction);
  memberItem.draggable = false; // prevent re-dragging from panel

  const dragOverHandler = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    memberItem.classList.add('drag-over');
  };

  const dragLeaveHandler = () => {
    memberItem.classList.remove('drag-over');
  };

  const dropHandler = (e: DragEvent) => {
    e.preventDefault();
    memberItem.classList.remove('drag-over');

    const dt = e.dataTransfer;
    if (!dt) return;

    const adventurerId = dt.getData(DND_ADVENTURER_ID_TYPE);
    if (!adventurerId) return;

    // Verify this is our drag type
    const hasOurDragType = Array.from(dt.types || []).some(
      (t) => t === DND_ADVENTURER_ID_TYPE,
    );
    if (!hasOurDragType) return;

    if (!dispatch || !state || !partyId) return;

    const currentParty = state.party?.adventurerIds || [];

    if (targetAction === 'add') {
      // Check 1: Duplicate adventurer
      if (currentParty.includes(adventurerId)) {
        const errorTarget = memberItem.closest('.party-over-panel') || memberItem.closest('.party-overview-panel') || memberItem.parentElement;
        if (errorTarget) {
          showValidationError(errorTarget, 'Adventurer already in party!');
          errorTarget.classList.add('validation-error');
          setTimeout(() => errorTarget.classList.remove('validation-error'), 500);
        }
        clearDraggingClasses();
        return;
      }

      // Check 2: Party size limit
      if (currentParty.length >= MAX_PARTY_SIZE) {
        const errorTarget = memberItem.closest('.party-over-panel') || memberItem.closest('.party-overview-panel') || memberItem.parentElement;
        if (errorTarget) {
          showValidationError(errorTarget, `Party is full (${currentParty.length}/${MAX_PARTY_SIZE})`);
          errorTarget.classList.add('validation-error');
          setTimeout(() => errorTarget.classList.remove('validation-error'), 500);
        }
        clearDraggingClasses();
        return;
      }

      // Both checks passed — proceed with existing dispatch logic
      dispatch({
        type: 'ASSIGN_PARTY',
        payload: {
          partyId,
          adventurerIds: [...currentParty, adventurerId],
        },
      });
    } else if (targetAction === 'remove') {
      dispatch({
        type: 'ASSIGN_PARTY',
        payload: {
          partyId,
          adventurerIds: currentParty.filter((id) => id !== adventurerId),
        },
      });
    }

    clearDraggingClasses();
  };

  trackEventListener(memberItem, 'dragover', dragOverHandler);
  trackEventListener(memberItem, 'dragleave', dragLeaveHandler);
  trackEventListener(memberItem, 'drop', dropHandler);
}

// ─── View Types ────────────────────────────────────────

export type ViewName = 'dashboard' | 'roster' | 'recruitment' | 'quests' | 'events' | 'upgrades';

// ─── View Dispatcher ───────────────────────────────────

/**
 * View order mapping for transition direction detection.
 */
const VIEW_ORDER: Record<ViewName, number> = {
  dashboard: 0,
  roster: 1,
  recruitment: 2,
  quests: 3,
  events: 4,
  upgrades: 5,
};

/**
 * Track the previously rendered view per container for transition direction detection.
 */
const _lastView = new Map<string, ViewName>();

/**
 * Animation lock: prevents reentrant tab clicks during active transitions.
 * Set to true when a WAAPI transition is in progress, preventing new transitions
 * from starting until the current one completes.
 */
let _isTransitioning = false;

/**
 * Render view content to a detached DOM fragment.
 * Handles safe cleanup of listeners and virtual lists before rendering new content.
 * The fragment is returned for DOM swapping with WAAPI animations.
 */
function _renderToFragment(viewName: ViewName, state: GameState, dispatch?: DispatchFn): HTMLElement {
  // Create a detached container for new content
  const fragment = document.createElement('div');
  fragment.className = 'tab-content';

  // Clean up listeners from the existing game-content container before rendering new content
  const realContainer = document.getElementById('game-content');
  if (realContainer) {
    // Destroy any virtual list on the current container before clearing
    const existingVL = _virtualLists.get(realContainer);
    if (existingVL) {
      existingVL.destroy();
      _virtualLists.delete(realContainer);
    }

    // Detach all tracked event listeners from old container
    detachAllListeners(realContainer);
  }

  // Render the view into the detached fragment
  _executeView(viewName, state, dispatch, fragment);

  return fragment;
}

/**
 * Dispatch rendering to the correct view based on tab name.
 * Uses WAAPI container swapping for smooth transitions with proper event listener retention.
 */
export function renderView(viewName: ViewName, state: GameState, dispatch?: DispatchFn): void {
  // Hide any floating tooltip before tab switching
  hideTooltip();

  const container = document.getElementById('game-content');

  // If no container exists (e.g., during SSR or initial setup), render directly
  if (!container) {
    // Already called hideTooltip() above, so direct body renders are safe
    switch (viewName) {
      case 'dashboard':
        renderDashboard(document.body, state, dispatch);
        break;
      case 'roster':
        renderRoster(document.body, state, dispatch);
        break;
      case 'recruitment':
        renderRecruitment(document.body, state, dispatch);
        break;
      case 'quests':
        renderQuestBoard(document.body, state, dispatch);
        break;
      case 'events':
        renderEvents(document.body, state, dispatch);
        break;
      case 'upgrades':
        renderUpgrades(document.body, state, dispatch);
        break;
      default:
        renderDashboard(document.body, state, dispatch);
        break;
    }
    renderSidebar(state);
    return;
  }

  const lastView = _lastView.get('game-content');
  _lastView.set('game-content', viewName);

  // If no previous view (first render), render directly without transition
  if (!lastView) {
    _executeView(viewName, state, dispatch, container);
    renderSidebar(state);
    return;
  }

  // Animation lock: prevent reentrant tab clicks during active transitions
  if (_isTransitioning) {
    return;
  }

  _isTransitioning = true;

  // Determine transition direction
  const currentIndex = VIEW_ORDER[lastView] ?? 0;
  const newIndex = VIEW_ORDER[viewName] ?? 0;
  const direction: 'left' | 'right' = newIndex > currentIndex ? 'left' : 'right';
  const transitions = tabSlideTransition(direction);

  // Render new view to a detached fragment
  const newContainer = _renderToFragment(viewName, state, dispatch);

  // If user prefers reduced motion, do an instant swap with no animation
  if (prefersReducedMotion()) {
    container.appendChild(newContainer);
    const oldContainer = container.firstElementChild as HTMLElement;
    if (oldContainer instanceof HTMLElement) {
      detachAllListeners(oldContainer);
      oldContainer.remove();
    }
    newContainer.style.position = '';
    newContainer.style.top = '';
    newContainer.style.left = '';
    newContainer.style.width = '';
    _isTransitioning = false;
    renderSidebar(state);
    return;
  }

  // Apply transition state class to container
  container.classList.add('tab-transitioning');

  // Set up both containers for WAAPI animation as absolute children
  container.appendChild(newContainer);
  const oldContainer = container.firstElementChild as HTMLElement;

  if (oldContainer instanceof HTMLElement) {
    oldContainer.classList.add('tab-content');
    oldContainer.style.position = 'absolute';
    oldContainer.style.top = '0';
    oldContainer.style.left = '0';
    oldContainer.style.width = '100%';
  }

  newContainer.style.position = 'absolute';
  newContainer.style.top = '0';
  newContainer.style.left = '0';
  newContainer.style.width = '100%';

  // Play both animations in parallel using WAAPI and wait for both to complete
  Promise.all([
    playAnimationAsync(oldContainer, transitions.out),
    playAnimationAsync(newContainer, transitions.in),
  ]).finally(() => {
    if (oldContainer.parentNode) {
      detachAllListeners(oldContainer);
      oldContainer.remove();
    }
    // Clean up inline styles after animation completes
    newContainer.style.position = '';
    newContainer.style.top = '';
    newContainer.style.left = '';
    newContainer.style.width = '';
    container.classList.remove('tab-transitioning');
    _isTransitioning = false;
  });

  // Update sidebar after view rendering
  renderSidebar(state);
}

/**
 * Execute the view rendering without animation (internal).
 * @param targetContainer — Container to render into (actual DOM element or detached fragment)
 */
function _executeView(viewName: ViewName, state: GameState, dispatch?: DispatchFn, targetContainer?: HTMLElement): void {
  const container = targetContainer ?? document.getElementById('game-content');
  if (!container) return;

  switch (viewName) {
    case 'dashboard':
      return renderDashboard(container, state, dispatch);
    case 'roster':
      return renderRoster(container, state, dispatch);
    case 'recruitment':
      return renderRecruitment(container, state, dispatch);
    case 'quests':
      return renderQuestBoard(container, state, dispatch);
    case 'events':
      return renderEvents(container, state, dispatch);
    case 'upgrades':
      return renderUpgrades(container, state, dispatch);
    default:
      return renderDashboard(container, state, dispatch);
  }
}

// ─── Notification Renderer ─────────────────────────────

/**
 * Render notification cards in the dashboard.
 * @param referenceContainer — The main content container (used as insertion point for notifications)
 */
export function renderNotifications(referenceContainer: HTMLElement, state: GameState, dispatch?: DispatchFn): void {
  const notifications = state.notifications || [];
  if (notifications.length === 0) return;

  // If rendering to the actual game-content, insert notifications before existing content
  const actualContainer = document.getElementById('game-content');
  const insertionTarget = (actualContainer === referenceContainer) ? actualContainer : referenceContainer;

  const notifContainer = document.createElement('div');
  notifContainer.id = 'notifications-container';

  for (const notif of notifications) {
    const notifCard = document.createElement('div');
    notifCard.className = 'notification-card';
    notifCard.setAttribute('data-notif-id', notif.id);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.textContent = '\u00d7';
    const closeHandler = () => {
      if (dispatch) {
        dispatch({
          type: 'CLEAR_NOTIFICATION',
          payload: { notificationId: notif.id },
        });
      }
    };
    trackEventListener(closeBtn, 'click', closeHandler);

    const notifText = document.createElement('span');
    notifText.textContent = notif.message;

    notifCard.appendChild(closeBtn);
    notifCard.appendChild(notifText);
    notifContainer.appendChild(notifCard);
  }

  const existing = insertionTarget.querySelector('#notifications-container') as HTMLElement;
  if (existing) {
    detachAllListeners(existing);
    existing.remove();
  }
  insertionTarget.insertBefore(notifContainer, insertionTarget.firstChild);
}

// ─── Dashboard View ────────────────────────────────────

/**
 * Dashboard view — overview cards (office level, active quest, party status, recent events).
 */
export function renderDashboard(container: HTMLElement, state: GameState, dispatch?: DispatchFn): void {
  // Safe DOM clearing: detach all tracked listeners before clearing
  detachAllListeners(container);
  container.innerHTML = '';

  // Notifications
  renderNotifications(container, state, dispatch);

  // Office level card
  const officeLevel = calculateOfficeLevel(state);
  const officeCard = createOfficeCard(officeLevel);
  container.appendChild(officeCard);

  // Fame card
  const fameLevel = getFameLevel(state.fame || 0);
  const fameCard = createFameCard(fameLevel, state);
  container.appendChild(fameCard);

  // Evolution counter
  const discoveredClasses = new Set<string>();
  for (const a of state.adventurers || []) {
    if (a.evolved && a.evolvedClass) {
      discoveredClasses.add(a.evolvedClass);
    }
  }
  const discoveredCount = discoveredClasses.size;
  const totalCount = CLASS_EVOLUTIONS.length;

  const evolutionCard = document.createElement('div');
  evolutionCard.className = 'card evolution-counter';
  evolutionCard.innerHTML = `
    <h3>Evolution</h3>
    <span class="evolution-count">${discoveredCount}/${totalCount} found</span>
  `;

  // Evolution tooltip
  const evolutionMouseEnterHandler = (ev: MouseEvent) => {
    showEvolutionMechanicTooltip(state, CLASS_EVOLUTIONS, ev.clientX, ev.clientY);
  };
  const evolutionMouseLeaveHandler = () => {
    hideTooltip();
  };
  const evolutionMouseMoveHandler = (ev: MouseEvent) => {
    if (!isTooltipVisible()) return;
    positionTooltip(ev.clientX, ev.clientY);
  };
  trackEventListener(evolutionCard, 'mouseenter', evolutionMouseEnterHandler as EventListener);
  trackEventListener(evolutionCard, 'mouseleave', evolutionMouseLeaveHandler as EventListener);
  trackEventListener(evolutionCard, 'mousemove', evolutionMouseMoveHandler as EventListener);

  container.appendChild(evolutionCard);

  // Active quest card (if any)
  if (state.activeQuest && state.activeQuest.status === 'active') {
    const questCard = renderCard(
      'quest' as CardType,
      state.activeQuest.questData,
      state,
      'dashboard',
      dispatch,
    );
    if (questCard) {
      questCard.classList.add('active-quest-card');
      container.appendChild(questCard);
    }
  }

  // Party status card
  const partyCard = createPartyStatusCard(state);
  container.appendChild(partyCard);

  // Recent events summary (last 3 unresolved events)
  const events = state.events || [];
  if (events.length > 0) {
    const recentEvents = events.filter((e) => !e.resolved).slice(-3).reverse();
    for (const event of recentEvents) {
      const eventCard = renderCard('event' as CardType, event as unknown as EventTemplate, state, event.eventId, dispatch);
      if (eventCard) {
        eventCard.classList.add('event-card');
        container.appendChild(eventCard);
      }
    }
  }
}

// ─── Roster View ───────────────────────────────────────

/**
 * Roster view — adventurer cards for all rostered adventurers.
 * Uses virtual list rendering when adventurer count > 20 for performance.
 */
export function renderRoster(container: HTMLElement, state: GameState, dispatch?: DispatchFn): void {
  const { adventurers, party } = state;
  const partyIds = new Set(party?.adventurerIds || []);

  // Destroy existing virtual list if switching to standard rendering
  const existingVL = _virtualLists.get(container);
  if (existingVL) {
    existingVL.destroy();
    _virtualLists.delete(container);
  }

  // Check if virtualization should be used
  if (adventurers.length > VIRTUAL_LIST_THRESHOLD) {
    renderRosterVirtual(container, state, dispatch);
  } else {
    renderRosterStandard(container, state, dispatch);
  }
}

/**
 * Render roster using standard DOM rendering (for small guilds ≤ 20 adventurers).
 */
function renderRosterStandard(container: HTMLElement, state: GameState, dispatch?: DispatchFn): void {
  const { adventurers, party } = state;
  const partyIds = new Set(party?.adventurerIds || []);

  // Safe DOM clearing: detach all tracked listeners before clearing
  detachAllListeners(container);
  container.innerHTML = '';

  // Capture old cards before clearing (for animation of removed adventurers)
  const oldCards = _oldCards.get(container) || [];
  const oldIds = new Set(
    oldCards
      .map((card) => card.getAttribute('data-adventurer-id'))
      .filter((id): id is string => id !== null),
  );

  // Party status bar
  const partyBar = document.createElement('div');
  partyBar.className = 'card party-status-card';
  partyBar.innerHTML = `
    <h3>Party (${partyIds.size}/${adventurers.length})</h3>
    <div class="party-summary">
      <span>${[...partyIds]
        .map((id) => {
          const a = adventurers.find((a) => a.id === id);
          return a ? a.name + ' (' + (a.evolvedClass || a.class) + ')' : '?';
        })
        .join(', ') || 'No party members'}</span>
    </div>
  `;
  container.appendChild(partyBar);

  if (adventurers.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card empty-state';
    empty.textContent = 'No adventurers — hire from the Recruitment tab!';
    container.appendChild(empty);
    _oldCards.set(container, []);
    return;
  }

  const newCards: HTMLElement[] = [];

  for (const adventurer of adventurers) {
    const card = renderCard('adventurer' as CardType, adventurer, state, undefined, dispatch);
    if (card) {
      card.classList.add('roster-card');
      card.setAttribute('data-adventurer-id', adventurer.id);

      // Make card draggable for drag-and-drop party building (Story 6.3)
      attachDragSourceHandlers(card, adventurer.id, dispatch, state, party?.id);

      // Assign to party / Remove from party button
      const isInParty = partyIds.has(adventurer.id);
      const partyBtn = document.createElement('button');
      partyBtn.className = isInParty ? 'btn btn-tertiary' : 'btn btn-primary';
      partyBtn.textContent = isInParty ? 'Remove from Party' : 'Add to Party';
      const partyHandler = () => {
        if (dispatch) {
          const currentParty = state.party.adventurerIds || [];
          let newPartyIds: string[];
          if (isInParty) {
            newPartyIds = currentParty.filter((id) => id !== adventurer.id);
          } else {
            if (currentParty.length >= 3) {
              console.warn('[Roster] Party is full (max 3)');
              return;
            }
            newPartyIds = [...currentParty, adventurer.id];
          }
          dispatch({
            type: 'ASSIGN_PARTY',
            payload: { partyId: party?.id, adventurerIds: newPartyIds },
          });
        }
      };
      trackEventListener(partyBtn, 'click', partyHandler);
      card.appendChild(partyBtn);

      // Retirement button for Level 5+ adventurers
      if (adventurer.level >= 5) {
        const retireBtn = document.createElement('button');
        retireBtn.className = 'btn btn-tertiary';
        retireBtn.textContent = 'Retire';
        const retireHandler = () => {
          const cardEl = retireBtn.closest('.roster-card') as HTMLElement | null;
          if (cardEl) {
            const anim = fadeOutAndShrink(200);
            const animHandle = playAnimation(cardEl, anim);
            // WAAPI Animation objects auto-collect after finish event fires —
            // no need to track this listener in _listenerRefs.
            animHandle.addEventListener('finish', () => {
              detachAllListeners(cardEl);
              cardEl.remove();
              showConfirmModal(
                `Retire ${adventurer.name}? They will leave the guild but leave a legacy perk for future recruits.`,
                () => {
                  if (dispatch) {
                    dispatch({
                      type: 'RETIRE',
                      payload: { adventurerId: adventurer.id },
                    });
                  }
                },
              );
            });
          } else {
            showConfirmModal(
              `Retire ${adventurer.name}? They will leave the guild but leave a legacy perk for future recruits.`,
              () => {
                if (dispatch) {
                  dispatch({
                    type: 'RETIRE',
                    payload: { adventurerId: adventurer.id },
                  });
                }
              },
            );
          }
        };
        trackEventListener(retireBtn, 'click', retireHandler);
        card.appendChild(retireBtn);
      }

      container.appendChild(card);
      newCards.push(card);
    }
  }

  // Detect and animate removed adventurers
  const newIds = new Set(adventurers.map((a) => a.id));
  let orphanedCount = 0;
  for (const oldCard of oldCards) {
    const oldId = oldCard.getAttribute('data-adventurer-id');
    if (oldId && !newIds.has(oldId)) {
      // This adventurer was removed — animate out then remove
      orphanedCount++;
      const anim = fadeOutAndShrink(200);
      const animHandle = playAnimation(oldCard, anim);
      // WAAPI Animation objects auto-collect after finish event fires —
      // no need to track this listener in _listenerRefs.
      animHandle.addEventListener('finish', () => {
        detachAllListeners(oldCard);
        oldCard.remove();
      });
    }
  }

  // Detect newly added adventurers and animate them in
  for (const newCard of newCards) {
    const newId = newCard.getAttribute('data-adventurer-id');
    if (newId && !oldIds.has(newId)) {
      const anim = slideInFromRight(180);
      playAnimation(newCard, anim);
    }
  }

  if (orphanedCount > 0) {
    console.debug(`[Render] Cleaned ${orphanedCount} orphaned roster cards`);
  }

  _oldCards.set(container, newCards);
}

/**
 * Render roster using virtual list (for large guilds > 20 adventurers).
 * Only renders visible cards + overscan to keep DOM shallow for 100+ items.
 */
function renderRosterVirtual(container: HTMLElement, state: GameState, dispatch?: DispatchFn): void {
  const { adventurers, party } = state;
  const partyIds = new Set(party?.adventurerIds || []);

  // Safe DOM clearing: detach all tracked listeners before clearing
  detachAllListeners(container);
  container.innerHTML = '';

  // Party status bar (rendered once outside the virtual list)
  const partyBar = document.createElement('div');
  partyBar.className = 'card party-status-card';
  partyBar.innerHTML = `
    <h3>Party (${partyIds.size}/${adventurers.length})</h3>
    <div class="party-summary">
      <span>${[...partyIds]
        .map((id) => {
          const a = adventurers.find((a) => a.id === id);
          return a ? a.name + ' (' + (a.evolvedClass || a.class) + ')' : '?';
        })
        .join(', ') || 'No party members'}</span>
    </div>
  `;
  container.insertBefore(partyBar, container.firstChild);

  if (adventurers.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card empty-state';
    empty.textContent = 'No adventurers — hire from the Recruitment tab!';
    container.appendChild(empty);
    return;
  }

  // Create virtual list container
  const virtualContainer = document.createElement('div');
  virtualContainer.id = 'roster-virtual-container';
  container.appendChild(virtualContainer);

  // Destroy existing virtual list if present
  const existingVL = _virtualLists.get(container);
  if (existingVL) {
    existingVL.destroy();
  }

  // Create new VirtualList instance
  const virtualList = new VirtualList({
    itemCount: adventurers.length,
    itemHeight: CARD_ROW_HEIGHT,
    rowHeight: CARD_ROW_HEIGHT,
    container: virtualContainer,
    overscanCount: 3,
    gap: 12,
    renderCard: (index, adventurer) => {
      const card = renderCard('adventurer' as CardType, adventurer, state, undefined, dispatch);
      if (!card) return null;

      card.classList.add('roster-card', 'virtual-card');
      card.setAttribute('data-adventurer-id', adventurer.id);

      // Make card draggable for drag-and-drop party building (Story 6.3)
      attachDragSourceHandlers(card, adventurer.id, dispatch, state, party?.id);

      // Assign to party / Remove from party button
      const isInParty = partyIds.has(adventurer.id);
      const partyBtn = document.createElement('button');
      partyBtn.className = isInParty ? 'btn btn-tertiary' : 'btn btn-primary';
      partyBtn.textContent = isInParty ? 'Remove from Party' : 'Add to Party';
      const vPartyHandler = () => {
        if (dispatch) {
          const currentParty = state.party.adventurerIds || [];
          let newPartyIds: string[];
          if (isInParty) {
            newPartyIds = currentParty.filter((id) => id !== adventurer.id);
          } else {
            if (currentParty.length >= 3) {
              console.warn('[Roster] Party is full (max 3)');
              return;
            }
            newPartyIds = [...currentParty, adventurer.id];
          }
          dispatch({
            type: 'ASSIGN_PARTY',
            payload: { partyId: party?.id, adventurerIds: newPartyIds },
          });
        }
      };
      trackEventListener(partyBtn, 'click', vPartyHandler);
      card.appendChild(partyBtn);

      // Retirement button for Level 5+ adventurers
      if (adventurer.level >= 5) {
        const retireBtn = document.createElement('button');
        retireBtn.className = 'btn btn-tertiary';
        retireBtn.textContent = 'Retire';
        const vRetireHandler = () => {
          const cardEl = retireBtn.closest('.roster-card') as HTMLElement | null;
          if (cardEl) {
            const anim = fadeOutAndShrink(200);
            const animHandle = playAnimation(cardEl, anim);
            // WAAPI Animation objects auto-collect after finish event fires —
            // no need to track this listener in _listenerRefs.
            animHandle.addEventListener('finish', () => {
              detachAllListeners(cardEl);
              cardEl.remove();
              showConfirmModal(
                `Retire ${adventurer.name}? They will leave the guild but leave a legacy perk for future recruits.`,
                () => {
                  if (dispatch) {
                    dispatch({
                      type: 'RETIRE',
                      payload: { adventurerId: adventurer.id },
                    });
                  }
                },
              );
            });
          } else {
            showConfirmModal(
              `Retire ${adventurer.name}? They will leave the guild but leave a legacy perk for future recruits.`,
              () => {
                if (dispatch) {
                  dispatch({
                    type: 'RETIRE',
                    payload: { adventurerId: adventurer.id },
                  });
                }
              },
            );
          }
        };
        trackEventListener(retireBtn, 'click', vRetireHandler);
        card.appendChild(retireBtn);
      }

      return card;
    },
    onCardEnter: (element, index) => {
      // Animate new cards entering viewport
      const anim = slideInFromRight(180);
      playAnimation(element, anim);
    },
    onCardLeave: (element) => {
      // Skip cleanup if a drag is in progress — virtual list should not
      // interfere with active drag-and-drop interactions.
      if (_isDragging) {
        return;
      }
      element.classList.remove('dragging');
      detachAllListeners(element);
      const anim = fadeOutAndShrink(200);
      playAnimation(element, anim);
    },
  });

  // Store the virtual list instance keyed by outer container for consistent destroy
  _virtualLists.set(container, virtualList);

  // Initial render
  virtualList.update(adventurers, state);
}

// ─── Recruitment View ──────────────────────────────────

/**
 * Recruitment view — recruitment pool with hire buttons and restock option.
 */
export function renderRecruitment(container: HTMLElement, state: GameState, dispatch?: DispatchFn): void {
  const { recruitmentPool, gold } = state;

  // Safe DOM clearing: detach all tracked listeners before clearing
  detachAllListeners(container);
  container.innerHTML = '';

  // Capture old cards before clearing (for animation of removed adventurers)
  const oldCards = _oldCards.get(container) || [];
  const oldIds = new Set(
    oldCards
      .map((card) => card.getAttribute('data-adventurer-id'))
      .filter((id): id is string => id !== null),
  );

  // Restock button
  const restockSection = document.createElement('div');
  restockSection.className = 'card restock-section';
  restockSection.innerHTML = `
    <h3>Recruitment Pool</h3>
    <div class="restock-controls">
      <span class="pool-count">${recruitmentPool.length} adventurers available</span>
      <button class="btn btn-primary" ${gold < 5 ? 'disabled' : ''} data-action="restock">
        Restock (5 gold)
      </button>
    </div>
  `;
  container.appendChild(restockSection);

  // Restock handler
  const restockBtn = restockSection.querySelector('.btn-restock');
  const restockHandler = () => {
    if (dispatch) {
      const newPool = generateRecruitmentPool(3);
      dispatch({
        type: 'RESTOCK',
        payload: {
          count: 3,
          adventurers: newPool,
        },
      });
    }
  };
  if (restockBtn) {
    trackEventListener(restockBtn as HTMLElement, 'click', restockHandler);
  }

  // Adventure cards from pool
  if (recruitmentPool.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card empty-state';
    empty.textContent = 'No adventurers available. Restock the pool!';
    container.appendChild(empty);
    _oldCards.set(container, []);
    return;
  }

  const newCards: HTMLElement[] = [];
  let recruitmentOrphanedCount = 0;

  for (const adventurer of recruitmentPool) {
    const card = renderCard('adventurer' as CardType, adventurer, state, undefined, dispatch);
    if (!card) continue;
    card.classList.add('recruit-card');
    card.setAttribute('data-adventurer-id', adventurer.id);

    const hireBtn = document.createElement('button');
    hireBtn.className = 'btn btn-primary';
    hireBtn.textContent = 'Join Guild';
    const hireHandler = () => {
      if (dispatch) {
        dispatch({
          type: 'HIRE',
          payload: { adventurerId: adventurer.id },
        });
      }
    };
    trackEventListener(hireBtn, 'click', hireHandler);
    card.appendChild(hireBtn);
    container.appendChild(card);
    newCards.push(card);
  }

  // Animate newly added recruitment cards
  const newIds = new Set(recruitmentPool.map((a) => a.id));
  for (const newCard of newCards) {
    const newId = newCard.getAttribute('data-adventurer-id');
    if (newId && !oldIds.has(newId)) {
      const anim = slideInFromRight(180);
      playAnimation(newCard, anim);
    }
  }

  // Animate removed recruitment cards
  for (const oldCard of oldCards) {
    const oldId = oldCard.getAttribute('data-adventurer-id');
    if (oldId && !newIds.has(oldId)) {
      recruitmentOrphanedCount++;
      const anim = fadeOutAndShrink(200);
      const animHandle = playAnimation(oldCard, anim);
      // WAAPI Animation objects auto-collect after finish event fires —
      // no need to track this listener in _listenerRefs.
      animHandle.addEventListener('finish', () => {
        detachAllListeners(oldCard);
        oldCard.remove();
      });
    }
  }

  if (recruitmentOrphanedCount > 0) {
    console.debug(`[Render] Cleaned ${recruitmentOrphanedCount} orphaned recruitment cards`);
  }

  _oldCards.set(container, newCards);
}

// ─── Quest Board View ──────────────────────────────────

/**
 * Quest Board view — available quest cards.
 */
export function renderQuestBoard(container: HTMLElement, state: GameState, dispatch?: DispatchFn): void {
  // Safe DOM clearing: detach all tracked listeners before clearing
  detachAllListeners(container);
  container.innerHTML = '';

  // Use stored quests from state (generated at startup or via RESTOCK_QUESTS)
  const quests = state.quests || [];
  if (quests.length === 0) {
    // Fallback: generate quests if pool is empty
    const newQuests = getFameGatedQuestPool(state, 3);
    if (dispatch && newQuests.length > 0) {
       dispatch({
         type: 'RESTOCK_QUESTS',
         payload: { quests: newQuests },
       } as const);
    }
    // Render the newly generated quests directly
    for (const quest of newQuests) {
      const card = renderCard('quest' as CardType, quest, state, undefined, dispatch);
      if (card) {
        card.classList.add('quest-card');
        container.appendChild(card);
      }
    }
    return;
  }

  for (const quest of quests) {
    const card = renderCard('quest' as CardType, quest, state, undefined, dispatch);
    if (card) {
      card.classList.add('quest-card');
      container.appendChild(card);
    }
  }
}

// ─── Events View ───────────────────────────────────────

/**
 * Events view — unresolved events first, then resolved events.
 */
export function renderEvents(container: HTMLElement, state: GameState, dispatch?: DispatchFn): void {
  // Safe DOM clearing: detach all tracked listeners before clearing
  detachAllListeners(container);
  container.innerHTML = '';

  const { events } = state;
  const unresolved = events.filter((e) => !e.resolved);
  const resolved = events.filter((e) => e.resolved);
  const allEvents = [...unresolved, ...resolved];

  if (allEvents.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card empty-state';
    empty.textContent = 'No events yet — keep adventuring!';
    container.appendChild(empty);
    return;
  }

  for (const event of allEvents) {
    const card = renderCard('event' as CardType, event as unknown as EventTemplate, state, event.eventId, dispatch);
    if (card) {
      card.classList.add('event-card');
      if (event.resolved) card.classList.add('resolved-event');
      container.appendChild(card);
    }
  }
}

// ─── Upgrades View ─────────────────────────────────────

/**
 * Upgrades view — upgrade cards with costs and effects.
 */
export function renderUpgrades(container: HTMLElement, state: GameState, dispatch?: DispatchFn): void {
  // Safe DOM clearing: detach all tracked listeners before clearing
  detachAllListeners(container);
  container.innerHTML = '';

  const upgrades = getAvailableUpgrades(state);
  const gold = state.gold ?? 0;

  if (upgrades.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card empty-state';
    empty.textContent =
      'No upgrades available yet. Complete more quests to earn gold!';
    container.appendChild(empty);
    return;
  }

  for (const upgrade of upgrades) {
    const card = document.createElement('div');
    card.className = 'card upgrade-card';

    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `<span>${upgrade.name}</span>`;
    card.appendChild(header);

    const body = document.createElement('div');
    body.className = 'upgrade-body';
    body.innerHTML = `
      <p class="upgrade-desc">${upgrade.description}</p>
      <div class="upgrade-stats">
        <span>Current Level: <strong>${upgrade.currentLevel}</strong></span>
        <span>Next Cost: <strong class="upgrade-cost">⛃ ${upgrade.nextCost}</strong></span>
      </div>
    `;
    card.appendChild(body);

    // Effects preview
    if (upgrade.currentLevel > 0) {
      const effects = getUpgradeEffect(upgrade.type, upgrade.currentLevel);
      const effectsEl = document.createElement('div');
      effectsEl.className = 'upgrade-effects';
      effectsEl.innerHTML = `<small>Current Effects: ${formatUpgradeEffects(effects)}</small>`;
      card.appendChild(effectsEl);
    }

    // Upgrade button
    const btn = document.createElement('button');
    btn.className = gold < upgrade.nextCost ? 'btn btn-disabled' : 'btn btn-primary';
    btn.textContent =
      gold < upgrade.nextCost
        ? 'Insufficient Gold'
        : `Upgrade (⛃ ${upgrade.nextCost})`;
    btn.disabled = gold < upgrade.nextCost;
    const upgradeHandler = () => {
      showConfirmModal(
        `Spend ⛃ ${upgrade.nextCost} gold to upgrade ${upgrade.name} to Level ${upgrade.currentLevel + 1}?`,
        () => {
          if (dispatch) {
            dispatch({
              type: 'UPGRADE_GUILD',
              payload: { upgradeType: upgrade.type, gold: upgrade.nextCost },
            });
            // Upgrade success animation
            const anim = upgradeSuccessAnimation();
            playAnimation(card, anim);
          }
        },
      );
    };
    trackEventListener(btn, 'click', upgradeHandler);
    card.appendChild(btn);

    container.appendChild(card);
  }
}

// ─── Helper Functions ──────────────────────────────────

/**
 * Format upgrade effects for display.
 */
export function formatUpgradeEffects(effects: Record<string, number | string>): string {
  const parts: string[] = [];
  if (effects.fameMultiplier)
    parts.push(`+${(Number(effects.fameMultiplier) * 100).toFixed(0)}% fame`);
  if (effects.questSuccessBonus)
    parts.push(`+${(Number(effects.questSuccessBonus) * 100).toFixed(0)}% quest success`);
  if (effects.recruitQualityBonus)
    parts.push(`+${effects.recruitQualityBonus} quality`);
  return parts.join(', ') || 'None';
}

/**
 * Create an office level card element.
 */
export function createOfficeCard(levelData: OfficeLevelResult): HTMLElement {
  const card = document.createElement('div');
  card.className = 'card office-card';
  card.innerHTML = `
    <h3>Office: ${levelData.label}</h3>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${levelData.progress * 100}%"></div>
    </div>
    <span class="progress-label">Level ${levelData.level}</span>
  `;
  return card;
}

/**
 * Create a fame level card element.
 */
export function createFameCard(fameData: FameLevelResult, state?: GameState): HTMLElement {
  const card = document.createElement('div');
  card.className = 'card fame-card';
  card.innerHTML = `
    <h3>Fame: ${fameData.currentFame}</h3>
    <span class="fame-tier">${fameData.name}</span>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${fameData.progress * 100}%"></div>
    </div>
    <span class="progress-label">${
      fameData.nextLevel ? `Next: ${fameData.nextLevel}` : 'Max Fame'
    }</span>
  `;

  if (state) {
    const fameMouseEnterHandler = (ev: MouseEvent) => {
      showFameMechanicTooltip(state, ev.clientX, ev.clientY);
    };
    const fameMouseLeaveHandler = () => {
      hideTooltip();
    };
    const fameMouseMoveHandler = (ev: MouseEvent) => {
      if (!isTooltipVisible()) return;
      positionTooltip(ev.clientX, ev.clientY);
    };
    trackEventListener(card, 'mouseenter', fameMouseEnterHandler as EventListener);
    trackEventListener(card, 'mouseleave', fameMouseLeaveHandler as EventListener);
    trackEventListener(card, 'mousemove', fameMouseMoveHandler as EventListener);
  }

  return card;
}

/**
 * Create a party status card for the dashboard.
 */
export function createPartyStatusCard(state: GameState): HTMLElement {
  const party = state.party || {};
  const adventurerIds = party.adventurerIds || [];
  const adventurers = state.adventurers.filter((a) =>
    adventurerIds.includes(a.id),
  );
  const synergyScore = party.synergyScore || 0;

  const card = document.createElement('div');
  card.className = 'card party-status-card';
  card.innerHTML = `
    <h3>Party (${adventurerIds.length})</h3>
    ${
      adventurerIds.length > 0
        ? `
      <div class="party-synergy">Synergy: ${synergyScore.toFixed(1)}</div>
      <ul class="party-members">
        ${adventurers
          .map((a) => `<li>${a.name} (${a.evolvedClass || a.class})</li>`)
          .join('')}
      </ul>
    `
        : '<p class="empty-hint">No party selected</p>'
    }
  `;

  // Wage pressure tooltip on the card
  const wageMouseEnterHandler = (ev: MouseEvent) => {
    showWageMechanicTooltip(state, ev.clientX, ev.clientY);
  };
  const wageMouseLeaveHandler = () => {
    hideTooltip();
  };
  const wageMouseMoveHandler = (ev: MouseEvent) => {
    if (!isTooltipVisible()) return;
    positionTooltip(ev.clientX, ev.clientY);
  };
  trackEventListener(card, 'mouseenter', wageMouseEnterHandler as EventListener);
  trackEventListener(card, 'mouseleave', wageMouseLeaveHandler as EventListener);
  trackEventListener(card, 'mousemove', wageMouseMoveHandler as EventListener);

  return card;
}

// ─── Party Overview Panel ──────────────────────────────

const STAT_LABELS: Record<keyof Stats, string> = {
  str: 'STR',
  dex: 'DEX',
  int: 'INT',
  vit: 'VIT',
  lck: 'LCK',
};

/**
 * Create the party overview panel that slides in from the right when a quest card is dispatched.
 * Shows combined party stats, aptitude summary, and quest success rate.
 * @param quest — The quest being dispatched to
 * @param state — Current game state
 * @param dispatch — Dispatch function for state changes
 * @returns The panel element, or null if no quest provided
 */
export function createPartyOverviewPanel(quest: Quest | null, state: GameState, dispatch?: DispatchFn): HTMLElement | null {
  if (!quest) return null;

  const panel = document.createElement('div');
  panel.className = 'party-overview-panel';
  panel.setAttribute('data-panel', 'party-overview');

  const party = state.party || {};
  const adventurerIds = party.adventurerIds || [];
  const partyAdventurers = state.adventurers.filter((a) => adventurerIds.includes(a.id));

  // Header — quest name + difficulty
  const header = document.createElement('div');
  header.className = 'party-overview-header';
  const difficultyStars = '\u2605'.repeat(quest.difficulty ?? 1) + '\u2606'.repeat(Math.max(0, 5 - (quest.difficulty ?? 1)));
  const questNameEl = document.createElement('span');
  questNameEl.className = 'panel-quest-name';
  questNameEl.textContent = quest.name;
  const difficultyEl = document.createElement('span');
  difficultyEl.className = 'panel-quest-difficulty';
  difficultyEl.textContent = difficultyStars;
  header.appendChild(questNameEl);
  header.appendChild(difficultyEl);
  panel.appendChild(header);

  // If no adventurers selected, show placeholder
  if (partyAdventurers.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'party-overview-empty';
    emptyState.textContent = 'Select adventurers to view party stats';
    panel.appendChild(emptyState);
    return panel;
  }

  // Party members list
  const membersSection = document.createElement('div');
  membersSection.className = 'party-members-section';
  membersSection.innerHTML = '<h4>Party Members</h4>';
  const membersList = document.createElement('ul');
  membersList.className = 'party-members-list';
  for (const adventurer of partyAdventurers) {
    const memberItem = document.createElement('li');
    memberItem.className = 'party-member-item';
    memberItem.setAttribute('data-adventurer-id', adventurer.id);
    memberItem.textContent = `${adventurer.name} (${adventurer.evolvedClass || adventurer.class})`;

    // Make party member items drop targets for removing adventurers via drag (Story 6.3)
    attachDropTargetHandlers(memberItem, 'remove', dispatch, state, party?.id);

    membersList.appendChild(memberItem);
  }
  membersSection.appendChild(membersList);
  panel.appendChild(membersSection);

  // Synergy section
  const synergySection = document.createElement('div');
  synergySection.className = 'synergy-section';
  synergySection.innerHTML = '<h4>Party Synergy</h4>';

  const synergyResult = calculateSynergyScore(partyAdventurers, quest);
  const { uniqueClasses, bonus: diversityBonus } = { uniqueClasses: new Set(partyAdventurers.map(a => a.evolvedClass || a.class)).size, bonus: synergyResult.diversityBonus };

  // Determine synergy state
  let synergyClass = 'synergy-positive';
  let synergyLabel = 'Positive synergy';
  let synergyColor = '#27AE60';
  const allSameClass = uniqueClasses === 1;
  if (allSameClass && partyAdventurers.length > 1) {
    synergyClass = 'synergy-redundant';
    synergyLabel = 'Class redundancy detected';
    synergyColor = '#E74C3C';
  } else if (diversityBonus === 0) {
    synergyClass = 'synergy-neutral';
    synergyLabel = 'No diversity bonus';
    synergyColor = '#FF9800';
  }

  const diversityRow = document.createElement('div');
  diversityRow.className = `diversity-indicator ${synergyClass}`;
  diversityRow.innerHTML = `
    <span class="diversity-label">Class Diversity:</span>
    <span class="diversity-value">${uniqueClasses} unique class${uniqueClasses !== 1 ? 'es' : ''}</span>
    <span class="diversity-bonus">${diversityBonus > 0 ? '+' : ''}${Math.round(diversityBonus * 100)}% bonus</span>
  `;
  synergySection.appendChild(diversityRow);

  // Synergy status label
  const statusLabel = document.createElement('div');
  statusLabel.className = `synergy-status ${synergyClass}`;
  statusLabel.textContent = synergyLabel;
  synergySection.appendChild(statusLabel);

  // Trait synergy notes
  const traitSynergyNotes = document.createElement('div');
  traitSynergyNotes.className = 'trait-synergy-notes';

  const activeTraits = new Map<string, number>();
  for (const adventurer of partyAdventurers) {
    const traitNames = adventurer.personality?.traits || [];
    for (const traitName of traitNames) {
      if (PERSONALITY_TRAIT_TABLE[traitName]) {
        const def = PERSONALITY_TRAIT_TABLE[traitName];
        if (def.quest_success > 0) {
          activeTraits.set(traitName, (activeTraits.get(traitName) || 0) + 1);
        }
      }
    }
  }

  if (activeTraits.size > 0) {
    traitSynergyNotes.innerHTML = '<div class="trait-synergy-header">Trait Synergies:</div>';
    for (const [traitName, count] of activeTraits.entries()) {
      const def = PERSONALITY_TRAIT_TABLE[traitName];
      if (def && def.quest_success > 0) {
        const note = document.createElement('div');
        note.className = 'trait-synergy-note';
        const bonusValue = def.quest_success;
        // Extract quest type from description, fallback to 'quest' if format doesn't match
        const match = def.description.match(/(\d+)% (.+) quest/);
        const questType = match ? match[2] : 'quest';
        note.textContent = `+${bonusValue * count} ${questType} bonus from ${traitName} trait`;
        traitSynergyNotes.appendChild(note);
      }
    }
    synergySection.appendChild(traitSynergyNotes);
  }

  // Total synergy summary
  const totalSynergyRow = document.createElement('div');
  totalSynergyRow.className = 'total-synergy';
  totalSynergyRow.textContent = `Total Synergy: +${Math.round(synergyResult.synergyScore * 100)}% bonus applied to quest success`;
  synergySection.appendChild(totalSynergyRow);

  panel.appendChild(synergySection);

  // Combined stats section
  const statsSection = document.createElement('div');
  statsSection.className = 'combined-stats-section';
  statsSection.innerHTML = '<h4>Combined Stats</h4>';
  const statsContainer = document.createElement('div');
  statsContainer.className = 'combined-stats';
  statsContainer.setAttribute('data-stat-view-mode', 'breakdown');

  // Clear any stale highlights from previous renders before creating new rows
  clearRosterHighlights();

  const reqStats: Stats = quest.requirements?.minStats ?? { str: 0, dex: 0, int: 0, vit: 0, lck: 0 };
  const statKeys: (keyof Stats)[] = ['str', 'dex', 'int', 'vit', 'lck'];

  // Detach listeners from existing stat rows before re-rendering
  for (const existingRow of statsContainer.querySelectorAll('.stat-row')) {
    detachAllListeners(existingRow as HTMLElement);
  }

  for (const stat of statKeys) {
    const total = calculatePartyEffectiveStat(partyAdventurers, quest, stat as string);
    const required = reqStats[stat] ?? 0;
    const statRow = document.createElement('div');
    statRow.className = `stat-row ${total >= required ? 'stat-met' : 'stat-shortfall'}`;
    const checkMark = total >= required ? '\u2713' : '\u2717';
    statRow.innerHTML = `
      <span class="stat-label">${STAT_LABELS[stat]}</span>
      <span class="stat-value">${total}</span>
      <span class="stat-required">/ ${required}</span>
      <span class="stat-check">${checkMark}</span>
    `;
    statRow.style.cursor = 'pointer';

    const statRowClickHandler = (e: MouseEvent) => {
      e.stopPropagation();
      if (e.shiftKey) {
        // Shift+click: show attribution tooltip
        clearRosterHighlights();
        const contributions = computePerAdventurerStatContribution(partyAdventurers, quest, stat as string);
        showStatAttributionTooltip(contributions, stat as keyof Stats, quest, e.clientX, e.clientY);
        highlightRosterCards(contributions.map(c => c.adventurerId));
      } else {
        // Regular click: show breakdown tooltip
        const breakdown = computePartyStatBreakdown(partyAdventurers, quest, stat as string);
        const tooltip = document.getElementById('tooltip-container');
        if (tooltip && tooltip.classList.contains('breakdown-tooltip')) {
          hideTooltip();
        } else {
          showStatBreakdownTooltip(breakdown, e.clientX, e.clientY);
        }
      }
    };
    trackEventListener(statRow, 'click', statRowClickHandler);

    statsContainer.appendChild(statRow);
  }

  statsSection.appendChild(statsContainer);
  panel.appendChild(statsSection);

  // Aptitude summary section
  const aptitudeSection = document.createElement('div');
  aptitudeSection.className = 'aptitude-summary-section';
  aptitudeSection.innerHTML = '<h4>Aptitude Summary</h4>';
  const preferredClasses = quest.requirements?.preferredClasses || [];
  if (preferredClasses.length > 0) {
    const classList = document.createElement('ul');
    classList.className = 'preferred-classes-list';
    for (const cls of preferredClasses) {
      const classItem = document.createElement('li');
      classItem.className = 'preferred-class-item';
      classItem.textContent = cls;
      classList.appendChild(classItem);
    }
    aptitudeSection.appendChild(classList);
  } else {
    const noClasses = document.createElement('p');
    noClasses.className = 'no-preference-hint';
    noClasses.textContent = 'No class preferences for this quest';
    aptitudeSection.appendChild(noClasses);
  }
  panel.appendChild(aptitudeSection);

  // Success rate section
  const successRateSection = document.createElement('div');
  successRateSection.className = 'success-rate-section';
  const successRate = calculateQuestSuccessRate(partyAdventurers, quest);
  let rateClass = 'medium';
  if (successRate >= 70) {
    rateClass = 'high';
  } else if (successRate < 40) {
    rateClass = 'low';
  }
  successRateSection.innerHTML = `
    <h4>Quest Success Rate</h4>
    <div class="success-rate ${rateClass}">${successRate}%</div>
  `;
  panel.appendChild(successRateSection);

  // Action buttons
  const actionsSection = document.createElement('div');
  actionsSection.className = 'panel-actions';

  const dispatchBtn = document.createElement('button');
  dispatchBtn.className = 'btn btn-primary';
  dispatchBtn.textContent = 'Dispatch Party';
  const dispatchHandler = () => {
    // Validate party size against quest requirements
    const minSize = quest.requirements?.minPartySize ?? MIN_PARTY_SIZE;
    const currentSize = state.party?.adventurerIds?.length ?? 0;

    if (currentSize < minSize) {
      // Show inline warning on dispatch button
      const warningEl = document.createElement('span');
      warningEl.className = 'dispatch-btn-warning';
      warningEl.textContent = `Need at least ${minSize} adventurers`;

      // Remove existing warning if present
      const existingWarning = dispatchBtn.querySelector('.dispatch-btn-warning');
      if (existingWarning) existingWarning.remove();

      dispatchBtn.appendChild(warningEl);
      return;
    }

    if (dispatch) {
      dispatch({
        type: 'SEND_QUEST',
        payload: { questId: quest.id },
      });
      // Close the panel
      closePartyOverviewPanel();
    }
  };
  trackEventListener(dispatchBtn, 'click', dispatchHandler);
  actionsSection.appendChild(dispatchBtn);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn-secondary';
  cancelBtn.textContent = 'Cancel';
  const cancelHandler = () => {
    closePartyOverviewPanel();
  };
  trackEventListener(cancelBtn, 'click', cancelHandler);
  actionsSection.appendChild(cancelBtn);

  panel.appendChild(actionsSection);

  // Store a no-op cleanup placeholder (real unsubscribe comes from store.subscribe caller)
  if (dispatch) {
    (panel as any)._panelUnsubscribe = () => {};
  }

  return panel;
}

/**
 * Render the party overview panel as a side panel overlay.
 * Slides in from the right side of the screen.
 */
export function renderPartyOverviewPanel(quest: Quest | null, state: GameState, dispatch?: DispatchFn): void {
  // Remove existing panel if any
  const existingPanel = document.querySelector('.party-over-panel') as HTMLElement | null;
  if (existingPanel) {
    const existingBackdrop = existingPanel.querySelector('.modal-backdrop');
    if (existingBackdrop) {
      detachAllListeners(existingBackdrop as HTMLElement);
      existingBackdrop.remove();
    }
    existingPanel.remove();
  }

  if (!quest) return;

  const overlay = document.createElement('div');
  overlay.className = 'party-over-panel';
  overlay.setAttribute('data-overlay', 'party-overview');

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop party-over-backdrop';

  // Make backdrop a drop zone for returning adventurers to roster (Story 6.3)
  const dropZoneHandler = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const dt = e.dataTransfer;
    if (!dt) return;

    const adventurerId = dt.getData(DND_ADVENTURER_ID_TYPE);
    if (!adventurerId) return;

    const hasOurDragType = Array.from(dt.types || []).some(
      (t) => t === DND_ADVENTURER_ID_TYPE,
    );
    if (!hasOurDragType) return;

    if (!dispatch || !state || !state.party?.id) return;

    const currentParty = state.party.adventurerIds || [];
    dispatch({
      type: 'ASSIGN_PARTY',
      payload: {
        partyId: state.party.id,
        adventurerIds: currentParty.filter((id) => id !== adventurerId),
      },
    });

    clearDraggingClasses();
  };

  const dragOverBackdropHandler = (e: DragEvent) => {
    e.preventDefault();
    backdrop.classList.add('drag-over');
  };

  const dragLeaveBackdropHandler = () => {
    backdrop.classList.remove('drag-over');
  };

  trackEventListener(backdrop, 'dragover', dragOverBackdropHandler);
  trackEventListener(backdrop, 'dragleave', dragLeaveBackdropHandler);
  trackEventListener(backdrop, 'drop', dropZoneHandler);

  // Click outside tooltip to dismiss attribution and clear highlights
  let _tooltipClickOutsideHandler: EventListener | null = null;
  _tooltipClickOutsideHandler = (ev: MouseEvent) => {
    const tooltip = document.getElementById('tooltip-container');
    if (tooltip && !tooltip.contains(ev.target as Node)) {
      clearRosterHighlights();
    }
  };
  trackEventListener(document.body, 'click', _tooltipClickOutsideHandler as EventListener);
  (overlay as any)._tooltipClickOutsideHandler = _tooltipClickOutsideHandler;

  const panel = createPartyOverviewPanel(quest, state, dispatch);
  if (!panel) return;

  backdrop.appendChild(panel);
  overlay.appendChild(backdrop);
  document.body.appendChild(overlay);

  // Animate in — target the inner panel, not the full-viewport backdrop
  if (!prefersReducedMotion()) {
    const anim = slideInFromRight(250);
    const animHandle = playAnimation(panel, anim);
  }

  // Close on backdrop click (not during drag-over)
  const backdropClickHandler = (ev: MouseEvent) => {
    if ((ev.target as HTMLElement) === backdrop && !backdrop.classList.contains('drag-over')) {
      closePartyOverviewPanel();
    }
  };
  trackEventListener(backdrop, 'click', backdropClickHandler as EventListener);

  // Close on Escape key — stored as a closure variable for targeted removal
  let _escapeHandler: EventListener | null = null;
  _escapeHandler = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') {
      clearRosterHighlights();
      closePartyOverviewPanel();
    }
  };
  trackEventListener(document as unknown as HTMLElement, 'keydown', _escapeHandler as EventListener);

  // Store unsubscribe reference on overlay for cleanup during close
  (overlay as any)._panelUnsubscribe = (panel as any)._panelUnsubscribe;
  (overlay as any)._escapeHandler = _escapeHandler;
}

/**
 * Close the party overview panel overlay.
 */
export function closePartyOverviewPanel(): void {
  clearRosterHighlights();
  const overlay = document.querySelector('.party-over-panel') as HTMLElement | null;
  if (!overlay || !document.body.contains(overlay)) return;

  // Clean up unsubscribe callback to prevent memory leaks
  const unsubscribe = (overlay as any)._panelUnsubscribe;
  if (typeof unsubscribe === 'function') {
    unsubscribe();
    (overlay as any)._panelUnsubscribe = undefined;
  }

  // Remove the targeted escape key handler from document
  const escapeHandler = (overlay as any)._escapeHandler;
  if (escapeHandler) {
    (document as unknown as HTMLElement).removeEventListener('keydown', escapeHandler);
    (overlay as any)._escapeHandler = null;
  }
  // Also remove the click-outside tooltip handler from document.body
  const clickOutsideHandler = (overlay as any)._tooltipClickOutsideHandler;
  if (clickOutsideHandler) {
    (document.body as unknown as HTMLElement).removeEventListener('click', clickOutsideHandler as EventListener);
    (overlay as any)._tooltipClickOutsideHandler = null;
  }
  // Remove tracked listeners attached to document during panel lifetime
  // (dragover, dragleave, drop handlers on backdrop were tracked on document.body, not document)

  const backdrop = overlay.querySelector('.party-over-backdrop') as HTMLElement | null;
  if (backdrop) {
    detachAllListeners(backdrop);
  }
  overlay.remove();
}

// ─── Sidebar Rendering (Story 9.4) ──────────────────────────

/**
 * Render the dashboard sidebar with party status, active quests, and event queue.
 * Populates the #game-sidebar element and its child panels.
 * @param state — Current game state
 * @param dispatch — Optional dispatch function (unused in sidebar, kept for consistency)
 */
export function renderSidebar(state: GameState): void {
  const sidebar = document.getElementById('game-sidebar');
  if (!sidebar) return;

  // ── Party Status Summary ──
  const partyStats = document.getElementById('party-stats-summary');
  if (partyStats) {
    partyStats.innerHTML = '';
    const party = state.party || {};
    const adventurerIds = party.adventurerIds || [];
    const partyAdventurers = state.adventurers.filter((a) => adventurerIds.includes(a.id));

    // Combined stats
    const combinedStats: Record<string, number> = { str: 0, dex: 0, int: 0, vit: 0, lck: 0 };
    const statKeys = ['str', 'dex', 'int', 'vit', 'lck'] as Array<keyof Stats>;
    for (const a of partyAdventurers) {
      for (const stat of statKeys) {
        combinedStats[stat] += (a.stats?.[stat] ?? 0);
      }
    }

    const statsDiv = document.createElement('div');
    statsDiv.className = 'sidebar-stat';
    statsDiv.textContent = `Party: ${adventurerIds.length}/${state.adventurers.length} adventurers`;
    partyStats.appendChild(statsDiv);

    const questCountDiv = document.createElement('div');
    questCountDiv.className = 'sidebar-stat';
    const activeQuestCount = (state.quests || []).filter((q) => q.progress < 100).length;
    questCountDiv.textContent = `Active Quests: ${activeQuestCount}`;
    partyStats.appendChild(questCountDiv);

    const eventCountDiv = document.createElement('div');
    eventCountDiv.className = 'sidebar-stat';
    const unresolvedEvents = (state.events || []).filter((e) => e && !e.resolved).length;
    eventCountDiv.textContent = `Open Events: ${unresolvedEvents}`;
    partyStats.appendChild(eventCountDiv);
  }

  // ── Active Quests List (top 3) ──
  const activeQuestsList = document.getElementById('active-quests-list');
  if (activeQuestsList) {
    activeQuestsList.innerHTML = '';
    const activeQuests = (state.quests || [])
      .filter((q) => q.progress > 0 && q.progress < 100)
      .slice(0, 3);

    if (activeQuests.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'sidebar-empty-hint';
      hint.textContent = 'No active quests';
      activeQuestsList.appendChild(hint);
    } else {
      for (const quest of activeQuests) {
        const questEl = document.createElement('div');
        questEl.className = 'sidebar-quest-item';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'quest-name';
        nameSpan.textContent = quest.name || quest.id || 'Unknown Quest';
        questEl.appendChild(nameSpan);

        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        const progressFill = document.createElement('div');
        progressFill.className = 'progress-fill';
        progressFill.style.width = `${Math.max(0, Math.min(100, quest.progress))}%`;
        progressBar.appendChild(progressFill);
        questEl.appendChild(progressBar);

        activeQuestsList.appendChild(questEl);
      }
    }
  }

  // ── Event Queue (upcoming events) ──
  const eventQueueList = document.getElementById('event-queue-list');
  if (eventQueueList) {
    eventQueueList.innerHTML = '';
    const upcomingEvents = (state.events || [])
      .filter((e) => e && !e.resolved)
      .slice(0, 3);

    if (upcomingEvents.length === 0) {
      const hint = document.createElement('div');
      hint.className = 'sidebar-empty-hint';
      hint.textContent = 'No open events';
      eventQueueList.appendChild(hint);
    } else {
      for (const event of upcomingEvents) {
        const eventEl = document.createElement('div');
        eventEl.className = 'sidebar-event-item';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'event-title';
        titleSpan.textContent = event.title || event.name || 'Unknown Event';
        eventEl.appendChild(titleSpan);

        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'event-timestamp';
        timestampSpan.textContent = `Day ${event.triggeredDay || state.day || 0}`;
        eventEl.appendChild(timestampSpan);

        eventQueueList.appendChild(eventEl);
      }
    }
  }
}
