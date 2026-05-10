// Adventurers Guild Simulator — Card Rendering Engine
// ===================================================
// DOM-based card rendering using HTML <template> elements.
// All cards are cloned from templates and populated with data via data-* attributes.
// Full re-render on every store dispatch (D-07).
//
// Threat mitigation T-04-01: Game data is inserted via textContent/setAttribute,
// never innerHTML. Only trusted template structures are parsed from HTML.

import { VALID_CLASSES, RARITY_TIERS } from './entities.js';

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
