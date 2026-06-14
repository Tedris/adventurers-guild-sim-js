// Adventurers Guild Simulator — Tooltip Rendering System
// ======================================================
// Interactive hover tooltips for adventurer cards in the roster.
// Uses a single shared DOM element that moves to cursor position on hover.
//
// No game state changes — purely a UI display layer.

import type { Adventurer, GameState, Quest, Stats } from '../types.js';
import { PERSONALITY_TRAIT_TABLE } from '../entities/index.js';
import { getDifficultyStars } from './card.js';

// ─── Tooltip State ─────────────────────────────────────

/** Shared tooltip container element (created on first show). */
let _tooltipEl: HTMLElement | null = null;

/** Debounce handle for mousemove positioning. */
let _positionDebounceId: ReturnType<typeof requestAnimationFrame> | null = null;



/** Quest Green accent color for quest tooltips. */
const QUEST_TOOLTIP_ACCENT = '#27AE60';
const QUEST_TOOLTIP_ACCENT_RGBA = 'rgba(39, 174, 96, 0.2)';

// ─── Mechanic Tooltip Accent Colors ────────────────────

const FAME_TOOLTIP_ACCENT = '#FFD700';
const FAME_TOOLTIP_ACCENT_RGBA = 'rgba(255, 215, 0, 0.2)';
const WAGE_TOOLTIP_ACCENT = '#E74C3C';
const WAGE_TOOLTIP_ACCENT_RGBA = 'rgba(231, 76, 60, 0.2)';
const EVOLUTION_TOOLTIP_ACCENT = '#3498DB';
const EVOLUTION_TOOLTIP_ACCENT_RGBA = 'rgba(52, 152, 219, 0.2)';

// ─── Stat Source Interface ─────────────────────────────

/**
 * StatSource represents the breakdown of a single stat value.
 *
 * total = base + originBonus + sum(traitBonuses.value) + sum(equipmentBonuses.value)
 *
 * traitBonuses and equipmentBonuses arrays are reserved for future expansion.
 * Currently, traits provide morale bonuses (shown in a separate tooltip section)
 * and equipment items don't have stat_bonus fields. So total currently equals
 * base + originBonus.
 */
export interface StatSource {
  stat: keyof Stats;
  base: number;
  traitBonuses: Array<{ name: string; stat: keyof Stats; value: number }>;
  originBonus: number;
  equipmentBonuses: Array<{ name: string; stat: keyof Stats; value: number }>;
  total: number;
}

// ─── Stat Breakdown Computation ────────────────────────

/**
 * Compute stat breakdown from an Adventurer object.
 * Returns an array of StatSource objects, one per stat.
 * Pure function — does not touch DOM or game state.
 */
export function computeStatBreakdown(adventurer: Adventurer): StatSource[] {
  const statKeys: (keyof Stats)[] = ['str', 'dex', 'int', 'vit', 'lck'];
  const baseStats = adventurer.stats;

  const results: StatSource[] = statKeys.map((stat) => ({
    stat,
    base: baseStats[stat] ?? 0,
    traitBonuses: [],
    originBonus: 0,
    equipmentBonuses: [],
    total: 0,
  }));

  // Trait morale bonuses — traits don't directly add to STR/DEX/INT/VIT/LCK
  // but they provide morale bonuses which are relevant for tooltip display.
  // We show trait morale values as a separate section, not as stat additions.

  // Equipment bonuses — current equipment items don't have stat_bonus fields
  // (only name, rarity, slot). The equipment section will be empty.

  // Compute totals
  for (const result of results) {
    result.total = result.base + result.originBonus;
    for (const tb of result.traitBonuses) {
      result.total += tb.value;
    }
    for (const eb of result.equipmentBonuses) {
      result.total += eb.value;
    }
  }

  return results;
}

/**
 * Get morale bonuses from adventurer's traits.
 * Returns an array of { traitName, moraleValue } objects.
 */
export function computeTraitMoraleBonuses(adventurer: Adventurer): Array<{ name: string; value: number }> {
  const traits = adventurer.personality?.traits ?? [];
  const bonuses: Array<{ name: string; value: number }> = [];

  for (const traitName of traits) {
    const traitDef = PERSONALITY_TRAIT_TABLE[traitName];
    if (traitDef && traitDef.morale !== 0) {
      bonuses.push({ name: traitName, value: traitDef.morale });
    }
  }

  return bonuses;
}

// ─── Tooltip DOM Creation ──────────────────────────────

/**
 * Ensure the shared tooltip container exists in the DOM.
 * Creates it on body if it doesn't exist yet.
 */
function ensureTooltipContainer(): HTMLElement {
  if (_tooltipEl) return _tooltipEl;

  const container = document.createElement('div');
  container.id = 'tooltip-container';
  container.className = 'tooltip-container';
  container.style.display = 'none';
  document.body.appendChild(container);
  _tooltipEl = container;
  return container;
}

// ─── Tooltip Rendering ─────────────────────────────────

/**
 * Build the tooltip DOM content from an adventurer's stat breakdown.
 */
function renderTooltipContent(adventurer: Adventurer): string {
  const statBreakdown = computeStatBreakdown(adventurer);
  const moraleBonuses = computeTraitMoraleBonuses(adventurer);
  const origin = adventurer.origin ?? 'Unknown';

  let html = '';

  // Title
  html += `<div class="tooltip-title">${escapeHtml(adventurer.name)}</div>`;
  html += `<div class="tooltip-body">`;

  // Base Stats section
  html += `<div class="tooltip-section">`;
  html += `<div class="tooltip-label">Base Stats</div>`;
  for (const ss of statBreakdown) {
    html += `<div class="tooltip-row"><span class="tooltip-stat-label">${ss.stat.toUpperCase()}:</span> <span class="tooltip-stat-value">${ss.base}</span></div>`;
  }
  html += `</div>`;

  // Trait Morale Bonuses section (only if any exist)
  if (moraleBonuses.length > 0) {
    html += `<div class="tooltip-section">`;
    html += `<div class="tooltip-label">Trait Bonuses</div>`;
    for (const tb of moraleBonuses) {
      const sign = tb.value >= 0 ? '+' : '';
      html += `<div class="tooltip-row"><span class="tooltip-trait-name">${escapeHtml(tb.name)}:</span> <span class="tooltip-bonus-value ${tb.value >= 0 ? 'bonus-positive' : 'bonus-negative'}">${sign}${tb.value} morale</span></div>`;
    }
    html += `</div>`;
  }

  // Origin section (show origin name, no stat bonuses currently)
  html += `<div class="tooltip-section">`;
  html += `<div class="tooltip-label">Origin</div>`;
  html += `<div class="tooltip-row"><span class="tooltip-origin-name">${escapeHtml(origin)}</span></div>`;
  html += `</div>`;

  // Equipment section (only if there are equipment bonuses — currently always empty)
  // Omitted per AC: "equipment bonus section is omitted when no equipment equipped"
  // Extended: also omit when equipment has no stat bonuses (current state).

  html += `</div>`; // .tooltip-body

  return html;
}

/** Simple HTML entity escaper for tooltip content. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Public API: show/hide/position ────────────────────

/**
 * Show the tooltip for an adventurer at the given mouse position.
 * @param adventurer — The adventurer whose stats to display
 * @param x — Mouse X position (viewport coords)
 * @param y — Mouse Y position (viewport coords)
 */
export function showTooltip(adventurer: Adventurer, x: number, y: number): void {
  const container = ensureTooltipContainer();
  container.innerHTML = renderTooltipContent(adventurer);

  // Position at (0, 0) before making visible to prevent transition jump.
  // The correct position is set in the next rAF callback.
  container.style.left = '0px';
  container.style.top = '0px';
  container.classList.add('tooltip-visible');

  positionTooltip(x, y);
}

/**
 * Hide the tooltip and clear state.
 */
export function hideTooltip(): void {
  if (_tooltipEl) {
    _tooltipEl.classList.remove(
      'tooltip-visible',
      'mechanic-tooltip',
      'fame-tooltip',
      'wage-tooltip',
      'evolution-tooltip',
      'quest-tooltip',
    );
    _positionDebounceId && cancelAnimationFrame(_positionDebounceId);
    _positionDebounceId = null;
  }
}

/**
 * Dispose the tooltip system — remove the shared container and cancel pending animations.
 * Call this on page unload or when navigating away from the game.
 */
export function disposeTooltip(): void {
  if (_tooltipEl) {
    const parent = _tooltipEl.parentNode;
    if (parent) {
      parent.removeChild(_tooltipEl);
    }
    _tooltipEl = null;
  }
  if (_positionDebounceId) {
    cancelAnimationFrame(_positionDebounceId);
    _positionDebounceId = null;
  }
}

// ─── Quest Tooltip Computation ─────────────────────────

/**
 * Compute roster match analysis for a quest.
 * Returns an array of { stat, available, required } objects for stats where requirement > 0.
 */
function computeRosterMatch(quest: Quest, state: GameState): Array<{ stat: string; available: number; required: number }> {
  const minStats = quest.requirements?.minStats ?? { str: 0, dex: 0, int: 0, vit: 0, lck: 0 };
  const partyIds = new Set(state.party?.adventurerIds ?? []);
  const availableAdventurers = (state.adventurers ?? []).filter(a => !partyIds.has(a.id));
  const statKeys: (keyof Stats)[] = ['str', 'dex', 'int', 'vit', 'lck'];

  const matches: Array<{ stat: string; available: number; required: number }> = [];

  for (const stat of statKeys) {
    const required = minStats[stat] ?? 0;
    if (required <= 0) continue;

    const count = availableAdventurers.filter(a => {
      return (a.stats[stat] ?? 0) >= required;
    }).length;

    matches.push({ stat: stat.toUpperCase(), available: count, required });
  }

  return matches;
}

/**
 * Compute preferred class matches for a quest.
 * Returns an array of { className, available, total } objects.
 */
function computeClassMatches(quest: Quest, state: GameState): Array<{ className: string; available: number }> {
  const preferredClasses = quest.requirements?.preferredClasses ?? [];
  const partyIds = new Set(state.party?.adventurerIds ?? []);
  const availableAdventurers = (state.adventurers ?? []).filter(a => !partyIds.has(a.id));

  return preferredClasses.map(cls => ({
    className: cls,
    available: availableAdventurers.filter(a => a.class.toLowerCase() === cls.toLowerCase()).length,
  }));
}

/**
 * Build quest tooltip HTML content.
 */
export function computeQuestTooltipContent(quest: Quest, state: GameState): string {
  const difficultyStars = getDifficultyStars(quest.difficulty);
  const rosterMatches = computeRosterMatch(quest, state);
  const classMatches = computeClassMatches(quest, state);
  const description = quest.description ?? '';

  let html = '';

  html += `<div class="tooltip-title" style="color: ${QUEST_TOOLTIP_ACCENT}; border-bottom-color: ${QUEST_TOOLTIP_ACCENT_RGBA};">${escapeHtml(quest.name)}</div>`;
  html += `<div class="tooltip-body">`;

  html += renderDifficultySection(difficultyStars);
  html += renderDescriptionSection(description);
  html += renderStatRequirementsSection(rosterMatches);

  const partySize = quest.requirements?.minPartySize ?? 1;
  html += renderPartySection(partySize);

  const gold = quest.rewards?.gold ?? 0;
  const xp = quest.rewards?.experience ?? 0;
  html += renderRewardsSection(gold, xp);
  html += renderPreferredClassesSection(classMatches);

  html += `</div>`; // .tooltip-body

  return html;
}

/**
 * Render the difficulty section of a quest tooltip.
 */
function renderDifficultySection(difficultyStars: string): string {
  return `<div class="tooltip-section"><div class="tooltip-label">Difficulty</div><div class="tooltip-row"><span class="tooltip-stat-label">Stars:</span> <span class="tooltip-stat-value" style="color: #ffd700;">${difficultyStars}</span></div></div>`;
}

/**
 * Render the description section of a quest tooltip.
 */
function renderDescriptionSection(description: string): string {
  const truncatedDesc = description.length > 80 ? description.slice(0, 80) + '...' : description;
  if (!truncatedDesc) return '';
  return `<div class="tooltip-section"><div class="tooltip-label">Description</div><div class="tooltip-row"><span>${escapeHtml(truncatedDesc)}</span></div></div>`;
}

/**
 * Render the stat requirements section of a quest tooltip.
 */
function renderStatRequirementsSection(rosterMatches: Array<{ stat: string; available: number; required: number }>): string {
  if (rosterMatches.length === 0) return '';
  let html = '<div class="tooltip-section"><div class="tooltip-label">Stat Requirements</div>';
  for (const match of rosterMatches) {
    html += '<div class="tooltip-row"><span class="tooltip-stat-label">' + match.stat + ' ≥ ' + match.required + ':</span> <span class="tooltip-stat-value">' + match.available + ' available</span></div>';
  }
  html += '</div>';
  return html;
}

/**
 * Render the party size section of a quest tooltip.
 */
function renderPartySection(partySize: number): string {
  return '<div class="tooltip-section"><div class="tooltip-label">Party</div><div class="tooltip-row"><span class="tooltip-stat-label">Size:</span> <span class="tooltip-stat-value">' + partySize + ' adventurer' + (partySize !== 1 ? 's' : '') + '</span></div></div>';
}

/**
 * Render the rewards section of a quest tooltip.
 */
function renderRewardsSection(gold: number, xp: number): string {
  return '<div class="tooltip-section"><div class="tooltip-label">Rewards</div><div class="tooltip-row"><span class="tooltip-stat-label">Gold:</span> <span class="tooltip-stat-value" style="color: #ffd700;">⛃ ' + gold + '</span></div><div class="tooltip-row"><span class="tooltip-stat-label">XP:</span> <span class="tooltip-stat-value" style="color: #3498db;">✦ ' + xp + '</span></div></div>';
}

/**
 * Render the preferred classes section of a quest tooltip.
 */
function renderPreferredClassesSection(classMatches: Array<{ className: string; available: number }>): string {
  if (classMatches.length === 0) return '';
  let html = '<div class="tooltip-section"><div class="tooltip-label">Preferred Classes</div>';
  for (const cm of classMatches) {
    html += '<div class="tooltip-row"><span class="tooltip-stat-label">' + escapeHtml(cm.className) + ':</span> <span class="tooltip-stat-value">' + cm.available + ' available</span></div>';
  }
  html += '</div>';
  return html;
}

// ─── Fame Mechanic Tooltip ─────────────────────────────

/**
 * Compute the current fame level result for tooltip display.
 * Pure function — does not touch DOM or game state.
 */
export function computeFameLevelResult(fame: number): {
  name: string;
  currentFame: number;
  progress: number;
  nextLevel: string | null;
  bonus: number;
} {
  const FAME_LEVELS_INTERNAL: Array<{ min: number; bonus: number }> = [
    { min: 0,  bonus: 0 },
    { min: 10, bonus: 0.05 },
    { min: 30, bonus: 0.10 },
    { min: 60, bonus: 0.15 },
    { min: 100, bonus: 0.20 },
  ];

  const FAME_LEVEL_NAMES: Record<number, string> = {
    0: 'Unknown Guild',
    10: 'Local Guild',
    30: 'Regional Guild',
    60: 'Renowned Guild',
    100: 'Legendary Guild',
  };

  let level = FAME_LEVELS_INTERNAL[0];
  for (const tier of FAME_LEVELS_INTERNAL) {
    if (fame >= tier.min) level = tier;
  }
  const levelIndex = FAME_LEVELS_INTERNAL.indexOf(level);
  const nextTier = FAME_LEVELS_INTERNAL[levelIndex + 1];
  const progress = nextTier
    ? Math.min(1, Math.max(0, (fame - level.min) / (nextTier.min - level.min)))
    : 1;

  return {
    name: FAME_LEVEL_NAMES[level.min] || 'Unknown',
    currentFame: fame,
    progress,
    nextLevel: nextTier ? (FAME_LEVEL_NAMES[nextTier.min] || null) : null,
    bonus: level.bonus,
  };
}

/**
 * Compute fame mechanic tooltip HTML content.
 * Pure function — takes state, returns HTML string.
 */
export function computeFameMechanicTooltipContent(state: GameState): string {
  const fameResult = computeFameLevelResult(state.fame || 0);
  const fameMultiplier = state.fameMultiplier || 1;

  let html = '';

  html += `<div class="tooltip-title" style="color: ${FAME_TOOLTIP_ACCENT}; border-bottom-color: ${FAME_TOOLTIP_ACCENT_RGBA};">Fame Multiplier</div>`;
  html += `<div class="tooltip-body">`;

  // Description
  html += `<div class="tooltip-section"><div class="tooltip-label">What is this?</div>`;
  html += `<div class="tooltip-row">Your guild reputation bonus. Increases recruitment quality and unlocks better quests.</div>`;
  html += `</div>`;

  // Current fame level
  html += `<div class="tooltip-section"><div class="tooltip-label">Current Fame</div>`;
  html += `<div class="tooltip-row"><span class="tooltip-stat-label">Level:</span> <span class="tooltip-stat-value" style="color: ${FAME_TOOLTIP_ACCENT};">${escapeHtml(fameResult.name)}</span></div>`;
  html += `<div class="tooltip-row"><span class="tooltip-stat-label">Fame:</span> <span class="tooltip-stat-value">${fameResult.currentFame}</span></div>`;
  html += `<div class="tooltip-row"><span class="tooltip-stat-label">Multiplier:</span> <span class="tooltip-stat-value">×${fameMultiplier.toFixed(2)}</span></div>`;
  html += `</div>`;

  // Progress to next level
  if (fameResult.nextLevel && fameResult.progress < 1) {
    const progressPct = Math.round(fameResult.progress * 100);
    html += `<div class="tooltip-section"><div class="tooltip-label">Next Level</div>`;
    html += `<div class="tooltip-row"><span class="tooltip-stat-label">Progress:</span> <span class="tooltip-stat-value">${progressPct}%</span></div>`;
    html += `<div class="tooltip-row"><span class="tooltip-stat-label">Next:</span> <span class="tooltip-stat-value" style="color: ${FAME_TOOLTIP_ACCENT};">${escapeHtml(fameResult.nextLevel)}</span></div>`;
    html += `</div>`;
  }

  html += `</div>`; // .tooltip-body
  return html;
}

/**
 * Show the fame mechanic tooltip at the given mouse position.
 */
export function showFameMechanicTooltip(state: GameState, x: number, y: number): void {
  const container = ensureTooltipContainer();
  container.innerHTML = computeFameMechanicTooltipContent(state);

  container.style.left = '0px';
  container.style.top = '0px';
  container.classList.add('tooltip-visible', 'mechanic-tooltip', 'fame-tooltip');

  positionTooltip(x, y);
}

// ─── Wage/Morale Mechanic Tooltip ──────────────────────

/**
 * Compute wage/morale mechanic tooltip HTML content.
 * Pure function — takes state, returns HTML string.
 */
export function computeWageMechanicTooltipContent(state: GameState): string {
  const tickCount = state.questTickCount || 0;
  const baseDecayPer10Ticks = 1;
  const decayRate = baseDecayPer10Ticks;
  const officeLevel = state.officeLevel || 1;

  let html = '';

  html += `<div class="tooltip-title" style="color: ${WAGE_TOOLTIP_ACCENT}; border-bottom-color: ${WAGE_TOOLTIP_ACCENT_RGBA};">Wage Pressure</div>`;
  html += `<div class="tooltip-body">`;

  // Description
  html += `<div class="tooltip-section"><div class="tooltip-label">What is this?</div>`;
  html += `<div class="tooltip-row">Morale decay from underpaying adventurers. Upgrade your office to improve conditions.</div>`;
  html += `</div>`;

  // Current decay rate
  html += `<div class="tooltip-section"><div class="tooltip-label">Morale Decay</div>`;
  html += `<div class="tooltip-row"><span class="tooltip-stat-label">Rate:</span> <span class="tooltip-stat-value" style="color: ${WAGE_TOOLTIP_ACCENT};">-${decayRate} per 10 ticks</span></div>`;

  // Low morale adventurers count
  const lowMoraleCount = (state.adventurers || []).filter(a => a.morale < 30).length;
  if (lowMoraleCount > 0) {
    html += `<div class="tooltip-row"><span class="tooltip-stat-label">At risk:</span> <span class="tooltip-stat-value" style="color: ${WAGE_TOOLTIP_ACCENT};">${lowMoraleCount} adventurer${lowMoraleCount > 1 ? 's' : ''}</span></div>`;
  }

  html += `</div>`;

  // Office upgrade recommendation
  html += `<div class="tooltip-section"><div class="tooltip-label">Recommendation</div>`;
  html += `<div class="tooltip-row"><span class="tooltip-stat-label">Office:</span> <span class="tooltip-stat-value">Level ${officeLevel}</span></div>`;
  if (officeLevel < 5) {
    html += `<div class="tooltip-row"><span class="tooltip-stat-label">Tip:</span> <span class="tooltip-stat-value">Upgrade office to improve working conditions</span></div>`;
  } else {
    html += `<div class="tooltip-row"><span class="tooltip-stat-label">Status:</span> <span class="tooltip-stat-value" style="color: #4CAF50;">Maximum conditions</span></div>`;
  }
  html += `</div>`;

  html += `</div>`; // .tooltip-body
  return html;
}

/**
 * Show the wage mechanic tooltip at the given mouse position.
 */
export function showWageMechanicTooltip(state: GameState, x: number, y: number): void {
  const container = ensureTooltipContainer();
  container.innerHTML = computeWageMechanicTooltipContent(state);

  container.style.left = '0px';
  container.style.top = '0px';
  container.classList.add('tooltip-visible', 'mechanic-tooltip', 'wage-tooltip');

  positionTooltip(x, y);
}

// ─── Evolution Mechanic Tooltip ────────────────────────

/**
 * Compute evolution mechanic tooltip HTML content.
 * Pure function — takes state, returns HTML string.
 */
export function computeEvolutionMechanicTooltipContent(state: GameState, evolutionTable: Array<{ requires: { weapon?: string; armor?: string; accessory?: string }; result: string; description: string }>): string {
  const adventurers = state.adventurers || [];

  // Find discovered evolution classes (unique evolvedClass values)
  const discoveredClasses = new Set<string>();
  for (const a of adventurers) {
    if (a.evolved && a.evolvedClass) {
      discoveredClasses.add(a.evolvedClass);
    }
  }
  const discoveredCount = discoveredClasses.size;
  const totalCount = evolutionTable.length;

  let html = '';

  html += `<div class="tooltip-title" style="color: ${EVOLUTION_TOOLTIP_ACCENT}; border-bottom-color: ${EVOLUTION_TOOLTIP_ACCENT_RGBA};">Class Evolution</div>`;
  html += `<div class="tooltip-body">`;

  // Description
  html += `<div class="tooltip-section"><div class="tooltip-label">What is this?</div>`;
  html += `<div class="tooltip-row">Class evolution triggered by equipping specific weapon + armor/accessory combinations. Each adventurer can evolve once.</div>`;
  html += `</div>`;

  // Progress
  html += `<div class="tooltip-section"><div class="tooltip-label">Discovery Progress</div>`;
  html += `<div class="tooltip-row"><span class="tooltip-stat-label">Found:</span> <span class="tooltip-stat-value" style="color: ${EVOLUTION_TOOLTIP_ACCENT};">${discoveredCount}/${totalCount}</span></div>`;
  html += `</div>`;

  // Discovered evolutions
  if (discoveredCount > 0) {
    html += `<div class="tooltip-section"><div class="tooltip-label">Discovered</div>`;
    for (const evolvedClass of [...discoveredClasses].sort()) {
      html += `<div class="tooltip-row"><span class="tooltip-stat-value" style="color: #4CAF50;">✓ ${escapeHtml(evolvedClass)}</span></div>`;
    }
    html += `</div>`;
  }

  // Undiscovered evolutions
  const undiscovered = evolutionTable.filter(e => !discoveredClasses.has(e.result));
  if (undiscovered.length > 0 && undiscovered.length < totalCount) {
    html += `<div class="tooltip-section"><div class="tooltip-label">Not Yet Discovered</div>`;
    const showCount = Math.min(undiscovered.length, 5);
    for (let i = 0; i < showCount; i++) {
      const evo = undiscovered[i];
      const reqParts: string[] = [];
      if (evo.requires.weapon) reqParts.push(`Weapon: ${evo.requires.weapon}`);
      if (evo.requires.armor) reqParts.push(`Armor: ${evo.requires.armor}`);
      if (evo.requires.accessory) reqParts.push(`Accessory: ${evo.requires.accessory}`);
      html += `<div class="tooltip-row"><span class="tooltip-stat-label">${escapeHtml(evo.result)}:</span> <span class="tooltip-stat-value">${reqParts.join(' + ')}</span></div>`;
    }
    if (undiscovered.length > 5) {
      html += `<div class="tooltip-row"><span class="tooltip-stat-label">...</span> <span class="tooltip-stat-value">${undiscovered.length - 5} more</span></div>`;
    }
    html += `</div>`;
  }

  html += `</div>`; // .tooltip-body
  return html;
}

/**
 * Show the evolution mechanic tooltip at the given mouse position.
 */
export function showEvolutionMechanicTooltip(state: GameState, evolutionTable: Array<{ requires: { weapon?: string; armor?: string; accessory?: string }; result: string; description: string }>, x: number, y: number): void {
  const container = ensureTooltipContainer();
  container.innerHTML = computeEvolutionMechanicTooltipContent(state, evolutionTable);

  container.style.left = '0px';
  container.style.top = '0px';
  container.classList.add('tooltip-visible', 'mechanic-tooltip', 'evolution-tooltip');

  positionTooltip(x, y);
}

// ─── Quest Tooltip Public API ──────────────────────────

/**
 * Show the tooltip for a quest at the given mouse position.
 * @param quest — The quest to display information for
 * @param state — The full game state for roster match computation
 * @param x — Mouse X position (viewport coords)
 * @param y — Mouse Y position (viewport coords)
 */
export function showQuestTooltip(quest: Quest, state: GameState, x: number, y: number): void {
  const container = ensureTooltipContainer();
  container.innerHTML = computeQuestTooltipContent(quest, state);

  container.style.left = '0px';
  container.style.top = '0px';
  container.classList.add('tooltip-visible', 'quest-tooltip');

  positionTooltip(x, y);
}

/**
 * Reposition the tooltip near the cursor, clamped to viewport bounds.
 */
export function positionTooltip(x: number, y: number): void {
  if (!_tooltipEl) return;

  // Cancel any pending frame to avoid race conditions
  if (_positionDebounceId) {
    cancelAnimationFrame(_positionDebounceId);
  }

  _positionDebounceId = requestAnimationFrame(() => {
    if (!_tooltipEl) return;

    const tooltipRect = _tooltipEl.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8;

    const TOOLTIP_OFFSET = 12;
    let left = x + TOOLTIP_OFFSET;
    let top = y + TOOLTIP_OFFSET;

    // If tooltip would overflow right edge, position to left of cursor
    if (left + tooltipRect.width > viewportWidth - padding) {
      left = x - tooltipRect.width - TOOLTIP_OFFSET;
    }

    // If tooltip would overflow bottom edge, position above cursor
    if (top + tooltipRect.height > viewportHeight - padding) {
      top = y - tooltipRect.height - TOOLTIP_OFFSET;
    }

    // Clamp to viewport bounds
    left = Math.max(padding, Math.min(left, viewportWidth - tooltipRect.width - padding));
    top = Math.max(padding, Math.min(top, viewportHeight - tooltipRect.height - padding));

    _tooltipEl.style.left = `${left}px`;
    _tooltipEl.style.top = `${top}px`;
  });
}

/**
 * Update tooltip content without repositioning.
 * Call this when the hovered adventurer's data changes but cursor hasn't moved.
 *
 * Note: In the current architecture, adventurer data doesn't change without a
 * full store dispatch, which triggers a complete re-render. The hover handlers
 * in card.ts capture the adventurer at render time, so re-renders create fresh
 * closures with up-to-date data. Stale tooltip content only occurs if an
 * adventurer object changes in-place without a store dispatch — which the
 * immutable state pattern prevents.
 */
export function updateTooltipContent(adventurer: Adventurer): void {
  if (!_tooltipEl) return;
  const tooltipEl = _tooltipEl;
  tooltipEl.innerHTML = renderTooltipContent(adventurer);
}

/**
 * Check if the tooltip is currently visible.
 */
export function isTooltipVisible(): boolean {
  return _tooltipEl !== null && _tooltipEl.classList.contains('tooltip-visible');
}
