// Adventurers Guild Simulator — Quest Module
// ===========================================
// Quest templates, generation, and fame-gating logic.

import type { Quest, QuestTemplate, Stats } from '../types.js';
import { generateId } from './adventurer.js';

// ─── Quest Constants ───────────────────────────────────

export const VALID_DIFFICULTIES = [1, 2, 3, 4, 5] as const;

// ─── Quest Templates ───────────────────────────────────

export const QUEST_TEMPLATES: QuestTemplate[] = [
  // Easy quests (difficulty 1-2) — solo-capable (early game, fame 0-9)
  { name: 'Scout the nearby forest', difficulty: 1, requirements: { minStats: { str: 5, dex: 5, int: 5, vit: 5, lck: 5 }, preferredClasses: ['Sword', 'Bow'], minPartySize: 1, maxPartySize: 3 }, rewards: { gold: 15, experience: 25 }, description: 'Reconnaissance mission in the nearby forest.' },
  { name: 'Clear rat infestation', difficulty: 1, requirements: { minStats: { str: 4, dex: 4, int: 3, vit: 4, lck: 3 }, preferredClasses: ['Sword', 'Dagger'], minPartySize: 1, maxPartySize: 3 }, rewards: { gold: 10, experience: 20 }, description: 'The town needs rats cleared from the cellar.' },
  { name: 'Deliver messages to border village', difficulty: 2, requirements: { minStats: { str: 5, dex: 6, int: 4, vit: 5, lck: 5 }, preferredClasses: ['Bow', 'Wand'], minPartySize: 1, maxPartySize: 3 }, rewards: { gold: 20, experience: 30 }, description: 'Urgent message delivery to a distant village.' },
  { name: 'Investigate missing farmers', difficulty: 2, requirements: { minStats: { str: 6, dex: 5, int: 7, vit: 6, lck: 6 }, preferredClasses: ['Wand', 'Staff'], minPartySize: 1, maxPartySize: 3 }, rewards: { gold: 25, experience: 35 }, description: 'Three farmers have vanished near the old mill. Something unnatural is afoot.' },
  { name: 'Repair the bridge', difficulty: 2, requirements: { minStats: { str: 8, dex: 4, int: 4, vit: 7, lck: 4 }, preferredClasses: ['Shield', 'Axe'], minPartySize: 1, maxPartySize: 3 }, rewards: { gold: 30, experience: 35 }, description: 'A storm destroyed the only bridge to the eastern valley. Villagers need it fixed before harvest.' },
  { name: 'Negotiate the troll peace', difficulty: 2, requirements: { minStats: { str: 8, dex: 5, int: 10, vit: 9, lck: 7 }, preferredClasses: ['Shield', 'Wand'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 35, experience: 40 }, description: 'A troll blockades the mountain pass. Diplomacy is preferred over combat.' },
  // Medium quests (difficulty 3-4) — some solo-capable (mid game, fame 10-29)
  { name: 'Hunt bandits on the highway', difficulty: 3, requirements: { minStats: { str: 8, dex: 7, int: 5, vit: 7, lck: 6 }, preferredClasses: ['Sword', 'Axe'], minPartySize: 1, maxPartySize: 3 }, rewards: { gold: 40, experience: 50 }, description: 'Bandits have been plundering merchant caravans.' },
  { name: 'Explore the abandoned mine', difficulty: 3, requirements: { minStats: { str: 7, dex: 6, int: 8, vit: 6, lck: 7 }, preferredClasses: ['Staff', 'Shield'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 45, experience: 55 }, description: 'An old mine has been emitting strange noises.' },
  { name: 'Track the shadow wolf', difficulty: 3, requirements: { minStats: { str: 6, dex: 10, int: 6, vit: 8, lck: 8 }, preferredClasses: ['Bow', 'Dagger'], minPartySize: 1, maxPartySize: 3 }, rewards: { gold: 45, experience: 50 }, description: 'A massive wolf has been killing livestock. The locals call it shadow.' },
  { name: 'Clear the goblin camp', difficulty: 3, requirements: { minStats: { str: 9, dex: 7, int: 5, vit: 8, lck: 6 }, preferredClasses: ['Sword', 'Axe', 'Shield'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 50, experience: 55 }, description: 'A goblin camp has been raiding supply caravans on the northern road.' },
  { name: 'Escort merchant caravan', difficulty: 4, requirements: { minStats: { str: 9, dex: 8, int: 6, vit: 9, lck: 7 }, preferredClasses: ['Shield', 'Sword'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 55, experience: 60 }, description: 'Protect a valuable merchant caravan through dangerous territory.' },
  { name: 'Retrieve the ancient tome', difficulty: 4, requirements: { minStats: { str: 7, dex: 8, int: 12, vit: 7, lck: 9 }, preferredClasses: ['Wand', 'Staff', 'Dagger'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 60, experience: 70 }, description: 'An ancient library beneath the old keep holds a tome of forgotten magic.' },
  // Hard quests (difficulty 5) — some solo (late game, fame 30+)
  { name: 'Slay the dragon', difficulty: 5, requirements: { minStats: { str: 15, dex: 12, int: 10, vit: 14, lck: 12 }, preferredClasses: ['Sword', 'Axe', 'Mace'], minPartySize: 1, maxPartySize: 3 }, rewards: { gold: 100, experience: 120 }, description: 'A dragon has taken up residence in the mountain. Only the bravest dare attempt this.' },
  { name: 'Infiltrate the rival guild', difficulty: 5, requirements: { minStats: { str: 10, dex: 14, int: 12, vit: 10, lck: 13 }, preferredClasses: ['Dagger', 'Bow'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 90, experience: 110 }, description: 'The rival guild has been poaching your adventurers. Infiltrate and expose them.' },
  { name: 'Purge the haunted crypt', difficulty: 4, requirements: { minStats: { str: 10, dex: 8, int: 10, vit: 10, lck: 10 }, preferredClasses: ['Staff', 'Mace', 'Sword'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 70, experience: 80 }, description: 'Undead have risen in the family crypts of the old nobility. Send the bravest.' },
];

// ─── Quest Generation ──────────────────────────────────

export function defaultQuest(overrides: {
  name?: string;
  difficulty?: number;
  requirements?: Partial<QuestTemplate['requirements']>;
  minPartySize?: number;
  maxPartySize?: number;
  rewards?: Partial<QuestTemplate['rewards']>;
  description?: string;
} = {}): Quest {
  return {
    id: generateId(),
    name: overrides.name || 'Unnamed Quest',
    difficulty: overrides.difficulty ?? 1,
    requirements: {
      minStats: overrides.requirements?.minStats ?? { str: 5, dex: 5, int: 5, vit: 5, lck: 5 } as Stats,
      preferredClasses: overrides.requirements?.preferredClasses ?? [],
      minPartySize: overrides.minPartySize ?? (overrides.requirements?.minPartySize ?? 2),
      maxPartySize: overrides.maxPartySize ?? (overrides.requirements?.maxPartySize ?? 3),
    },
    rewards: {
      gold: overrides.rewards?.gold ?? 10,
      experience: overrides.rewards?.experience ?? 20,
    },
    description: overrides.description || 'A quest for adventurers.',
  };
}

export function perturbQuest(template: QuestTemplate): Quest {
  const goldMultiplier = 1 + (Math.random() * 0.2 - 0.1); // ±10%
  const xpMultiplier = 1 + (Math.random() * 0.2 - 0.1);   // ±10%
  const minStats: Stats = { str: 0, dex: 0, int: 0, vit: 0, lck: 0 };
  const reqs = template.requirements.minStats || {};
  for (const [stat, value] of Object.entries(reqs) as [keyof Stats, number][]) {
    minStats[stat] = Math.max(1, value + Math.floor(Math.random() * 5) - 2); // ±2
  }

  return {
    id: generateId(),
    name: template.name,
    difficulty: template.difficulty,
    requirements: {
      minStats,
      preferredClasses: template.requirements.preferredClasses || [],
      minPartySize: template.requirements.minPartySize || 2,
      maxPartySize: template.requirements.maxPartySize || 3,
    },
    rewards: {
      gold: Math.max(5, Math.round(template.rewards.gold * goldMultiplier)),
      experience: Math.max(5, Math.round(template.rewards.experience * xpMultiplier)),
    },
    description: template.description,
  };
}

export function generateQuestPool(count: number = 3): Quest[] {
  const selected: Quest[] = [];
  const available = [...QUEST_TEMPLATES];

  // Select 'count' quests, preferring to avoid repeats within a pool
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length);
    const template = available.splice(idx, 1)[0];
    selected.push(perturbQuest(template));
  }

  return selected;
}

// ─── Fame-Gated Quest Pool ─────────────────────────────

function getMaxPartySizeFromFame(fame: number): number {
  if (fame < 10) return 1;
  if (fame < 30) return 2;
  return 3; // effectively unlimited for our max
}

export function getFameGatedQuestPool(
  state: { fame?: number },
  count: number = 3
): Quest[] {
  const fame = state.fame ?? 0;
  const maxDifficulty = Math.min(5, 1 + Math.floor(fame / 25));
  const maxPartySize = getMaxPartySizeFromFame(fame);
  const available = QUEST_TEMPLATES.filter(q =>
    q.difficulty <= maxDifficulty && q.requirements?.minPartySize <= maxPartySize
  );
  // Perturb and select random quests
  const selected: Quest[] = [];
  const pool = available.map(perturbQuest);
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }
  return selected;
}
