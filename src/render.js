// Adventurers Guild Simulator — Card Rendering Engine
// ===================================================
// DOM-based card rendering using HTML <template> elements.
// All cards are cloned from templates and populated with data via data-* attributes.
// Full re-render on every store dispatch (D-07).
//
// Threat mitigation T-04-01: Game data is inserted via textContent/setAttribute,
// never innerHTML. Only trusted template structures are parsed from HTML.

import { VALID_CLASSES, RARITY_TIERS, calculateOfficeLevel, getUpgradeEffect, getFameGatedQuestPool, getFameLevel, getEvolutionStatus, evolveAdventurer, generateRecruitmentPool, generateQuestPool, getAvailableUpgrades } from './entities/index.js';

// ─── Public API ────────────────────────────────────────

/**
 * Main card renderer dispatcher.
 * @param {string} type - Card type: 'adventurer', 'quest', or 'event'
 * @param {Object} data - Card data object
 * @param {Object} state - Current game state (for party lookup, etc.)
 * @param {string} [context] - Render context (e.g., 'board', 'dashboard')
 * @returns {DocumentFragment|null} Populated card element, or null on error
 */
export function renderCard(type, data, state, context) {
  switch (type) {
    case 'adventurer': return renderAdventurerCard(data, state);
    case 'quest': return renderQuestCard(data, state, context);
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
  const frag = document.importNode(template.content, true);
  return frag.firstElementChild;
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

  // Guild Master badge
  if (adventurer.isGuildMaster) {
    const nameContainer = frag.querySelector('.adventurer-info');
    if (nameContainer) {
      const badge = document.createElement('span');
      badge.className = 'guild-master-badge';
      badge.textContent = 'Guild Master';
      nameContainer.appendChild(badge);
    }
  }

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

  // Evolution section
  const evolution = getEvolutionStatus(adventurer);
  if (evolution.matching.length > 0) {
    const evolveBtn = document.createElement('button');
    evolveBtn.className = 'btn-evolve';
    evolveBtn.textContent = 'Evolve Class!';
    evolveBtn.addEventListener('click', () => {
      showConfirmModal(
        `Evolve ${adventurer.name} to ${evolution.matching[0].result}? This will permanently change their class.`,
        () => {
          if (window.__guildStore) {
            window.__guildStore.dispatch({
              type: 'EVOLVE_CLASS',
              payload: { adventurerId: adventurer.id }
            });
          }
        }
      );
    });
    // Insert before the card footer if it exists
    const footer = frag.querySelector('.card-footer');
    if (footer) {
      footer.before(evolveBtn);
    } else {
      frag.appendChild(evolveBtn);
    }
  } else if (evolution.unmet.length > 0) {
    // Show evolution progress hint
    const progressEl = document.createElement('div');
    progressEl.className = 'evolution-hint';
    const equipment = adventurer.equipment || {};
    const missing = evolution.unmet.slice(0, 2).map(e =>
      `${e.result}: ${e.missing.map(([slot, cls]) => `${slot}: ${equipment[slot]?.name || 'None'} (need ${cls})`).join(', ')}`
    ).join(' | ');
    progressEl.textContent = `Evolution possible with: ${missing}`;
    progressEl.style.cssText = 'font-size: 0.75em; color: #888; margin-top: 4px;';
    const footer = frag.querySelector('.card-footer');
    if (footer) {
      footer.before(progressEl);
    } else {
      frag.appendChild(progressEl);
    }
  }

  // Visual indicator for evolved adventurers
  if (adventurer.evolved) {
    const classIconEl2 = frag.querySelector('[data-class-icon]');
    if (classIconEl2) {
      classIconEl2.style.border = '2px solid #f0c040';
      classIconEl2.style.boxShadow = '0 0 8px rgba(240, 192, 64, 0.5)';
    }
  }

  return frag;
}

// ─── Quest Card Renderer ───────────────────────────────

/**
 * Render a quest card from template.
 * @param {Object} quest - Quest entity
 * @param {Object} state - Current game state
 * @param {string} [context='board'] - Render context: 'board' or 'dashboard'
 * @returns {DocumentFragment|null}
 */
export function renderQuestCard(quest, state, context = 'board') {
  const frag = createCardElement('quest-card-template');
  if (!frag) return null;

  const isDashboard = context === 'dashboard';
  const partyAdventurers = (state?.party?.adventurerIds || [])
    .map(id => state?.adventurers?.find(a => a.id === id))
    .filter(Boolean);

  function adventurerMeetsStats(adventurer, quest) {
    const reqStats = quest.requirements?.minStats || {};
    for (const stat of ['str', 'dex', 'int', 'vit', 'lck']) {
      if ((reqStats[stat] ?? 0) > 0 && (adventurer?.[stat] ?? 0) < reqStats[stat]) {
        return false;
      }
    }
    return true;
  }

  const minPartySize = quest.requirements?.minPartySize;
  const anySingleMeetsStats = partyAdventurers.some(a => adventurerMeetsStats(a, quest));
  const effectiveMinSize = anySingleMeetsStats ? 1 : (minPartySize ?? 1);
  const partySize = partyAdventurers.length;
  const meetsSizeRequirement = partySize >= effectiveMinSize;

  if (isDashboard) {
    const progressSection = frag.querySelector('[data-progress-section]');
    const reqStats = frag.querySelector('[data-req-stats]');
    const partySizeBadge = frag.querySelector('[data-party-size-badge]');
    const questActions = frag.querySelector('[data-action="send-party"]');

    if (reqStats) reqStats.style.display = 'none';
    if (partySizeBadge) partySizeBadge.parentElement.style.display = 'none';
    if (questActions) questActions.parentElement.style.display = 'none';
    if (progressSection) {
      progressSection.style.display = 'block';
      const ticksNeeded = (quest.difficulty || 1) * 10;
      const currentTicks = state?.questTickCount ?? 0;
      const progress = Math.min(100, Math.round((currentTicks / ticksNeeded) * 100));
      const fill = frag.querySelector('[data-progress-fill]');
      const label = frag.querySelector('[data-progress-label]');
      if (fill) fill.style.width = `${progress}%`;
      if (label) label.textContent = `${progress}% complete`;
    }
  } else {
    const progressSection = frag.querySelector('[data-progress-section]');
    if (progressSection) progressSection.style.display = 'none';
  }

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

  // Party size badge & Send Party button
  const sizeBadge = frag.querySelector('[data-party-size-badge]');
  if (sizeBadge && !isDashboard) {
    if (effectiveMinSize === 1) {
      const hasSingleQualified = anySingleMeetsStats && minPartySize != null;
      sizeBadge.textContent = hasSingleQualified
        ? '1 adventurer qualifies (relaxed)'
        : 'No size requirement';
      sizeBadge.className = 'party-size-badge party-size-met';
    } else if (meetsSizeRequirement) {
      sizeBadge.textContent = `${partySize}/${effectiveMinSize}`;
      sizeBadge.className = 'party-size-badge party-size-met';
    } else {
      const needed = effectiveMinSize - partySize;
      sizeBadge.textContent = `${partySize}/${effectiveMinSize} (need ${needed} more)`;
      sizeBadge.className = 'party-size-badge party-size-short';
    }
  }

  const sendBtn = frag.querySelector('[data-action="send-party"]');
  if (sendBtn && !isDashboard) {
    sendBtn.disabled = !meetsSizeRequirement || partySize === 0;
    sendBtn.setAttribute('aria-disabled', String(!meetsSizeRequirement || partySize === 0));
    if (meetsSizeRequirement && partySize > 0) {
      sendBtn.addEventListener('click', () => {
        if (window.__guildStore) {
          const state = window.__guildStore.getState();
          if (state.activeQuest && state.activeQuest.questId === quest.id) {
            console.warn(`[Render] Quest "${quest.name}" already active — complete it first.`);
            return;
          }
          window.__guildStore.dispatch({
            type: 'SEND_QUEST',
            payload: { questId: quest.id },
          });
        }
      });
    }
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
    case 'recruitment': return renderRecruitment(state);
    case 'quests': return renderQuestBoard(state);
    case 'events': return renderEvents(state);
    case 'upgrades': return renderUpgrades(state);
    default: return renderDashboard(state);
  }
}

/**
 * Render notification cards in the dashboard.
 * @param {Object} state - Current game state
 */
function renderNotifications(state) {
  const notifications = state.notifications || [];
  if (notifications.length === 0) return;

  const container = document.getElementById('game-content');
  const notifContainer = document.createElement('div');
  notifContainer.id = 'notifications-container';

  for (const notif of notifications) {
    const notifCard = document.createElement('div');
    notifCard.className = 'notification-card';
    notifCard.setAttribute('data-notif-id', notif.id);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.textContent = '×';
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

/**
 * Dashboard view — overview cards (office level, active quest, party status, recent events).
 * @param {Object} state - Current game state
 */
function renderDashboard(state) {
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
    const questCard = renderCard('quest', state.activeQuest.questData, state, 'dashboard');
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

  const { adventurers, party } = state;
  const partyIds = new Set(party?.adventurerIds || []);

  // Party status bar
  const partyBar = document.createElement('div');
  partyBar.className = 'card party-status-card';
  partyBar.innerHTML = `
    <h3>Party (${partyIds.size}/${adventurers.length})</h3>
    <div class="party-summary">
      <span>${[...partyIds].map(id => adventurers.find(a => a.id === id)?.name || '?').join(', ') || 'No party members'}</span>
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
    const card = renderCard('adventurer', adventurer, state);
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
          let newPartyIds;
          if (isInParty) {
            newPartyIds = currentParty.filter(id => id !== adventurer.id);
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
 * Recruitment view — recruitment pool with hire buttons and restock option.
 * @param {Object} state - Current game state
 */
function renderRecruitment(state) {
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
    const card = renderCard('adventurer', adventurer, state);
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

/**
 * Quest Board view — available quest cards.
 * @param {Object} state - Current game state
 */
function renderQuestBoard(state) {
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
 * Create a fame level card element.
 * @param {Object} fameData - Fame level data from getFameLevel()
 * @returns {HTMLElement}
 */
function createFameCard(fameData) {
  const card = document.createElement('div');
  card.className = 'card fame-card';
  card.innerHTML = `
    <h3>Fame: ${fameData.currentFame}</h3>
    <span class="fame-tier">${fameData.name}</span>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${fameData.progress * 100}%"></div>
    </div>
    <span class="progress-label">${fameData.nextLevel ? `Next: ${fameData.nextLevel}` : 'Max Fame'}</span>
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
