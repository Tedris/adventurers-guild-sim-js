// Adventurers Guild Simulator — Card Rendering Engine
// ===================================================
// DOM-based card rendering using HTML <template> elements.
// All cards are cloned from templates and populated with data via data-* attributes.
// Full re-render on every store dispatch (D-07).
//
// Threat mitigation T-04-01: Game data is inserted via textContent/setAttribute,
// never innerHTML. Only trusted template structures are parsed from HTML.

import { VALID_CLASSES, RARITY_TIERS, calculateOfficeLevel, getUpgradeEffect } from './entities.js';

// ─── Public API ────────────────────────────────────────

/**
 * Main card renderer dispatcher.
 * @param {string} type - Card type: 'adventurer', 'quest', or 'event'
 * @param {Object} data - Card data object
 * @param {Object} state - Current game state (for party lookup, etc.)
 * @returns {DocumentFragment|null} Populated card element, or null on error
 */
export function renderCard(type, data, state) {
  switch (type) {
    case 'adventurer': return renderAdventurerCard(data, state);
    case 'quest': return renderQuestCard(data, state);
    case 'event': return renderEventCard(data, state);
    default:
      console.warn(`[render] Unknown card type: ${type}`);
      return null;
  }
}

// ─── Template Cloning Helper ────────────────────────────

/**
 * Clone a template and return its content as a DocumentFragment.
 * @param {string} templateId - ID of the <template> element
 * @returns {DocumentFragment|null} Cloned template content
 */
function createCardElement(templateId) {
  const template = document.getElementById(templateId);
  if (!template) {
    console.warn(`[render] Template #${templateId} not found`);
    return null;
  }
  // D-06: Use document.importNode to clone template content
  return document.importNode(template.content, true);
}

// ─── Adventurer Card Renderer ──────────────────────────

/**
 * Render an adventurer card from template.
 * @param {Object} adventurer - Adventurer entity
 * @param {Object} state - Current game state
 * @returns {DocumentFragment|null}
 */
export function renderAdventurerCard(adventurer, state) {
  const frag = createCardElement('adventurer-card-template');
  if (!frag) return null;

  // Name
  const nameEl = frag.querySelector('[data-name]');
  if (nameEl) nameEl.textContent = adventurer.name || 'Unnamed';

  // Class icon (first letter of class as icon indicator)
  const classIconEl = frag.querySelector('[data-class-icon]');
  if (classIconEl) {
    const classLetter = (adventurer.class || '?')[0].toUpperCase();
    classIconEl.textContent = classLetter;
  }

  // Stats grid
  const stats = adventurer.stats || {};
  for (const stat of ['str', 'dex', 'int', 'vit', 'lck']) {
    const statEl = frag.querySelector(`[data-stat="${stat}"]`);
    if (statEl) {
      const label = stat.toUpperCase();
      const value = stats[stat] ?? 0;
      statEl.textContent = `${label}: ${value}`;
    }
  }

  // Morale bar
  const morale = adventurer.morale ?? 70;
  const moraleBar = frag.querySelector('[data-morale-bar]');
  const moraleValue = frag.querySelector('[data-morale]');
  if (moraleBar) {
    moraleBar.style.width = `${morale}%`;
    moraleBar.style.backgroundColor = getMoraleBarColor(morale);
  }
  if (moraleValue) {
    moraleValue.textContent = morale;
  }

  // Equipment slots
  const equipment = adventurer.equipment || {};
  for (const slot of ['weapon', 'armor', 'accessory']) {
    const equipEl = frag.querySelector(`[data-equip="${slot}"]`);
    const rarityEl = frag.querySelector(`[data-rarity="${slot}"]`);
    if (equipEl && rarityEl) {
      const item = equipment[slot];
      if (item && item.rarity) {
        rarityEl.textContent = item.rarity;
        rarityEl.style.color = getRarityColor(item.rarity);
      } else {
        rarityEl.textContent = '—';
        rarityEl.style.color = '#555';
      }
    }
  }

  // Rank badge
  const rankEl = frag.querySelector('[data-rank]');
  if (rankEl) {
    rankEl.textContent = adventurer.rank || 'Novice';
  }

  // Origin badge
  const originEl = frag.querySelector('[data-origin]');
  if (originEl) {
    originEl.textContent = adventurer.origin || 'Unknown';
  }

  // Wage display
  const wageEl = frag.querySelector('[data-wage]');
  if (wageEl) {
    wageEl.textContent = `⛃ ${(adventurer.wage ?? 0)}/day`;
  }

  return frag;
}

// ─── Quest Card Renderer ───────────────────────────────

/**
 * Render a quest card from template.
 * @param {Object} quest - Quest entity
 * @param {Object} state - Current game state
 * @returns {DocumentFragment|null}
 */
export function renderQuestCard(quest, state) {
  const frag = createCardElement('quest-card-template');
  if (!frag) return null;

  // Name
  const nameEl = frag.querySelector('[data-name]');
  if (nameEl) nameEl.textContent = quest.name || 'Unnamed Quest';

  // Difficulty stars
  const difficultyEl = frag.querySelector('[data-difficulty]');
  if (difficultyEl) {
    const difficulty = quest.difficulty || 1;
    difficultyEl.textContent = getDifficultyStars(difficulty);
  }

  // Description
  const descEl = frag.querySelector('[data-description]');
  if (descEl) descEl.textContent = quest.description || 'No description.';

  // Requirements stats
  const reqStats = (quest.requirements && quest.requirements.minStats) || {};
  for (const stat of ['str', 'dex', 'int', 'vit', 'lck']) {
    const statEl = frag.querySelector(`[data-req-stat="${stat}"]`);
    if (statEl) {
      const label = stat.toUpperCase();
      const value = reqStats[stat] ?? 0;
      statEl.textContent = `${label}: ${value}`;
    }
  }

  // Preferred classes list
  const classesList = frag.querySelector('[data-classes]');
  if (classesList) {
    const preferredClasses = quest.requirements?.preferredClasses || [];
    for (const cls of preferredClasses) {
      const li = document.createElement('li');
      li.textContent = cls;
      li.setAttribute('data-class', cls);
      classesList.appendChild(li);
    }
  }

  // Rewards
  const goldEl = frag.querySelector('[data-gold]');
  if (goldEl) {
    const gold = quest.rewards?.gold ?? 0;
    goldEl.textContent = `⛃ ${gold}`;
  }
  const xpEl = frag.querySelector('[data-experience]');
  if (xpEl) {
    const xp = quest.rewards?.experience ?? 0;
    xpEl.textContent = `✦ ${xp} XP`;
  }

  // Send Party button - disabled if no party
  const sendBtn = frag.querySelector('[data-action="send-party"]');
  if (sendBtn) {
    const hasParty = state?.party?.adventurerIds?.length >= 2;
    sendBtn.disabled = !hasParty;
    sendBtn.setAttribute('aria-disabled', String(!hasParty));
  }

  return frag;
}

// ─── Event Card Renderer ───────────────────────────────

/**
 * Render an event card from template.
 * @param {Object} event - Event entity
 * @param {Object} state - Current game state
 * @returns {DocumentFragment|null}
 */
export function renderEventCard(event, state) {
  const frag = createCardElement('event-card-template');
  if (!frag) return null;

  // Title
  const titleEl = frag.querySelector('[data-title]');
  if (titleEl) titleEl.textContent = event.title || 'Event';

  // Category badge (color-coded)
  const categoryEl = frag.querySelector('[data-category]');
  if (categoryEl) {
    categoryEl.textContent = event.category || 'Unknown';
    // Color coding: Budget=Crimson, Crisis=Orange, Drama=Purple
    const categoryColors = {
      Budget: '#dc143c',
      Crisis: '#ff8c00',
      Drama: '#9b59b6',
    };
    categoryEl.style.color = categoryColors[event.category] || '#888';
  }

  // Description
  const descEl = frag.querySelector('[data-description]');
  if (descEl) descEl.textContent = event.description || 'No description.';

  // Choice buttons
  const choicesContainer = frag.querySelector('[data-choices]');
  if (choicesContainer && event.choices) {
    for (const choice of event.choices) {
      const btn = document.createElement('button');
      btn.className = 'btn-choice';
      btn.textContent = choice.label;
      btn.setAttribute('data-choice-index', String(choice.index));
      btn.addEventListener('click', () => {
        // Dispatch event resolution through the store
        const eventElement = btn.closest('.card-event');
        if (eventElement) {
          const eventId = eventElement.getAttribute('data-event-id');
          if (eventId) {
            window.dispatchEvent(new CustomEvent('event-choice', {
              detail: { eventId, choiceIndex: choice.index },
            }));
          }
        }
      });
      choicesContainer.appendChild(btn);
    }
  }

  // Timestamp
  const timestampEl = frag.querySelector('[data-timestamp]');
  if (timestampEl) {
    const day = event.timestamp ?? state?.day ?? 0;
    timestampEl.textContent = `Day ${day}`;
  }

  return frag;
}

// ─── Utility Helpers ───────────────────────────────────

/**
 * Map rarity string to CSS color.
 * @param {string} rarity - Rarity tier name
 * @returns {string} CSS color string
 */
export function getRarityColor(rarity) {
  const colors = {
    Common: '#888',
    Uncommon: '#4caf50',
    Rare: '#2196f3',
    Epic: '#9c27b0',
  };
  return colors[rarity] || '#888';
}

/**
 * Map morale value to morale bar color.
 * - <30: red (low)
 * - 30-60: orange/yellow (medium)
 * - >60: green (high)
 * @param {number} morale - Morale value (0-100)
 * @returns {string} CSS color string
 */
export function getMoraleBarColor(morale) {
  if (morale < 30) return '#e94560';    // red
  if (morale < 60) return '#ff9800';    // orange/yellow
  return '#4caf50';                       // green
}

/**
 * Generate difficulty star string.
 * @param {number} difficulty - Difficulty level (1-5)
 * @returns {string} Star string (filled + unfilled stars)
 */
export function getDifficultyStars(difficulty) {
  return '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty);
}

// ─── View Manager (Phase 4-02) ─────────────────────────

/**
 * Dispatch rendering to the correct view based on tab name.
 * @param {string} viewName - View identifier: 'dashboard', 'roster', 'quests', 'events', 'upgrades'
 * @param {Object} state - Current game state
 */
export function renderView(viewName, state) {
  switch (viewName) {
    case 'dashboard': return renderDashboard(state);
    case 'roster': return renderRoster(state);
    case 'quests': return renderQuestBoard(state);
    case 'events': return renderEvents(state);
    case 'upgrades': return renderUpgrades(state);
    default: return renderDashboard(state);
  }
}

/**
 * Dashboard view — overview cards (office level, active quest, party status, recent events).
 * @param {Object} state - Current game state
 */
function renderDashboard(state) {
  const container = document.getElementById('game-content');
  if (!container) return;
  container.innerHTML = '';

  // Office level card
  const officeLevel = calculateOfficeLevel(state);
  const officeCard = createOfficeCard(officeLevel);
  container.appendChild(officeCard);

  // Active quest card (if any)
  if (state.activeQuest && state.activeQuest.status === 'active') {
    const questCard = renderCard('quest', state.activeQuest.questData, state);
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
    const recentEvents = events.filter(e => !e.resolved).slice(-3).reverse();
    for (const event of recentEvents) {
      const eventCard = renderCard('event', event, state);
      if (eventCard) container.appendChild(eventCard);
    }
  }
}

/**
 * Roster view — adventurer cards for all rostered adventurers.
 * @param {Object} state - Current game state
 */
function renderRoster(state) {
  const container = document.getElementById('game-content');
  if (!container) return;
  container.innerHTML = '';

  const { adventurers } = state;
  if (adventurers.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card empty-state';
    empty.textContent = 'No adventurers — hire from the pool!';
    container.appendChild(empty);
    return;
  }

  for (const adventurer of adventurers) {
    const card = renderCard('adventurer', adventurer, state);
    if (card) {
      card.classList.add('roster-card');

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
                window.__guildStore.dispatch({ type: 'RETIRE', payload: { adventurerId: adventurer.id } });
              }
            }
          );
        });
        card.appendChild(retireBtn);
      }

      container.appendChild(card);
    }
  }
}

/**
 * Quest Board view — available quest cards.
 * @param {Object} state - Current game state
 */
function renderQuestBoard(state) {
  const container = document.getElementById('game-content');
  if (!container) return;
  container.innerHTML = '';

  const { quests } = state;
  if (quests.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card empty-state';
    empty.textContent = 'No quests available — check back later!';
    container.appendChild(empty);
    return;
  }

  for (const quest of quests) {
    const card = renderCard('quest', quest, state);
    if (card) {
      card.classList.add('quest-card');
      container.appendChild(card);
    }
  }
}

/**
 * Events view — unresolved events first, then resolved events.
 * @param {Object} state - Current game state
 */
function renderEvents(state) {
  const container = document.getElementById('game-content');
  if (!container) return;
  container.innerHTML = '';

  const { events } = state;
  const unresolved = events.filter(e => !e.resolved);
  const resolved = events.filter(e => e.resolved);
  const allEvents = [...unresolved, ...resolved];

  if (allEvents.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card empty-state';
    empty.textContent = 'No events yet — keep adventuring!';
    container.appendChild(empty);
    return;
  }

  for (const event of allEvents) {
    const card = renderCard('event', event, state);
    if (card) {
      card.classList.add('event-card');
      if (event.resolved) card.classList.add('resolved-event');
      container.appendChild(card);
    }
  }
}

/**
 * Upgrades view — placeholder for Phase 5.
 * @param {Object} state - Current game state
 */
function renderUpgrades(state) {
  const container = document.getElementById('game-content');
  if (!container) return;
  container.innerHTML = '';

  const upgrades = getAvailableUpgrades(state);
  const gold = state.gold ?? 0;

  if (upgrades.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'card empty-state';
    empty.textContent = 'No upgrades available yet. Complete more quests to earn gold!';
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
    btn.textContent = gold < upgrade.nextCost ? 'Insufficient Gold' : `Upgrade (⛃ ${upgrade.nextCost})`;
    btn.disabled = gold < upgrade.nextCost;
    btn.addEventListener('click', () => {
      showConfirmModal(
        `Spend ⛃ ${upgrade.nextCost} gold to upgrade ${upgrade.name} to Level ${upgrade.currentLevel + 1}?`,
        () => {
          if (window.__guildStore) {
            window.__guildStore.dispatch({
              type: 'UPGRADE_GUILD',
              payload: { upgradeType: upgrade.type, gold: upgrade.nextCost }
            });
          }
        }
      );
    });
    card.appendChild(btn);

    container.appendChild(card);
  }
}

/**
 * Format upgrade effects for display.
 * @param {Object} effects - Effect key-value pairs
 * @returns {string} Formatted effects string
 */
function formatUpgradeEffects(effects) {
  const parts = [];
  if (effects.fameMultiplier) parts.push(`+${(effects.fameMultiplier * 100).toFixed(0)}% fame`);
  if (effects.questSuccessBonus) parts.push(`+${(effects.questSuccessBonus * 100).toFixed(0)}% quest success`);
  if (effects.recruitQualityBonus) parts.push(`+${effects.recruitQualityBonus} quality`);
  return parts.join(', ') || 'None';
}

/**
 * Create an office level card element.
 * @param {Object} levelData - Office level data from calculateOfficeLevel()
 * @returns {HTMLElement}
 */
function createOfficeCard(levelData) {
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
 * Create a party status card for the dashboard.
 * @param {Object} state - Current game state
 * @returns {HTMLElement}
 */
function createPartyStatusCard(state) {
  const party = state.party || {};
  const adventurerIds = party.adventurerIds || [];
  const adventurers = state.adventurers.filter(a => adventurerIds.includes(a.id));
  const synergyScore = party.synergyScore || 0;

  const card = document.createElement('div');
  card.className = 'card party-status-card';
  card.innerHTML = `
    <h3>Party (${adventurerIds.length})</h3>
    ${adventurerIds.length > 0 ? `
      <div class="party-synergy">Synergy: ${synergyScore.toFixed(1)}</div>
      <ul class="party-members">
        ${adventurers.map(a => `<li>${a.name} (${a.class})</li>`).join('')}
      </ul>
    ` : '<p class="empty-hint">No party selected</p>'}
  `;
  return card;
}

// ─── Modal Overlay (Phase 4-03) ─────────────────────────

/**
 * Show a confirmation modal with message and callback buttons.
 * @param {string} message - Confirmation message
 * @param {Function} onConfirm - Callback when confirm clicked
 * @param {Function} [onCancel] - Callback when cancel clicked (optional)
 * @returns {void}
 */
export function showConfirmModal(message, onConfirm, onCancel = null) {
  const container = document.getElementById('modal-overlay-container');
  if (!container) return;

  const template = document.getElementById('modal-overlay-template');
  if (!template) return;

  const clone = document.importNode(template.content, true);
  const messageEl = clone.querySelector('.modal-message');
  const confirmBtn = clone.querySelector('.modal-confirm');
  const cancelBtn = clone.querySelector('.modal-cancel');

  if (messageEl) messageEl.textContent = message;
  if (confirmBtn) confirmBtn.addEventListener('click', () => {
    hideModal();
    if (onConfirm) onConfirm();
  });
  if (cancelBtn && onCancel) {
    cancelBtn.addEventListener('click', () => {
      hideModal();
      onCancel();
    });
  }

  container.appendChild(clone);
  // Focus management for accessibility
  if (confirmBtn) confirmBtn.focus();
}

/**
 * Show an event resolution modal with event data and choice buttons.
 * @param {Object} event - Event object with title, description, choices
 * @returns {void}
 */
/**
 * @param {Object} [storeLike] - Optional store-like object with dispatch() method
 *   for dispatching EVENT_RESOLVED. If not provided, choice buttons still work
 *   but won't dispatch (caller should handle dispatch separately).
 */
export function showEventModal(event, storeLike = null) {
  const container = document.getElementById('modal-overlay-container');
  if (!container) return;

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.setAttribute('data-modal', 'true');

  const content = document.createElement('div');
  content.className = 'modal-content';

  const title = document.createElement('h3');
  title.textContent = event.title;
  content.appendChild(title);

  const desc = document.createElement('p');
  desc.className = 'modal-message';
  desc.textContent = event.description;
  content.appendChild(desc);

  const choices = document.createElement('div');
  choices.className = 'modal-choices';

  if (event.choices) {
    event.choices.forEach((choice, index) => {
      const btn = document.createElement('button');
      btn.className = 'modal-choice-btn';
      btn.textContent = choice.label;
      btn.addEventListener('click', () => {
        hideModal();
        if (storeLike && choice.effect) {
          // Dispatch event resolution through store
          storeLike.dispatch({
            type: 'EVENT_RESOLVED',
            payload: { eventId: event.eventId, choiceIndex: index }
          });
        }
      });
      choices.appendChild(btn);
    });
  }

  content.appendChild(choices);
  modal.appendChild(content);
  container.appendChild(modal);

  // Focus first choice button
  if (choices.firstChild) choices.firstChild.focus();
}

/**
 * Hide the modal overlay.
 * @returns {void}
 */
export function hideModal() {
  const container = document.getElementById('modal-overlay-container');
  if (!container) return;
  container.innerHTML = '';
}
