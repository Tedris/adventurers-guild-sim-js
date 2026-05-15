// Adventurers Guild Simulator — Event Module
// ============================================
// Event templates, pool generation, selection, and resolution.

import type {
  EventTemplate,
  EventDelta,
  EventResolution,
} from '../types.js';

// ─── Constants ─────────────────────────────────────────

export const VALID_EVENT_CATEGORIES = ['Budget', 'Crisis', 'Drama'] as const;

export const EVENT_COOLDOWN_TICKS = 20; // Minimum ticks between same event

// ─── Event Templates ───────────────────────────────────

export const EVENT_TEMPLATES: EventTemplate[] = [
  // ── Budget Events (4) ───────────────────────────────

  {
    id: 'budget-bonus-demands',
    category: 'Budget',
    weight: 3,
    title: 'Quest Bonus Demands',
    description: 'Your adventurers are demanding higher gold rewards for dangerous quests. The economy has shifted since they joined.',
    choices: [
      { label: 'Accept (+5 gold to quest rewards)', effect: (state) => ({ gold: -5 }) },
      { label: 'Negotiate (+2 gold cost, no reward increase)', effect: (state) => ({ gold: -2 }) },
      { label: 'Refuse (morale -5)', effect: (state) => ({ moraleAdjustment: -5 }) },
    ],
  },
  {
    id: 'budget-price-surge',
    category: 'Budget',
    weight: 2,
    title: 'Price Surge',
    description: 'A shortage has driven up prices in town. Supplies cost more than usual.',
    choices: [
      { label: 'Pay the premium (-15 gold)', effect: (state) => ({ gold: -15 }) },
      { label: 'Scrounge alternatives (no cost, morale -3)', effect: (state) => ({ moraleAdjustment: -3 }) },
      { label: 'Skip supplies (morale -8, quest risk +10%)', effect: (state) => ({ moraleAdjustment: -8, questRisk: ((state.questRisk as number | undefined) ?? 0) + 10 }) },
    ],
  },
  {
    id: 'budget-rich-merchant',
    category: 'Budget',
    weight: 2,
    title: 'Rich Merchant',
    description: 'A wealthy merchant offers to sponsor a quest in exchange for future favor.',
    choices: [
      { label: 'Accept sponsorship (+40 gold)', effect: (state) => ({ gold: 40 }) },
      { label: 'Negotiate (+20 gold, favor debt)', effect: (state) => ({ gold: 20, favorDebt: ((state.favorDebt as number | undefined) ?? 0) + 1 }) },
      { label: 'Decline politely', effect: (state) => ({}) },
    ],
  },
  {
    id: 'budget-tax-collector',
    category: 'Budget',
    weight: 2,
    title: 'Tax Collector',
    description: 'The local lord demands his share of the guild\'s earnings.',
    choices: [
      { label: 'Pay taxes (-20 gold)', effect: (state) => ({ gold: -20 }) },
      { label: 'Bribe the collector (-10 gold)', effect: (state) => ({ gold: -10 }) },
      { label: 'Refuse (reputation -2)', effect: (state) => ({ reputation: ((state.reputation as number | undefined) ?? 0) - 2 }) },
    ],
  },

  // ── Crisis Events (4) ───────────────────────────────

  {
    id: 'crisis-monster-attack',
    category: 'Crisis',
    weight: 3,
    title: 'Monster Attack',
    description: 'A pack of wolves has been sighted near the guild office. Villagers are panicking.',
    choices: [
      { label: 'Send a party (-2 adventurers for 3 days)', effect: (state) => ({ temporaryUnavailability: ((state.temporaryUnavailability as number | undefined) ?? 3) }) },
      { label: 'Post guards (-5 gold, no adventurer loss)', effect: (state) => ({ gold: -5 }) },
      { label: 'Ignore it (morale -5, risk of guild damage)', effect: (state) => ({ moraleAdjustment: -5 }) },
    ],
  },
  {
    id: 'crisis-rival-poaching',
    category: 'Crisis',
    weight: 3,
    title: 'Rival Poaching',
    description: 'The rival Blackwood Guild has been poaching your adventurers with better quest rewards.',
    choices: [
      { label: 'Match their offer (-10 gold)', effect: (state) => ({ gold: -10, retentionBonus: 1 }) },
      { label: 'Counter with perks (morale +5, no gold cost)', effect: (state) => ({ moraleAdjustment: 5 }) },
      { label: 'Let them leave (morale -3, lose 1 adventurer)', effect: (state) => ({ moraleAdjustment: -3, departureCount: 1 }) },
    ],
  },
  {
    id: 'crisis-town-request',
    category: 'Crisis',
    weight: 2,
    title: 'Town Emergency',
    description: 'The mayor requests emergency aid — a bandit camp threatens the supply roads.',
    choices: [
      { label: 'Accept (+30 gold reward, +5 fame)', effect: (state) => ({ gold: 30, fameDelta: 5 }) },
      { label: 'Send half-strength (+15 gold, +2 fame)', effect: (state) => ({ gold: 15, fameDelta: 2 }) },
      { label: 'Decline (reputation -2)', effect: (state) => ({ reputation: ((state.reputation as number | undefined) ?? 0) - 2 }) },
    ],
  },
  {
    id: 'crisis-plague',
    category: 'Crisis',
    weight: 1,
    title: 'Plague Outbreak',
    description: 'A mysterious illness has spread through the guild quarters.',
    choices: [
      { label: 'Quarantine (-15 gold for supplies)', effect: (state) => ({ gold: -15 }) },
      { label: 'Treat with herbs (-5 gold, risk of adventurer loss)', effect: (state) => ({ gold: -5 }) },
      { label: 'Ignore it (morale -8, 1-2 adventurer loss)', effect: (state) => ({ moraleAdjustment: -8 }) },
    ],
  },

  // ── Drama Events (4) ────────────────────────────────

  {
    id: 'drama-relationship',
    category: 'Drama',
    weight: 3,
    title: 'Relationship Drama',
    description: 'Two adventurers have been arguing fiercely. The tension is affecting the whole guild.',
    choices: [
      { label: 'Mediate (+3 gold for party, morale +2)', effect: (state) => ({ gold: 3, moraleAdjustment: 2 }) },
      { label: 'Separate them (no cost, no gain)', effect: (state) => ({}) },
      { label: 'Let them sort it out (morale -2)', effect: (state) => ({ moraleAdjustment: -2 }) },
    ],
  },
  {
    id: 'drama-festival',
    category: 'Drama',
    weight: 2,
    title: 'Festival Season',
    description: 'A local festival offers a chance for adventurers to relax and bond.',
    choices: [
      { label: 'Celebrate freely (-10 gold, morale +8)', effect: (state) => ({ gold: -10, moraleAdjustment: 8 }) },
      { label: 'Modest gathering (-3 gold, morale +4)', effect: (state) => ({ gold: -3, moraleAdjustment: 4 }) },
      { label: 'Pass on it (no cost, no gain)', effect: (state) => ({}) },
    ],
  },
  {
    id: 'drama-retirement',
    category: 'Drama',
    weight: 2,
    title: 'Retirement Notice',
    description: 'A veteran adventurer approaches you with a retirement request.',
    choices: [
      { label: 'Grant early retirement (lose 1 adventurer, gain legacy)', effect: (state) => ({ retirementTriggered: true }) },
      { label: 'Offer contract extension (-5 gold, retain adventurer)', effect: (state) => ({ gold: -5, moraleAdjustment: 3 }) },
      { label: 'Refuse (morale -5, may lose adventurer anyway)', effect: (state) => ({ moraleAdjustment: -5 }) },
    ],
  },
  {
    id: 'drama-rumor',
    category: 'Drama',
    weight: 2,
    title: 'Harmful Rumors',
    description: 'A rumor about your guild has spread through town. Some say you abandon clients.',
    choices: [
      { label: 'Address it publicly (+5 gold, morale +3)', effect: (state) => ({ gold: 5, moraleAdjustment: 3 }) },
      { label: 'Ignore it (no cost, no gain)', effect: (state) => ({}) },
      { label: 'Find the source (-3 gold for investigation)', effect: (state) => ({ gold: -3, reputation: ((state.reputation as number | undefined) ?? 0) + 1 }) },
    ],
  },
];

// ─── Event Pool & Selection ────────────────────────────

export function generateEventPool(): EventTemplate[] {
  const pool: EventTemplate[] = [];
  for (const template of EVENT_TEMPLATES) {
    for (let i = 0; i < template.weight; i++) {
      pool.push(template);
    }
  }
  return pool;
}

export function selectNextEvent(state: {
  day?: number;
  eventCooldowns?: Record<string, number>;
}): EventTemplate | null {
  const pool = generateEventPool();
  const cooldowns = state.eventCooldowns || {};
  const currentTick = state.day ?? 0;

  // Filter out events in cooldown
  const available = pool.filter(template => {
    const cooldownEnd = cooldowns[template.id] || 0;
    return currentTick >= cooldownEnd;
  });

  if (available.length === 0) return null;

  // Weighted random selection
  const totalWeight = available.reduce((sum, t) => sum + t.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const template of available) {
    roll -= template.weight;
    if (roll <= 0) return template;
  }

  return available[available.length - 1];
}

// ─── Event Resolution ──────────────────────────────────

export function resolveEvent(
  state: { day?: number; [key: string]: unknown },
  eventId: string,
  choiceIndex: number
): EventResolution {
  const template = EVENT_TEMPLATES.find(t => t.id === eventId);
  if (!template) {
    return { delta: {}, eventId, resolvedAt: state.day ?? 0, moraleAdjustment: 0 };
  }

  const choice = template.choices[choiceIndex];
  if (!choice) {
    return { delta: {}, eventId, resolvedAt: state.day ?? 0, moraleAdjustment: 0 };
  }

  // Apply the effect function
  const delta = choice.effect(state);

  // Handle special effects that modify adventurer arrays
  let moraleAdjustment = (delta.moraleAdjustment as number | undefined) ?? 0;

  if (delta.retirementTriggered) {
    // Will be handled by store reducer — just signal it
  }

  return {
    delta,
    eventId,
    resolvedAt: state.day ?? 0,
    moraleAdjustment,
  };
}
