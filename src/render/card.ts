// Adventurers Guild Simulator — Card Rendering Functions
// =======================================================
// DOM-based card rendering using HTML <template> elements.
// All cards are cloned from templates and populated with data via data-* attributes.
//
// Threat mitigation T-04-01: Game data is inserted via textContent/setAttribute,
// never innerHTML. Only trusted template structures are parsed from HTML.

import type { GameState, Adventurer, Quest, QuestTemplate, EventTemplate, GameEvent } from '../types.js';
import {
  getEvolutionStatus,
} from '../entities/index.js';

// ─── Public API ────────────────────────────────────────

export type CardType = 'adventurer' | 'quest' | 'event';

/**
 * Main card renderer dispatcher.
 */
export function renderCard(
  type: CardType,
  data: Adventurer | Quest | EventTemplate,
  state: GameState,
  context?: string,
): HTMLElement | null {
  switch (type) {
    case 'adventurer':
      return renderAdventurerCard(data as Adventurer, state);
    case 'quest':
      return renderQuestCard(data as Quest, state, context);
    case 'event':
      return renderEventCard(data as EventTemplate, state);
    default: {
      console.warn(`[render] Unknown card type: ${type}`);
      return null;
    }
  }
}

// ─── Template Cloning Helper ────────────────────────────

/**
 * Clone a template and return its content as a DocumentFragment.
 */
function createCardElement(templateId: string): HTMLElement | null {
  const template = document.getElementById(templateId);
  if (!template) {
    console.warn(`[render] Template #${templateId} not found`);
    return null;
  }
  const frag = document.importNode(template.content, true);
  return frag.firstElementChild;
}

// ─── Adventurer Card Renderer ──────────────────────────

/**
 * Render an adventurer card from template.
 */
export function renderAdventurerCard(
  adventurer: Adventurer,
  state: GameState,
): HTMLElement | null {
  const frag = createCardElement('adventurer-card-template');
  if (!frag) return null;

  // Name
  const nameEl = frag.querySelector('[data-name]');
  if (nameEl) nameEl.textContent = adventurer.name ?? 'Unnamed';

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
    const classLetter = (adventurer.class ?? '?')[0].toUpperCase();
    classIconEl.textContent = classLetter;
  }

  // Stats grid
  const stats = adventurer.stats ?? {};
  for (const stat of ['str', 'dex', 'int', 'vit', 'lck'] as const) {
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
    moraleValue.textContent = String(morale);
  }

  // Equipment slots
  const equipment = adventurer.equipment ?? {};
  for (const slot of ['weapon', 'armor', 'accessory'] as const) {
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
    rankEl.textContent = adventurer.rank ?? 'Novice';
  }

  // Origin badge
  const originEl = frag.querySelector('[data-origin]');
  if (originEl) {
    originEl.textContent = adventurer.origin ?? 'Unknown';
  }

  // Evolution section
  const evolution = getEvolutionStatus(adventurer);
  if (evolution.matching.length > 0) {
    const evolveBtn = document.createElement('button');
    evolveBtn.className = 'btn-evolve';
    evolveBtn.textContent = 'Evolve Class!';
    evolveBtn.addEventListener('click', () => {
      if (window.__guildStore) {
        window.__guildStore.dispatch({
          type: 'EVOLVE_CLASS',
          payload: { adventurerId: adventurer.id },
        });
      }
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
    const equipment = adventurer.equipment ?? {};
    const missing = evolution.unmet
      .slice(0, 2)
      .map(
        (e) =>
          `${e.result}: ${e.missing
            .map(
              ([slot, cls]) =>
                `${slot}: ${equipment[slot]?.name ?? 'None'} (need ${cls})`,
            )
            .join(', ')}`,
      )
      .join(' | ');
    progressEl.textContent = `Evolution possible with: ${missing}`;
    progressEl.style.cssText =
      'font-size: 0.75em; color: #888; margin-top: 4px;';
    const footer = frag.querySelector('.card-footer');
    if (footer) {
      footer.before(progressEl);
    } else {
      frag.appendChild(progressEl);
    }
  }

  // Visual indicator for evolved adventurers
  if (adventurer.evolved) {
    const evolvedIconEl = frag.querySelector('[data-class-icon]');
    if (evolvedIconEl) {
      evolvedIconEl.style.border = '2px solid #f0c040';
      evolvedIconEl.style.boxShadow = '0 0 8px rgba(240, 192, 64, 0.5)';
    }
  }

  return frag;
}

// ─── Quest Card Renderer ───────────────────────────────

/**
 * Render a quest card from template.
 */
export function renderQuestCard(
  quest: Quest,
  state: GameState,
  context: string = 'board',
): HTMLElement | null {
  const frag = createCardElement('quest-card-template');
  if (!frag) return null;

  const isDashboard = context === 'dashboard';
  const partyAdventurers = (state?.party?.adventurerIds ?? [])
    .map((id) => state?.adventurers?.find((a) => a.id === id))
    .filter(Boolean) as Adventurer[];

  function adventurerMeetsStats(adventurer: Adventurer, q: Quest): boolean {
    const reqStats = q.requirements?.minStats ?? {};
    for (const stat of ['str', 'dex', 'int', 'vit', 'lck'] as const) {
      if (
        (reqStats[stat] ?? 0) > 0 &&
        (adventurer[stat] ?? 0) < (reqStats[stat] ?? 0)
      ) {
        return false;
      }
    }
    return true;
  }

  const minPartySize = quest.requirements?.minPartySize;
  const anySingleMeetsStats = partyAdventurers.some((a) =>
    adventurerMeetsStats(a, quest),
  );
  const effectiveMinSize = anySingleMeetsStats ? 1 : minPartySize ?? 1;
  const partySize = partyAdventurers.length;
  const meetsSizeRequirement = partySize >= effectiveMinSize;

  if (isDashboard) {
    const progressSection = frag.querySelector('[data-progress-section]');
    const reqStats = frag.querySelector('[data-req-stats]');
    const partySizeBadge = frag.querySelector('[data-party-size-badge]');
    const questActions = frag.querySelector('[data-action="send-party"]');

    if (reqStats) reqStats.style.display = 'none';
    if (partySizeBadge) partySizeBadge.parentElement!.style.display = 'none';
    if (questActions) questActions.parentElement!.style.display = 'none';
    if (progressSection) {
      progressSection.style.display = 'block';
      const ticksNeeded = (quest.difficulty ?? 1) * 10;
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
    sendBtn.setAttribute(
      'aria-disabled',
      String(!meetsSizeRequirement || partySize === 0),
    );
    if (meetsSizeRequirement && partySize > 0) {
      sendBtn.addEventListener('click', () => {
        if (window.__guildStore) {
          const state = window.__guildStore.getState();
          if (
            state.activeQuest &&
            state.activeQuest.questId === quest.id
          ) {
            console.warn(
              `[Render] Quest "${quest.name}" already active — complete it first.`,
            );
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
 */
export function renderEventCard(
  event: EventTemplate,
  state: GameState,
): HTMLElement | null {
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
    const categoryColors: Record<string, string> = {
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
            window.dispatchEvent(
              new CustomEvent('event-choice', {
                detail: { eventId, choiceIndex: choice.index },
              }),
            );
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
 */
export function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
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
 */
export function getMoraleBarColor(morale: number): string {
  if (morale < 30) return '#e94560'; // red
  if (morale < 60) return '#ff9800'; // orange/yellow
  return '#4caf50'; // green
}

/**
 * Generate difficulty star string.
 */
export function getDifficultyStars(difficulty: number): string {
  return '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty);
}
