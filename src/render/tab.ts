// Adventurers Guild Simulator — Tab View Management
// ===================================================
// View rendering and navigation logic extracted from render.js.
// Handles dashboard, roster, recruitment, quests, events, and upgrades views.

import type { GameState, Adventurer, OfficeLevelResult, FameLevelResult, EventTemplate } from '../types.js';
import {
  calculateOfficeLevel,
  getFameLevel,
  getAvailableUpgrades,
  getUpgradeEffect,
  getFameGatedQuestPool,
  generateRecruitmentPool,
} from '../entities/index.js';
import { renderCard } from './card.js';
import type { CardType } from './card.js';
import { showConfirmModal } from './event-display.js';
import {
  slideInFromRight,
  fadeOutAndShrink,
  playAnimation,
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
 * Dispatch rendering to the correct view based on tab name.
 */
export function renderView(viewName: ViewName, state: GameState): void {
  const container = document.getElementById('game-content');
  if (!container) {
    switch (viewName) {
      case 'dashboard':
        return renderDashboard(state);
      case 'roster':
        return renderRoster(state);
      case 'recruitment':
        return renderRecruitment(state);
      case 'quests':
        return renderQuestBoard(state);
      case 'events':
        return renderEvents(state);
      case 'upgrades':
        return renderUpgrades(state);
      default:
        return renderDashboard(state);
    }
  }

  const lastView = _lastView.get('game-content');
  _lastView.set('game-content', viewName);

  // If no previous view (first render), render directly without transition
  if (!lastView) {
    _executeView(viewName, state);
    return;
  }

  // Determine transition direction
  const currentIndex = VIEW_ORDER[lastView] ?? 0;
  const newIndex = VIEW_ORDER[viewName] ?? 0;
  const direction: 'left' | 'right' = newIndex > currentIndex ? 'left' : 'right';
  const transitions = tabSlideTransition(direction);

  // Capture old content for out-animation
  const oldContent = container.innerHTML;

  // Render new view
  _executeView(viewName, state);

  // Animate old content out and new content in
  if (oldContent !== '') {
    // Create temporary container for out-animation
    const tempOut = document.createElement('div');
    tempOut.innerHTML = oldContent;
    container.appendChild(tempOut);

    const outAnim = playAnimation(tempOut, transitions.out);
    outAnim.addEventListener('finish', () => {
      tempOut.remove();
    });

    // Animate in the new content (first child of container after old content removal)
    const newContent = container.firstElementChild;
    if (newContent && newContent instanceof HTMLElement) {
      newContent.style.opacity = '0';
      newContent.style.transform = direction === 'left'
        ? 'translateX(30px)'
        : 'translateX(-30px)';
      const inAnim = playAnimation(newContent, transitions.in);
      inAnim.addEventListener('finish', () => {
        newContent.style.opacity = '';
        newContent.style.transform = '';
      });
    }
  }
}

/**
 * Execute the view rendering without animation (internal).
 */
function _executeView(viewName: ViewName, state: GameState): void {
  switch (viewName) {
    case 'dashboard':
      return renderDashboard(state);
    case 'roster':
      return renderRoster(state);
    case 'recruitment':
      return renderRecruitment(state);
    case 'quests':
      return renderQuestBoard(state);
    case 'events':
      return renderEvents(state);
    case 'upgrades':
      return renderUpgrades(state);
    default:
      return renderDashboard(state);
  }
}

// ─── Notification Renderer ─────────────────────────────

/**
 * Render notification cards in the dashboard.
 */
export function renderNotifications(state: GameState): void {
  const notifications = state.notifications || [];
  if (notifications.length === 0) return;

  const container = document.getElementById('game-content');
  if (!container) return;

  const notifContainer = document.createElement('div');
  notifContainer.id = 'notifications-container';

  for (const notif of notifications) {
    const notifCard = document.createElement('div');
    notifCard.className = 'notification-card';
    notifCard.setAttribute('data-notif-id', notif.id);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', () => {
      if (window.__guildStore) {
        window.__guildStore.dispatch({
          type: 'CLEAR_NOTIFICATION',
          payload: { notificationId: notif.id },
        });
      }
    });

    const notifText = document.createElement('span');
    notifText.textContent = notif.message;

    notifCard.appendChild(closeBtn);
    notifCard.appendChild(notifText);
    notifContainer.appendChild(notifCard);
  }

  container.insertBefore(notifContainer, container.firstChild);
}

// ─── Dashboard View ────────────────────────────────────

/**
 * Dashboard view — overview cards (office level, active quest, party status, recent events).
 */
export function renderDashboard(state: GameState): void {
  const container = document.getElementById('game-content');
  if (!container) return;
  container.innerHTML = '';

  // Notifications
  renderNotifications(state);

  // Office level card
  const officeLevel = calculateOfficeLevel(state);
  const officeCard = createOfficeCard(officeLevel);
  container.appendChild(officeCard);

  // Fame card
  const fameLevel = getFameLevel(state.fame || 0);
  const fameCard = createFameCard(fameLevel);
  container.appendChild(fameCard);

  // Active quest card (if any)
  if (state.activeQuest && state.activeQuest.status === 'active') {
    const questCard = renderCard(
      'quest' as CardType,
      state.activeQuest.questData,
      state,
      'dashboard',
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
      const eventCard = renderCard('event' as CardType, event as unknown as EventTemplate, state);
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
export function renderRoster(state: GameState): void {
  const container = document.getElementById('game-content');
  if (!container) return;

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
    renderRosterVirtual(container, state);
  } else {
    renderRosterStandard(container, state);
  }
}

/**
 * Render roster using standard DOM rendering (for small guilds ≤ 20 adventurers).
 */
function renderRosterStandard(container: HTMLElement, state: GameState): void {
  const { adventurers, party } = state;
  const partyIds = new Set(party?.adventurerIds || []);

  // Capture old cards before clearing (for animation of removed adventurers)
  const oldCards = _oldCards.get(container) || [];
  const oldIds = new Set(
    oldCards
      .map((card) => card.getAttribute('data-adventurer-id'))
      .filter((id): id is string => id !== null),
  );

  container.innerHTML = '';

  // Party status bar
  const partyBar = document.createElement('div');
  partyBar.className = 'card party-status-card';
  partyBar.innerHTML = `
    <h3>Party (${partyIds.size}/${adventurers.length})</h3>
    <div class="party-summary">
      <span>${[...partyIds]
        .map((id) => adventurers.find((a) => a.id === id)?.name || '?')
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
    const card = renderCard('adventurer' as CardType, adventurer, state);
    if (card) {
      card.classList.add('roster-card');
      card.setAttribute('data-adventurer-id', adventurer.id);

      // Assign to party / Remove from party button
      const isInParty = partyIds.has(adventurer.id);
      const partyBtn = document.createElement('button');
      partyBtn.className = isInParty ? 'btn-remove-party' : 'btn-assign-party';
      partyBtn.textContent = isInParty ? 'Remove from Party' : 'Add to Party';
      partyBtn.addEventListener('click', () => {
        if (window.__guildStore) {
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
          window.__guildStore.dispatch({
            type: 'ASSIGN_PARTY',
            payload: { partyId: party?.id, adventurerIds: newPartyIds },
          });
        }
      });
      card.appendChild(partyBtn);

      // Retirement button for Level 5+ adventurers
      if (adventurer.level >= 5) {
        const retireBtn = document.createElement('button');
        retireBtn.className = 'btn-retire';
        retireBtn.textContent = 'Retire';
        retireBtn.addEventListener('click', () => {
          const cardEl = retireBtn.closest('.roster-card') as HTMLElement | null;
          if (cardEl) {
            const anim = fadeOutAndShrink(200);
            const animHandle = playAnimation(cardEl, anim);
            animHandle.addEventListener('finish', () => {
              cardEl.remove();
              showConfirmModal(
                `Retire ${adventurer.name}? They will leave the guild but leave a legacy perk for future recruits.`,
                () => {
                  if (window.__guildStore) {
                    window.__guildStore.dispatch({
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
                if (window.__guildStore) {
                  window.__guildStore.dispatch({
                    type: 'RETIRE',
                    payload: { adventurerId: adventurer.id },
                  });
                }
              },
            );
          }
        });
        card.appendChild(retireBtn);
      }

      container.appendChild(card);
      newCards.push(card);
    }
  }

  // Detect and animate removed adventurers
  const newIds = new Set(adventurers.map((a) => a.id));
  for (const oldCard of oldCards) {
    const oldId = oldCard.getAttribute('data-adventurer-id');
    if (oldId && !newIds.has(oldId)) {
      // This adventurer was removed — animate out then remove
      const anim = fadeOutAndShrink(200);
      const animHandle = playAnimation(oldCard, anim);
      animHandle.addEventListener('finish', () => {
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

  _oldCards.set(container, newCards);
}

/**
 * Render roster using virtual list (for large guilds > 20 adventurers).
 * Only renders visible cards + overscan to keep DOM shallow.
 */
function renderRosterVirtual(container: HTMLElement, state: GameState): void {
  const { adventurers, party } = state;
  const partyIds = new Set(party?.adventurerIds || []);

  // Party status bar (rendered once outside the virtual list)
  const partyBar = document.createElement('div');
  partyBar.className = 'card party-status-card';
  partyBar.innerHTML = `
    <h3>Party (${partyIds.size}/${adventurers.length})</h3>
    <div class="party-summary">
      <span>${[...partyIds]
        .map((id) => adventurers.find((a) => a.id === id)?.name || '?')
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
  const existingVL = _virtualLists.get(virtualContainer);
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
      const card = renderCard('adventurer' as CardType, adventurer, state);
      if (!card) return null;

      card.classList.add('roster-card', 'virtual-card');
      card.setAttribute('data-adventurer-id', adventurer.id);

      // Assign to party / Remove from party button
      const isInParty = partyIds.has(adventurer.id);
      const partyBtn = document.createElement('button');
      partyBtn.className = isInParty ? 'btn-remove-party' : 'btn-assign-party';
      partyBtn.textContent = isInParty ? 'Remove from Party' : 'Add to Party';
      partyBtn.addEventListener('click', () => {
        if (window.__guildStore) {
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
          window.__guildStore.dispatch({
            type: 'ASSIGN_PARTY',
            payload: { partyId: party?.id, adventurerIds: newPartyIds },
          });
        }
      });
      card.appendChild(partyBtn);

      // Retirement button for Level 5+ adventurers
      if (adventurer.level >= 5) {
        const retireBtn = document.createElement('button');
        retireBtn.className = 'btn-retire';
        retireBtn.textContent = 'Retire';
        retireBtn.addEventListener('click', () => {
          const cardEl = retireBtn.closest('.roster-card') as HTMLElement | null;
          if (cardEl) {
            const anim = fadeOutAndShrink(200);
            const animHandle = playAnimation(cardEl, anim);
            animHandle.addEventListener('finish', () => {
              cardEl.remove();
              showConfirmModal(
                `Retire ${adventurer.name}? They will leave the guild but leave a legacy perk for future recruits.`,
                () => {
                  if (window.__guildStore) {
                    window.__guildStore.dispatch({
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
                if (window.__guildStore) {
                  window.__guildStore.dispatch({
                    type: 'RETIRE',
                    payload: { adventurerId: adventurer.id },
                  });
                }
              },
            );
          }
        });
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
      const anim = fadeOutAndShrink(200);
      playAnimation(element, anim);
    },
  });

  // Store the virtual list instance
  _virtualLists.set(virtualContainer, virtualList);

  // Initial render
  virtualList.update(adventurers, state);
}

// ─── Recruitment View ──────────────────────────────────

/**
 * Recruitment view — recruitment pool with hire buttons and restock option.
 */
export function renderRecruitment(state: GameState): void {
  const container = document.getElementById('game-content');
  if (!container) return;

  const { recruitmentPool, gold } = state;

  // Capture old cards before clearing (for animation of removed adventurers)
  const oldCards = _oldCards.get(container) || [];
  const oldIds = new Set(
    oldCards
      .map((card) => card.getAttribute('data-adventurer-id'))
      .filter((id): id is string => id !== null),
  );

  container.innerHTML = '';

  // Restock button
  const restockSection = document.createElement('div');
  restockSection.className = 'card restock-section';
  restockSection.innerHTML = `
    <h3>Recruitment Pool</h3>
    <div class="restock-controls">
      <span class="pool-count">${recruitmentPool.length} adventurers available</span>
      <button class="btn-restock" ${gold < 5 ? 'disabled' : ''} data-action="restock">
        Restock (5 gold)
      </button>
    </div>
  `;
  container.appendChild(restockSection);

  // Restock handler
  const restockBtn = restockSection.querySelector('.btn-restock');
  restockBtn?.addEventListener('click', () => {
    if (window.__guildStore) {
      const newPool = generateRecruitmentPool(3);
      window.__guildStore.dispatch({
        type: 'RESTOCK',
        payload: {
          count: 3,
          adventurers: newPool,
        },
      });
    }
  });

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

  for (const adventurer of recruitmentPool) {
    const card = renderCard('adventurer' as CardType, adventurer, state);
    if (!card) continue;
    card.classList.add('recruit-card');
    card.setAttribute('data-adventurer-id', adventurer.id);

    const hireBtn = document.createElement('button');
    hireBtn.className = 'btn-hire';
    hireBtn.textContent = 'Join Guild';
    hireBtn.addEventListener('click', () => {
      if (window.__guildStore) {
        window.__guildStore.dispatch({
          type: 'HIRE',
          payload: { adventurerId: adventurer.id },
        });
      }
    });
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
      const anim = fadeOutAndShrink(200);
      const animHandle = playAnimation(oldCard, anim);
      animHandle.addEventListener('finish', () => {
        oldCard.remove();
      });
    }
  }

  _oldCards.set(container, newCards);
}

// ─── Quest Board View ──────────────────────────────────

/**
 * Quest Board view — available quest cards.
 */
export function renderQuestBoard(state: GameState): void {
  const container = document.getElementById('game-content');
  if (!container) return;
  container.innerHTML = '';

  // Use stored quests from state (generated at startup or via RESTOCK_QUESTS)
  const quests = state.quests || [];
  if (quests.length === 0) {
    // Fallback: generate quests if pool is empty
    const newQuests = getFameGatedQuestPool(state, 3);
    if (window.__guildStore && newQuests.length > 0) {
       window.__guildStore.dispatch({
         type: 'RESTOCK_QUESTS',
         payload: { quests: newQuests },
       } as const);
    }
    return;
  }

  for (const quest of quests) {
    const card = renderCard('quest' as CardType, quest, state);
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
export function renderEvents(state: GameState): void {
  const container = document.getElementById('game-content');
  if (!container) return;
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
    const card = renderCard('event' as CardType, event as unknown as EventTemplate, state);
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
export function renderUpgrades(state: GameState): void {
  const container = document.getElementById('game-content');
  if (!container) return;
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
    btn.className = gold < upgrade.nextCost ? 'btn-disabled' : 'btn-upgrade';
    btn.textContent =
      gold < upgrade.nextCost
        ? 'Insufficient Gold'
        : `Upgrade (⛃ ${upgrade.nextCost})`;
    btn.disabled = gold < upgrade.nextCost;
    btn.addEventListener('click', () => {
      showConfirmModal(
        `Spend ⛃ ${upgrade.nextCost} gold to upgrade ${upgrade.name} to Level ${upgrade.currentLevel + 1}?`,
        () => {
          if (window.__guildStore) {
            window.__guildStore.dispatch({
              type: 'UPGRADE_GUILD',
              payload: { upgradeType: upgrade.type, gold: upgrade.nextCost },
            });
            // Upgrade success animation
            const anim = upgradeSuccessAnimation();
            playAnimation(card, anim);
          }
        },
      );
    });
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
export function createFameCard(fameData: FameLevelResult): HTMLElement {
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
          .map((a) => `<li>${a.name} (${a.class})</li>`)
          .join('')}
      </ul>
    `
        : '<p class="empty-hint">No party selected</p>'
    }
  `;
  return card;
}
