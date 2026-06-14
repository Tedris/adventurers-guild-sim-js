// Adventurers Guild Simulator — Card Rendering Functions
// =======================================================
// DOM-based card rendering using HTML <template> elements.
// All cards are cloned from templates and populated with data via data-* attributes.
//
// Threat mitigation T-04-01: Game data is inserted via textContent/setAttribute,
// never innerHTML. Only trusted template structures are parsed from HTML.

import type {
  GameState,
  Adventurer,
  Quest,
  QuestTemplate,
  EventTemplate,
  GameEvent,
  Stats,
  Equipment,
  EquipmentItem,
  StoreAction,
} from '../types.js';
import {
  getEvolutionStatus,
  PERSONALITY_TRAIT_TABLE,
} from '../entities/index.js';
import {
  positiveEventFeedback,
  negativeEventFeedback,
  neutralEventFeedback,
  questSuccessCelebration,
  questFailureAnimation,
  playAnimation,
  scalePulse,
} from '../animation.js';

// ─── Event Listener Cleanup ────────────────────────────

/**
 * Stores event listener references on elements for cleanup.
 * Using WeakMap to avoid memory leaks — keys are HTMLElements, values are arrays of {type, listener, options}.
 */
const _listenerRefs = new WeakMap<HTMLElement, Array<{ type: string; listener: EventListener; options: AddEventListenerOptions | boolean }>>();

/**
 * Attach an event listener to an element while tracking it for cleanup.
 * This enables deterministic removal of all listeners when an element is discarded.
 */
export function trackEventListener(
  element: HTMLElement,
  type: string,
  listener: EventListener,
  options?: AddEventListenerOptions | boolean,
): void {
  element.addEventListener(type, listener, options);
  if (!_listenerRefs.has(element)) {
    _listenerRefs.set(element, []);
  }
  _listenerRefs.get(element)!.push({ type, listener, options: options ?? false });
}

/**
 * Detach all tracked event listeners from an element.
 * Call this before removing an element from the DOM to prevent orphaned listeners.
 */
export function detachAllListeners(element: HTMLElement): void {
  const refs = _listenerRefs.get(element);
  if (refs) {
    for (const { type, listener, options } of refs) {
      element.removeEventListener(type, listener, options);
    }
    _listenerRefs.delete(element);
  }
}

// ─── Public API ────────────────────────────────────────

export type CardType = 'adventurer' | 'quest' | 'event';

/**
 * Dispatch callback type for render functions.
 * Compatible with StoreLike.dispatch from event-display.ts.
 */
export type DispatchFn = (action: StoreAction) => boolean;

/**
 * Main card renderer dispatcher.
 */
export function renderCard(
  type: CardType,
  data: Adventurer | Quest | EventTemplate,
  state: GameState,
  context?: string,
  dispatch?: DispatchFn,
): HTMLElement | null {
  switch (type) {
    case 'adventurer':
      return renderAdventurerCard(data as Adventurer, state, dispatch);
    case 'quest':
      return renderQuestCard(data as Quest, state, context, dispatch);
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
 * Clone a template and return the first element child.
 */
function createCardElement(templateId: string): HTMLElement | null {
  const template = document.getElementById(templateId);
  if (!template || !(template instanceof HTMLTemplateElement)) {
    console.warn(`[render] Template #${templateId} not found`);
    return null;
  }
  const frag = document.importNode(template.content, true);
  return frag.firstElementChild as HTMLElement;
}

/**
 * Query a child element from a fragment, casting to HTMLElement.
 */
function queryEl(
  frag: HTMLElement | DocumentFragment,
  selector: string,
): HTMLElement | null {
  return frag.querySelector(selector) as HTMLElement | null;
}

/**
 * Safe equipment slot access.
 */
function getEquipSlot(
  equipment: Equipment,
  slot: 'weapon' | 'armor' | 'accessory',
): EquipmentItem | null {
  return equipment[slot];
}

// ─── Adventurer Card Renderer ──────────────────────────

/**
 * Render an adventurer card from template.
 */
export function renderAdventurerCard(
  adventurer: Adventurer,
  state: GameState,
  dispatch?: DispatchFn,
): HTMLElement | null {
  const frag = createCardElement('adventurer-card-template');
  if (!frag) return null;

  // Name
  const nameEl = queryEl(frag, '[data-name]');
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
  // Show evolved class name when the adventurer has evolved
  const displayClass = adventurer.evolvedClass || adventurer.class;
  const classIconEl = queryEl(frag, '[data-class-icon]');
  if (classIconEl) {
    const classLetter = (displayClass ?? '?')[0].toUpperCase();
    classIconEl.textContent = classLetter;
    // "Evolved" badge for evolved adventurers
    if (adventurer.evolved) {
      const evolvedBadge = document.createElement('span');
      evolvedBadge.className = 'evolved-badge';
      evolvedBadge.textContent = 'Evolved';
      evolvedBadge.style.cssText = 'font-size: 0.7em; color: #f0c040; margin-left: 4px; font-weight: bold;';
      classIconEl.after(evolvedBadge);
    }
  }

  // Stats grid
  const stats: Stats = adventurer.stats ?? { str: 0, dex: 0, int: 0, vit: 0, lck: 0 };
  const statKeys: (keyof Stats)[] = ['str', 'dex', 'int', 'vit', 'lck'];
  for (const stat of statKeys) {
    const statEl = queryEl(frag, `[data-stat="${stat}"]`);
    if (statEl) {
      const label = stat.toUpperCase();
      const value = stats[stat] ?? 0;
      statEl.textContent = `${label}: ${value}`;
    }
  }

  // Morale bar
  const morale = adventurer.morale ?? 70;
  const moraleBar = queryEl(frag, '[data-morale-bar]');
  const moraleValue = queryEl(frag, '[data-morale]');
  if (moraleBar) {
    moraleBar.style.width = `${morale}%`;
    moraleBar.style.backgroundColor = getMoraleBarColor(morale);
  }
  if (moraleValue) {
    moraleValue.textContent = String(morale);
  }

  // Equipment slots
  const equipment: Equipment = adventurer.equipment ?? { weapon: null, armor: null, accessory: null };
  const equipSlots: ('weapon' | 'armor' | 'accessory')[] = ['weapon', 'armor', 'accessory'];
  for (const slot of equipSlots) {
    const equipEl = queryEl(frag, `[data-equip="${slot}"]`);
    const rarityEl = queryEl(frag, `[data-rarity="${slot}"]`);
    if (equipEl && rarityEl) {
      const item = getEquipSlot(equipment, slot);
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
  const rankEl = queryEl(frag, '[data-rank]');
  if (rankEl) {
    rankEl.textContent = adventurer.rank ?? 'Novice';
  }

  // Origin badge
  const originEl = queryEl(frag, '[data-origin]');
  if (originEl) {
    originEl.textContent = adventurer.origin ?? 'Unknown';
  }

  // Evolution section
  // Evolution is irreversible (D-04), so only show for non-evolved adventurers
  const evolution = getEvolutionStatus(adventurer);
  if (!adventurer.evolved && evolution.matching.length > 0) {
    const evolveBtn = document.createElement('button');
    evolveBtn.className = 'btn-evolve';
    evolveBtn.textContent = 'Evolve Class!';
    const evolveHandler = () => {
      if (dispatch) {
        dispatch({
          type: 'EVOLVE_CLASS',
          payload: { adventurerId: adventurer.id },
        });
      }
    };
    trackEventListener(evolveBtn, 'click', evolveHandler);
    // Insert before the card footer if it exists
    const footer = frag.querySelector('.card-footer');
    if (footer) {
      footer.before(evolveBtn);
    } else {
      frag.appendChild(evolveBtn);
    }
  } else if (!adventurer.evolved && evolution.unmet.length > 0) {
    // Show evolution progress hint
    const progressEl = document.createElement('div');
    progressEl.className = 'evolution-hint';
    const equip = adventurer.equipment ?? { weapon: null, armor: null, accessory: null };
    const missing = evolution.unmet
      .slice(0, 2)
      .map(
        (e) =>
          `${e.result}: ${e.missing
            .map(
              ([slot, cls]) =>
                `${slot}: ${getEquipSlot(equip, slot as 'weapon' | 'armor' | 'accessory')?.name ?? 'None'} (need ${cls})`,
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
    const evolvedIconEl = queryEl(frag, '[data-class-icon]');
    if (evolvedIconEl) {
      evolvedIconEl.style.border = '2px solid #f0c040';
      evolvedIconEl.style.boxShadow = '0 0 8px rgba(240, 192, 64, 0.5)';
    }
  }

  // Trait badges
  const traitsListEl = queryEl(frag, '[data-traits]');
  if (traitsListEl && adventurer.personality?.traits) {
    for (const traitName of adventurer.personality.traits) {
      const traitDef = PERSONALITY_TRAIT_TABLE[traitName];
      if (traitDef) {
        const badge = document.createElement('span');
        badge.className = 'trait-badge';
        badge.textContent = traitName;
        badge.title = traitDef.description;

        // Categorize traits by name patterns
        const mysticalTraits = ['Arcane Prodigy', 'Dreamwalker', 'Spirit-Talker', 'Starborn', 'Void-Watcher'];
        const disciplinedTraits = ['Iron-Willed', 'Ascetic', 'Devout', 'Stoic', 'Zealous'];

        if (mysticalTraits.includes(traitName)) {
          badge.classList.add('mystical');
        } else if (disciplinedTraits.includes(traitName)) {
          badge.classList.add('disciplined');
        }

        traitsListEl.appendChild(badge);
      }
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
  dispatch?: DispatchFn,
): HTMLElement | null {
  const frag = createCardElement('quest-card-template');
  if (!frag) return null;

  const isDashboard = context === 'dashboard';
  const partyAdventurers = (state?.party?.adventurerIds ?? [])
    .map((id) => state?.adventurers?.find((a) => a.id === id))
    .filter(Boolean) as Adventurer[];

  function adventurerMeetsStats(adventurer: Adventurer, q: Quest): boolean {
    const reqStats: Stats = q.requirements?.minStats ?? { str: 0, dex: 0, int: 0, vit: 0, lck: 0 };
    const advStats: Stats = adventurer.stats ?? { str: 0, dex: 0, int: 0, vit: 0, lck: 0 };
    const statKeys: (keyof Stats)[] = ['str', 'dex', 'int', 'vit', 'lck'];
    for (const stat of statKeys) {
      if (
        (reqStats[stat] ?? 0) > 0 &&
        (advStats[stat] ?? 0) < (reqStats[stat] ?? 0)
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
    const progressSection = queryEl(frag, '[data-progress-section]');
    const reqStatsEl = queryEl(frag, '[data-req-stats]');
    const partySizeBadge = queryEl(frag, '[data-party-size-badge]');
    const questActions = queryEl(frag, '[data-action="send-party"]');

    if (reqStatsEl) reqStatsEl.style.display = 'none';
    if (partySizeBadge && partySizeBadge.parentElement)
      partySizeBadge.parentElement.style.display = 'none';
    if (questActions && questActions.parentElement)
      questActions.parentElement.style.display = 'none';
    if (progressSection) {
      progressSection.style.display = 'block';
      const ticksNeeded = (quest.difficulty ?? 1) * 10;
      const currentTicks = state?.questTickCount ?? 0;
      const progress = Math.min(100, Math.round((currentTicks / ticksNeeded) * 100));
      const fill = queryEl(frag, '[data-progress-fill]');
      const label = queryEl(frag, '[data-progress-label]');
      if (fill) fill.style.width = `${progress}%`;
      if (label) label.textContent = `${progress}% complete`;
    }
  } else {
    const progressSection = queryEl(frag, '[data-progress-section]');
    if (progressSection) progressSection.style.display = 'none';
  }

  // Name
  const nameEl = queryEl(frag, '[data-name]');
  if (nameEl) nameEl.textContent = quest.name || 'Unnamed Quest';

  // Difficulty stars
  const difficultyEl = queryEl(frag, '[data-difficulty]');
  if (difficultyEl) {
    const difficulty = quest.difficulty || 1;
    difficultyEl.textContent = getDifficultyStars(difficulty);
  }

  // Description
  const descEl = queryEl(frag, '[data-description]');
  if (descEl) descEl.textContent = quest.description || 'No description.';

  // Requirements stats
  const reqStats: Stats = (quest.requirements && quest.requirements.minStats) || { str: 0, dex: 0, int: 0, vit: 0, lck: 0 };
  const statKeys: (keyof Stats)[] = ['str', 'dex', 'int', 'vit', 'lck'];
  for (const stat of statKeys) {
    const statEl = queryEl(frag, `[data-req-stat="${stat}"]`);
    if (statEl) {
      const label = stat.toUpperCase();
      const value = reqStats[stat] ?? 0;
      statEl.textContent = `${label}: ${value}`;
    }
  }

  // Preferred classes list
  const classesList = queryEl(frag, '[data-classes]');
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
  const goldEl = queryEl(frag, '[data-gold]');
  if (goldEl) {
    const gold = quest.rewards?.gold ?? 0;
    goldEl.textContent = `⛃ ${gold}`;
  }
  const xpEl = queryEl(frag, '[data-experience]');
  if (xpEl) {
    const xp = quest.rewards?.experience ?? 0;
    xpEl.textContent = `✦ ${xp} XP`;
  }

  // Party size badge & Send Party button
  const sizeBadge = queryEl(frag, '[data-party-size-badge]');
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

  const sendBtn = queryEl(frag, '[data-action="send-party"]') as HTMLButtonElement | null;
  if (sendBtn && !isDashboard) {
    sendBtn.disabled = !meetsSizeRequirement || partySize === 0;
    sendBtn.setAttribute(
      'aria-disabled',
      String(!meetsSizeRequirement || partySize === 0),
    );
    if (meetsSizeRequirement && partySize > 0) {
      const sendHandler = () => {
        if (dispatch) {
          const activeQ = state.activeQuest;
          if (
            activeQ &&
            activeQ.questId === quest.id
          ) {
            console.warn(
              `[Render] Quest "${quest.name}" already active — complete it first.`,
            );
            return;
          }
          dispatch({
            type: 'SEND_QUEST',
            payload: { questId: quest.id },
          });
          // Brief scale pulse for visual feedback
          const anim = scalePulse(200);
          playAnimation(frag, anim);
        }
      };
      trackEventListener(sendBtn, 'click', sendHandler);
    }
  }

  // Apply quest result animation in dashboard context
  if (isDashboard && state.activeQuest?.result) {
    const { success } = state.activeQuest.result;
    const animConfig = success
      ? questSuccessCelebration()
      : questFailureAnimation();
    playAnimation(frag, animConfig);
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
  const titleEl = queryEl(frag, '[data-title]');
  if (titleEl) titleEl.textContent = event.title || 'Event';

  // Category badge (color-coded)
  const categoryEl = queryEl(frag, '[data-category]');
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
  const descEl = queryEl(frag, '[data-description]');
  if (descEl) descEl.textContent = event.description || 'No description.';

  // Choice buttons
  const choicesContainer = queryEl(frag, '[data-choices]');
  if (choicesContainer && event.choices) {
    for (let i = 0; i < event.choices.length; i++) {
      const choice = event.choices[i];
      const btn = document.createElement('button');
      btn.className = 'btn-choice';
      btn.textContent = choice.label;
      btn.setAttribute('data-choice-index', String(i));
      const choiceHandler = () => {
        // Dispatch event resolution through the store
        const eventElement = btn.closest('.card-event');
        if (eventElement) {
          const eventId = eventElement.getAttribute('data-event-id');
          if (eventId) {
            window.dispatchEvent(
              new CustomEvent('event-choice', {
                detail: { eventId, choiceIndex: i },
              }),
            );
          }
        }
      };
      trackEventListener(btn, 'click', choiceHandler);
      choicesContainer.appendChild(btn);
    }
  }

  // Timestamp - EventTemplate doesn't have timestamp; it's set at runtime
  const timestampEl = queryEl(frag, '[data-timestamp]');
  if (timestampEl) {
    const day = (event as unknown as Record<string, unknown>).timestamp ?? state?.day ?? 0;
    timestampEl.textContent = `Day ${day}`;
  }

  // Apply event feedback animation based on category
  const category = event.category || 'Drama';
  let animConfig: ReturnType<typeof positiveEventFeedback>;
  switch (category) {
    case 'Budget':
      // Budget events: check for gold change info if available
      animConfig = positiveEventFeedback();
      break;
    case 'Crisis':
      animConfig = negativeEventFeedback();
      break;
    default: // Drama
      animConfig = neutralEventFeedback();
      break;
  }
  // Apply animation to the card's root element after rendering
  const eventAnim = playAnimation(frag, animConfig);

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
