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

// ─── View Types ────────────────────────────────────────

export type ViewName = 'dashboard' | 'roster' | 'recruitment' | 'quests' | 'events' | 'upgrades';

// ─── View Dispatcher ───────────────────────────────────

/**
 * Dispatch rendering to the correct view based on tab name.
 */
export function renderView(viewName: ViewName, state: GameState): void {
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
 */
export function renderRoster(state: GameState): void {
  const container = document.getElementById('game-content');
  if (!container) return;
  container.innerHTML = '';

  const { adventurers, party } = state;
  const partyIds = new Set(party?.adventurerIds || []);

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
    return;
  }

  for (const adventurer of adventurers) {
    const card = renderCard('adventurer' as CardType, adventurer, state);
    if (card) {
      card.classList.add('roster-card');

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
        card.appendChild(retireBtn);
      }

      container.appendChild(card);
    }
  }
}

// ─── Recruitment View ──────────────────────────────────

/**
 * Recruitment view — recruitment pool with hire buttons and restock option.
 */
export function renderRecruitment(state: GameState): void {
  const container = document.getElementById('game-content');
  if (!container) return;
  container.innerHTML = '';

  const { recruitmentPool, gold } = state;

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
    return;
  }

  for (const adventurer of recruitmentPool) {
    const card = renderCard('adventurer' as CardType, adventurer, state);
    if (!card) continue;
    card.classList.add('recruit-card');

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
  }
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
        payload: { count: newQuests.length, quests: newQuests },
      });
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
