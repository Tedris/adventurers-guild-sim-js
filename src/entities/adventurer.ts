// Adventurers Guild Simulator — Adventurer Module
// =================================================
// Adventurer entity definitions, generation, validation, and evolution.

import type {
  Adventurer,
  Equipment,
  EquipmentItem,
  Personality,
  PersonalityTraitDef,
  LegacyPerk,
  LegacyPerkTemplate,
  Stats,
  ClassEvolution,
  EvolutionResult,
  EvolutionStatus,
  ValidationResult,
  Quest,
} from '../types.js';

import { defaultParty } from './party.js';
import { getFameGatedQuestPool } from './quest.js';

// ─── Constants ─────────────────────────────────────────

export const VALID_CLASSES = [
  'Sword', 'Wand', 'Bow', 'Shield', 'Staff', 'Dagger', 'Axe', 'Mace',
] as const;

export const VALID_ORIGINS = [
  'Town-born', 'Migrant', 'Wanderer', 'Exile', 'Apprentice',
] as const;

export const RARITY_TIERS = ['Common', 'Uncommon', 'Rare', 'Epic'] as const;

export const VALID_RANKS = ['Novice', 'Journeyman', 'Veteran', 'Champion', 'Legend'] as const;

// ─── Evolution Equipment Constants ──────────────────────

export const EVOLUTION_EQUIPMENT = {
  ARCANE_CRYSTAL: 'Arcane Crystal',
  SHARPSHOOTER_MONOCULAR: "Sharpshooter's Monocular",
  SCHOLAR_MANUSCRIPT: "Scholar's Manuscript",
  PLATE_ARMOR: 'Plate Armor',
  SHIELD: 'Shield',
} as const;

export const MIN_STAT = 1;
export const MAX_STAT = 20;
export const DEFAULT_MORALE = 70;

export const VALID_PERSONALITY_TRAITS = [
  // Courageous types (+morale, +combat quests)
  'Brave', 'Fierce', 'Unyielding', 'Stalwart', 'Dauntless',
  // Cautious types (+defense quests, +morale stability)
  'Cautious', 'Prudent', 'Methodical', 'Watchful', 'Meticulous',
  // Social types (+team morale, +drama events)
  'Charismatic', 'Witty', 'Loyal', 'Ambitious', 'Mentor',
  // Scholarly types (+investigation, +herb_gathering)
  'Scholarly', 'Curious', 'Analytical', 'Patient', 'Detail-oriented',
  // Roguish types (+stealth, +ranged_combat)
  'Cunning', 'Resourceful', 'Stealthy', 'Lucky', 'Adaptable',
  // Mystical types (new v1.2)
  'Arcane Prodigy', 'Dreamwalker', 'Spirit-Talker', 'Starborn', 'Void-Watcher',
  // Disciplined types (new v1.2)
  'Iron-Willed', 'Ascetic', 'Devout', 'Stoic', 'Zealous',
] as const;

export const PERSONALITY_TRAIT_TABLE: Record<string, PersonalityTraitDef> = {
  // Courageous: +morale, +combat/tracking aptitude
  Brave:       { morale: 5,  quest_success: 2, description: '+5 morale on hire, +2% combat quest success' },
  Fierce:      { morale: 3,  quest_success: 3, description: '+3 morale on hire, +3% combat quest success' },
  Unyielding:  { morale: 8,  quest_success: 1, description: '+8 morale on hire, +1% all quest success' },
  Stalwart:    { morale: 6,  quest_success: 2, description: '+6 morale on hire, +2% defense quest success' },
  Dauntless:   { morale: 4,  quest_success: 4, description: '+4 morale on hire, +4% high-difficulty quest success' },
  // Cautious: stable morale, +defense
  Cautious:    { morale: 2,  quest_success: 1, description: '+2 morale on hire, +1% defense quest success' },
  Prudent:     { morale: 3,  quest_success: 1, description: '+3 morale on hire, +1% protection quest success' },
  Methodical:  { morale: 4,  quest_success: 2, description: '+4 morale on hire, +2% investigation quest success' },
  Watchful:    { morale: 3,  quest_success: 1, description: '+3 morale on hire, +1% tracking quest success' },
  Meticulous:  { morale: 5,  quest_success: 1, description: '+5 morale on hire, +1% herb_gathering quest success' },
  // Social: morale effects on party
  Charismatic: { morale: 3,  quest_success: 1, description: '+3 morale on hire, +1% all quest success' },
  Witty:       { morale: 5,  quest_success: 0, description: '+5 morale on hire, no quest modifier' },
  Loyal:       { morale: 7,  quest_success: 1, description: '+7 morale on hire, +1% shield-type quest success' },
  Ambitious:   { morale: -3, quest_success: 3, description: '-3 morale on hire, +3% high-value quest success' },
  Mentor:      { morale: 4,  quest_success: 1, description: '+4 morale on hire, +1% aptitude-based quests' },
  // Scholarly: +investigation, +herb_gathering
  Scholarly:   { morale: 1,  quest_success: 2, description: '+1 morale on hire, +2% investigation quest success' },
  Curious:     { morale: 2,  quest_success: 2, description: '+2 morale on hire, +2% herb_gathering quest success' },
  Analytical:  { morale: 1,  quest_success: 2, description: '+1 morale on hire, +2% investigation quest success' },
  Patient:     { morale: 3,  quest_success: 1, description: '+3 morale on hire, +1% long-duration quest success' },
  'Detail-oriented': { morale: 2, quest_success: 2, description: '+2 morale on hire, +2% investigation quest success' },
  // Roguish: +stealth, +ranged_combat
  Cunning:     { morale: 0,  quest_success: 3, description: 'No morale change, +3% stealth quest success' },
  Resourceful: { morale: 2,  quest_success: 2, description: '+2 morale on hire, +2% any quest success' },
  Stealthy:    { morale: -1, quest_success: 3, description: '-1 morale on hire, +3% stealth quest success' },
  Lucky:       { morale: 3,  quest_success: 2, description: '+3 morale on hire, +2% luck-dependent quest success' },
  Adaptable:   { morale: 2,  quest_success: 2, description: '+2 morale on hire, +2% any quest success' },
  // Mystical types (new v1.2)
  'Arcane Prodigy': { morale: 2,  quest_success: 3, aptitude_bonus: { investigation: 0.03 }, description: '+2 morale on hire, +3% investigation success' },
  'Dreamwalker':    { morale: 5,  quest_success: 1, aptitude_bonus: { all: 0.01 }, description: '+5 morale on hire, +1% all quest success' },
  'Spirit-Talker':  { morale: 3,  quest_success: 2, aptitude_bonus: { herb_gathering: 0.02 }, description: '+3 morale on hire, +2% herb_gathering success' },
  'Starborn':       { morale: 4,  quest_success: 2, aptitude_bonus: { all: 0.02 }, description: '+4 morale on hire, +2% all quest success' },
  'Void-Watcher':   { morale: -2, quest_success: 4, aptitude_bonus: { stealth: 0.04 }, description: '-2 morale on hire, +4% stealth success' },
  // Disciplined types (new v1.2)
  'Iron-Willed':  { morale: 6,  quest_success: 1, aptitude_bonus: { defense: 0.01 }, description: '+6 morale on hire, +1% defense success' },
  'Ascetic':      { morale: 4,  quest_success: 2, aptitude_bonus: { protection: 0.02 }, description: '+4 morale on hire, +2% protection success' },
  'Devout':       { morale: 5,  quest_success: 2, aptitude_bonus: { protection: 0.02 }, description: '+5 morale on hire, +2% protection success' },
  'Stoic':        { morale: 3,  quest_success: 1, aptitude_bonus: { defense: 0.01 }, description: '+3 morale on hire, +1% defense success' },
  'Zealous':      { morale: -5, quest_success: 5, aptitude_bonus: { combat: 0.05 }, description: '-5 morale on hire, +5% combat success' },
};

// ─── Name Generation ───────────────────────────────────

const NAME_SYLLABLES = {
  start: ['Ae', 'Bal', 'Cael', 'Dar', 'El', 'Fen', 'Grim', 'Hal', 'Ith', 'Jor', 'Kal', 'Lyr', 'Mor', 'Nex', 'Or', 'Pel', 'Quin', 'Ran', 'Sel', 'Thor', 'Ul', 'Val', 'War', 'Xan', 'Yar', 'Zep'],
  end: ['an', 'ar', 'as', 'din', 'dor', 'el', 'en', 'er', 'gar', 'gin', 'ias', 'in', 'ion', 'ius', 'kar', 'lan', 'lin', 'mar', 'mus', 'nar', 'or', 'rin', 'ros', 'sar', 'thas', 'tin', 'tor', 'us', 'win'],
};

export function generateName(overrides?: { name?: string; gender?: string }): string {
  if (overrides?.name) return overrides.name;
  const start = NAME_SYLLABLES.start[Math.floor(Math.random() * NAME_SYLLABLES.start.length)];
  const end = NAME_SYLLABLES.end[Math.floor(Math.random() * NAME_SYLLABLES.end.length)];
  return start + end;
}

// ─── Core Functions ────────────────────────────────────

function rollStat(): number {
  return 3 + Math.floor(Math.random() * 3)
           + Math.floor(Math.random() * 3)
           + Math.floor(Math.random() * 3);
}

export const CLASS_APTITUDES: Record<string, Record<string, number>> = {
  Sword:  { tracking: 0.8, combat: 0.9 },
  Wand:   { herb_gathering: 0.9, investigation: 0.7 },
  Bow:    { tracking: 0.9, ranged_combat: 0.8 },
  Staff:  { herb_gathering: 0.8, investigation: 0.8 },
  Shield: { defense: 0.9, protection: 0.7 },
  Dagger: { stealth: 0.9, assassination: 0.8 },
  Axe:    { tracking: 0.7, combat: 0.8 },
  Mace:   { combat: 0.8, defense: 0.7 },
};

export function calculateAptitudes(adventurer: Adventurer): Record<string, number> {
  const baseAptitudes = CLASS_APTITUDES[adventurer.class] || {};

  // Apply personality trait aptitude modifiers from data
  const personality = adventurer.personality || {};
  const traits = personality.traits || [];
  const traitAptitudes: Record<string, number> = { ...baseAptitudes };

  for (const traitName of traits) {
    const trait = PERSONALITY_TRAIT_TABLE[traitName];
    if (trait && trait.aptitude_bonus) {
      for (const [aptitude, bonus] of Object.entries(trait.aptitude_bonus)) {
        if (aptitude === 'all') {
          // Apply to all aptitudes in baseAptitudes
          for (const baseAptitude of Object.keys(baseAptitudes)) {
            traitAptitudes[baseAptitude] = (traitAptitudes[baseAptitude] || 0) + bonus;
          }
        } else {
          traitAptitudes[aptitude] = (traitAptitudes[aptitude] || 0) + bonus;
        }
      }
    }
  }

  return traitAptitudes;
}

// Fame levels for recruitment bonuses
export const FAME_LEVELS = [
  { min: 0,   name: 'Unknown Guild',   bonus: 0,     description: 'A little-known operation.' },
  { min: 10,  name: 'Local Guild',     bonus: 0.05,  description: 'Known in the local area.' },
  { min: 30,  name: 'Regional Guild',  bonus: 0.10,  description: 'Recognized across the region.' },
  { min: 60,  name: 'Renowned Guild',  bonus: 0.15,  description: 'Famous adventurers seek you out.' },
  { min: 100, name: 'Legendary Guild', bonus: 0.20,  description: 'Your name echoes through the realm.' },
];

const FAME_LEVELS_INTERNAL = [
  { min: 0,   bonus: 0 },
  { min: 10,  bonus: 0.05 },
  { min: 30,  bonus: 0.10 },
  { min: 60,  bonus: 0.15 },
  { min: 100, bonus: 0.20 },
];

const FAME_LEVEL_NAMES: Record<number, string> = {
  0: 'Unknown Guild',
  10: 'Local Guild',
  30: 'Regional Guild',
  60: 'Renowned Guild',
  100: 'Legendary Guild',
};

export function getFameLevel(fame: number): { name: string; bonus: number; currentFame: number; progress: number; nextLevel: string | null } {
  let level = FAME_LEVELS_INTERNAL[0];
  for (const tier of FAME_LEVELS_INTERNAL) {
    if (fame >= tier.min) level = tier;
  }
  const levelIndex = FAME_LEVELS_INTERNAL.indexOf(level);
  const nextTier = FAME_LEVELS_INTERNAL[levelIndex + 1];
  const progress = nextTier
    ? (fame - level.min) / (nextTier.min - level.min)
    : 1;
  return {
    name: FAME_LEVEL_NAMES[level.min] || 'Unknown',
    bonus: level.bonus,
    currentFame: fame,
    progress: Math.min(1, Math.max(0, progress)),
    nextLevel: nextTier ? FAME_LEVEL_NAMES[nextTier.min] || null : null,
  };
}

export function generateRecruitmentPool(count: number = 1, state?: { fame?: number; legacyPerks?: LegacyPerk[] }): Adventurer[] {
  const pool: Adventurer[] = [];
  const fame = state?.fame ?? 0;
  const fameLevel = getFameLevel(fame);
  const fameStatBonus = Math.floor(fameLevel.bonus * 6);

  for (let i = 0; i < count; i++) {
    const adventurer = defaultAdventurer();
    adventurer.rank = 'Novice';
    for (const stat of Object.keys(adventurer.stats) as (keyof Stats)[]) {
      adventurer.stats[stat] = Math.min(MAX_STAT, adventurer.stats[stat] + fameStatBonus);
    }
    if (state?.legacyPerks && state.legacyPerks.length > 0) {
      const withPerks = applyLegacyPerks(adventurer, state.legacyPerks);
      Object.assign(adventurer.stats, withPerks.stats);
    }
    adventurer.aptitudes = calculateAptitudes(adventurer);
    pool.push(adventurer);
  }
  return pool;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function defaultAdventurer(overrides: {
  name?: string;
  class?: string;
  stats?: Partial<Stats>;
  equipment?: Partial<Equipment>;
  morale?: number;
  origin?: string;
  personality?: Personality;
  level?: number;
  experience?: number;
  rank?: string;
  aptitudes?: Record<string, number>;
  evolved?: boolean;
  evolutionDate?: string | null;
  evolvedClass?: string | null;
  legacyPerks?: LegacyPerk[];
} = {}): Adventurer {
  const validClass = VALID_CLASSES[Math.floor(Math.random() * VALID_CLASSES.length)];
  const validOrigin = VALID_ORIGINS[Math.floor(Math.random() * VALID_ORIGINS.length)];
  const resolvedClass = (overrides.class ?? validClass) as typeof validClass;
  const resolvedOrigin = (overrides.origin ?? validOrigin) as typeof validOrigin;

  let adventurer: Adventurer = {
    id: generateId(),
    name: overrides.name || generateName(overrides),
    class: resolvedClass,
    stats: {
      str: overrides.stats?.str ?? rollStat(),
      dex: overrides.stats?.dex ?? rollStat(),
      int: overrides.stats?.int ?? rollStat(),
      vit: overrides.stats?.vit ?? rollStat(),
      lck: overrides.stats?.lck ?? rollStat(),
    },
    equipment: {
      weapon: overrides.equipment?.weapon ?? null,
      armor: overrides.equipment?.armor ?? null,
      accessory: overrides.equipment?.accessory ?? null,
    },
    morale: Math.max(0, Math.min(100, overrides.morale ?? DEFAULT_MORALE)),
    origin: resolvedOrigin,
    personality: overrides.personality || generatePersonality(),
    level: overrides.level ?? 1,
    experience: overrides.experience ?? 0,
    rank: overrides.rank ?? 'Novice',
    aptitudes: overrides.aptitudes ?? {},
    evolved: overrides.evolved ?? false,
    evolutionDate: overrides.evolutionDate ?? null,
    evolvedClass: overrides.evolvedClass ?? null,
  };

  // Apply legacy perks if provided
  if (overrides.legacyPerks && Array.isArray(overrides.legacyPerks) && overrides.legacyPerks.length > 0) {
    adventurer = applyLegacyPerks(adventurer, overrides.legacyPerks);
  }

  return adventurer;
}

// Backward-compatible schema reference (deprecated — use validateAdventurer directly)
export const adventurerSchema = { validate: validateAdventurer };

export function validateAdventurer(data: Partial<Adventurer>): ValidationResult {
  const required = [
    'id', 'name', 'class', 'stats', 'equipment',
    'morale', 'origin', 'personality', 'level', 'experience',
  ] as const;

  for (const field of required) {
    if (!(field in data)) return { valid: false, reason: `Missing field: ${field}` };
  }

  if (!(data as Adventurer).class || !VALID_CLASSES.includes((data as Adventurer).class as typeof VALID_CLASSES[number])) {
    return { valid: false, reason: `Invalid class: ${(data as Adventurer).class}` };
  }
  if (!(data as Adventurer).origin || !VALID_ORIGINS.includes((data as Adventurer).origin as typeof VALID_ORIGINS[number])) {
    return { valid: false, reason: `Invalid origin: ${(data as Adventurer).origin}` };
  }

  const stats = (data as Adventurer).stats;
  for (const [stat, value] of Object.entries(stats) as [keyof Stats, number][]) {
    if (value < MIN_STAT || value > MAX_STAT) {
      return { valid: false, reason: `Stat ${stat} out of range: ${value}` };
    }
  }

  if ((data as Adventurer).morale < 0 || (data as Adventurer).morale > 100) {
    return { valid: false, reason: `Morale out of range: ${(data as Adventurer).morale}` };
  }

  return { valid: true };
}

// ─── Personality Generation ────────────────────────────

export function generatePersonality(count: number = 2): Personality {
  const numTraits = count === 1 ? 1 : 1 + Math.floor(Math.random() * Math.min(count, 3));
  const traits: string[] = [];
  const pool = [...VALID_PERSONALITY_TRAITS];

  for (let i = 0; i < numTraits && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    traits.push(pool.splice(idx, 1)[0]); // no duplicates
  }

  return { traits };
}

// ─── Legacy Perk System ────────────────────────────────

export const LEGACY_PERKS: LegacyPerkTemplate[] = [
  {
    id: 'iron-will',
    name: 'Iron Will',
    description: 'A veteran\'s unyielding spirit strengthens new recruits.',
    effects: { vit: 5 },
    allowedClasses: ['Shield', 'Axe', 'Sword', 'Mace'],
    minRank: 'Veteran',
  },
  {
    id: 'sharp-eye',
    name: 'Sharp Eye',
    description: 'Years of scouting sharpen perception for the next generation.',
    effects: { dex: 5 },
    allowedClasses: ['Bow', 'Dagger'],
    minRank: 'Journeyman',
  },
  {
    id: 'battle-scars',
    name: 'Battle Scars',
    description: 'Hard-won combat experience hardens new adventurers.',
    effects: { str: 3, vit: 2 },
    allowedClasses: ['Sword', 'Axe'],
    minRank: 'Journeyman',
  },
  {
    id: 'arcane-legacy',
    name: 'Arcane Legacy',
    description: 'Ancient magical knowledge passes to worthy successors.',
    effects: { int: 5 },
    allowedClasses: ['Wand', 'Staff'],
    minRank: 'Veteran',
  },
  {
    id: 'steadfast-shield',
    name: 'Steadfast Shield',
    description: 'The unwavering defense of a shield-bearer strengthens allies.',
    effects: { vit: 4, str: 2 },
    allowedClasses: ['Shield'],
    minRank: 'Veteran',
  },
  {
    id: 'swift-strike',
    name: 'Swift Strike',
    description: 'Lightning-fast reflexes echo through the guild.',
    effects: { dex: 6 },
    allowedClasses: ['Dagger'],
    minRank: 'Veteran',
  },
  {
    id: 'legendary-wisdom',
    name: 'Legendary Wisdom',
    description: 'Centuries of knowledge crystallize into lasting insight.',
    effects: { int: 8, lck: 2 },
    allowedClasses: ['Wand', 'Staff', 'Sword', 'Bow', 'Shield', 'Dagger', 'Axe', 'Mace'],
    minRank: 'Champion',
  },
  {
    id: 'veterans-insight',
    name: "Veteran's Insight",
    description: 'A master\'s complete knowledge base elevates all aspects of adventuring.',
    effects: { str: 4, dex: 4, int: 4, vit: 4, lck: 4 },
    allowedClasses: ['Sword', 'Wand', 'Bow', 'Shield', 'Staff', 'Dagger', 'Axe', 'Mace'],
    minRank: 'Legend',
  },
];

export function generateLegacyPerk(adventurer: Adventurer, day: number = 0): LegacyPerk {
  const adventurerClass = adventurer.class;
  const rank = adventurer.rank;
  const rankIndex = VALID_RANKS.indexOf(rank as typeof VALID_RANKS[number]);

  // First pass: filter by both class and rank
  const eligible = LEGACY_PERKS.filter(perk => {
    if (!perk.allowedClasses.includes(adventurerClass)) return false;
    const minRankIndex = VALID_RANKS.indexOf(perk.minRank as typeof VALID_RANKS[number]);
    if (rankIndex < minRankIndex) return false;
    return true;
  });

  // Second pass: if no class matches, try rank-only filter
  let pool = eligible;
  if (pool.length === 0) {
    const byRank = LEGACY_PERKS.filter(perk => {
      const minRankIndex = VALID_RANKS.indexOf(perk.minRank as typeof VALID_RANKS[number]);
      if (rankIndex < minRankIndex) return false;
      return true;
    });
    pool = byRank.length > 0 ? byRank : [LEGACY_PERKS[0]];
  }

  const selected = pool[Math.floor(Math.random() * pool.length)];

  return {
    id: generateId(),
    templateId: selected.id,
    name: selected.name,
    description: selected.description,
    effects: { ...selected.effects } as Stats,
    appliedAt: day,
  };
}

export function applyLegacyPerks(adventurer: Adventurer, legacyPerks: LegacyPerk[]): Adventurer {
  if (!legacyPerks || legacyPerks.length === 0) return adventurer;

  const adapted: Adventurer = { ...adventurer, stats: { ...adventurer.stats } };

  for (const perk of legacyPerks) {
    if (perk.effects) {
      for (const [stat, value] of Object.entries(perk.effects) as [keyof Stats, number][]) {
        adapted.stats[stat] = (adapted.stats[stat] || 0) + value;
      }
    }
  }

  return adapted;
}

// ─── Office Level ──────────────────────────────────────

export const OFFICE_LEVEL_THRESHOLDS = [
  { level: 1, quests: 0, roster: 0 },
  { level: 2, quests: 5, roster: 3 },
  { level: 3, quests: 15, roster: 6 },
  { level: 4, quests: 30, roster: 10 },
  { level: 5, quests: 50, roster: 15 },
] as const;

export function calculateOfficeLevel(state: {
  questCount?: number;
  adventurers?: Adventurer[];
  officeLevel?: number;
  officeVisualBonus?: number;
}): { level: number; nextLevel: number | null; progress: number; label: string } {
  const questCount = state.questCount ?? 0;
  const adventurerCount = (state.adventurers || []).length;
  const officeVisualBonus = state.officeVisualBonus ?? 0;

  // Apply office upgrade bonus to effective quest count
  const effectiveQuestCount = questCount + officeVisualBonus;

  let calculatedLevel = 1;
  for (const threshold of OFFICE_LEVEL_THRESHOLDS) {
    if (effectiveQuestCount >= threshold.quests && adventurerCount >= threshold.roster) {
      calculatedLevel = threshold.level;
    }
  }

  // Clamp to valid range
  calculatedLevel = Math.max(1, Math.min(calculatedLevel, OFFICE_LEVEL_THRESHOLDS.length));

  // Find next level threshold for progress calculation
  const currentLevel = state.officeLevel ?? 1;
  const currentThreshold = OFFICE_LEVEL_THRESHOLDS.find(t => t.level === Math.min(currentLevel, OFFICE_LEVEL_THRESHOLDS.length));
  const nextThreshold = OFFICE_LEVEL_THRESHOLDS.find(t => t.level === calculatedLevel + 1);

  // Calculate progress toward next level (0-1)
  let progress = 1;
  if (currentThreshold && nextThreshold) {
    const questsNeeded = nextThreshold.quests - currentThreshold.quests;
    const rosterNeeded = nextThreshold.roster - currentThreshold.roster;

    // Weighted average of quest progress and roster progress
    const questProgress = questsNeeded > 0
      ? Math.min(1, (effectiveQuestCount - currentThreshold.quests) / questsNeeded)
      : 1;
    const rosterProgress = rosterNeeded > 0
      ? Math.min(1, (adventurerCount - currentThreshold.roster) / rosterNeeded)
      : 1;

    progress = (questProgress + rosterProgress) / 2;
  }

  const labels = ['', 'Shack', 'Hovel', 'Guild Hall', 'Fortress', 'Citadel'];
  const levelIndex = Math.min(calculatedLevel, labels.length - 1);

  return {
    level: calculatedLevel,
    nextLevel: calculatedLevel < OFFICE_LEVEL_THRESHOLDS.length ? calculatedLevel + 1 : null,
    progress: Math.round(progress * 100) / 100,
    label: labels[levelIndex] || 'Citadel',
  };
}

// ─── Class Evolution ───────────────────────────────────

export const CLASS_EVOLUTIONS: ClassEvolution[] = [
  // ── Arcane Crystal Paths (weapon + Arcane Crystal) ──────────────────────
  {
    requires: { weapon: 'Sword', accessory: 'Arcane Crystal' },
    result: 'Sword Mage',
    description: 'A warrior who channels arcane energy through their blade.',
    aptitude_multipliers: { primary: { combat: 1.3, investigation: 1.2 }, secondary: { protection: 0.7 } },
    minRank: 'Journeyman',
  },
  {
    requires: { weapon: 'Dagger', accessory: 'Arcane Crystal' },
    result: 'Shadowweaver',
    description: 'A stealth operative who cloaks strikes in magic.',
    aptitude_multipliers: { primary: { stealth: 1.3, assassination: 1.3 }, secondary: { combat: 0.8 } },
    minRank: 'Journeyman',
  },
  {
    requires: { weapon: 'Bow', accessory: 'Arcane Crystal' },
    result: 'Wind Dancer',
    description: 'A ranged fighter who commands natural forces.',
    aptitude_multipliers: { primary: { tracking: 1.3, ranged_combat: 1.2 }, secondary: { defense: 0.7 } },
    minRank: 'Journeyman',
  },
  {
    requires: { weapon: 'Mace', accessory: 'Arcane Crystal' },
    result: 'Holy Avenger',
    description: 'A divine warrior who smites with radiant power.',
    aptitude_multipliers: { primary: { combat: 1.2, defense: 1.2 }, secondary: { investigation: 0.7 } },
    minRank: 'Veteran',
  },
  {
    requires: { weapon: 'Axe', accessory: 'Arcane Crystal' },
    result: 'Storm Reaver',
    description: 'A thunderous warrior who channels storms through their axe.',
    aptitude_multipliers: { primary: { combat: 1.3 }, secondary: { ranged_combat: 0.9, stealth: 0.6 } },
    minRank: 'Champion',
  },

  // ── Shield Armor Paths (weapon + Shield as armor) ──────────────────────
  {
    requires: { weapon: 'Sword', armor: 'Shield' },
    result: 'Paladin',
    description: 'A noble defender who fights with honor and strength.',
    aptitude_multipliers: { primary: { defense: 1.3, protection: 1.2 }, secondary: { combat: 1.1 } },
    minRank: 'Veteran',
  },
  {
    requires: { weapon: 'Bow', armor: 'Shield' },
    result: 'Ranger Captain',
    description: 'A master tracker who leads from the frontlines.',
    aptitude_multipliers: { primary: { tracking: 1.3, ranged_combat: 1.2 }, secondary: { defense: 0.8 } },
    minRank: 'Journeyman',
  },
  {
    requires: { weapon: 'Axe', armor: 'Shield' },
    result: 'Berserker Guardian',
    description: 'A frontline fighter combining brute force with defense.',
    aptitude_multipliers: { primary: { combat: 1.3, defense: 1.2 }, secondary: { protection: 0.8 } },
    minRank: 'Veteran',
  },

  // ── New Paths (Sharpshooter, Arcane Scholar, Bastion Warden, Warlord) ──
  {
    requires: { weapon: 'Bow', accessory: "Sharpshooter's Monocular" },
    result: 'Sharpshooter',
    description: 'A master ranged fighter who strikes with deadly precision.',
    aptitude_multipliers: { primary: { tracking: 1.4, ranged_combat: 1.4 }, secondary: { stealth: 0.7 } },
    minRank: 'Journeyman',
  },
  {
    requires: { weapon: 'Staff', accessory: "Scholar's Manuscript" },
    result: 'Arcane Scholar',
    description: 'A learned mage who deciphers ancient arcane theories.',
    aptitude_multipliers: { primary: { investigation: 1.4, herb_gathering: 1.3 }, secondary: { combat: 0.7 } },
    minRank: 'Journeyman',
  },
  {
    requires: { weapon: 'Shield', armor: 'Plate Armor' },
    result: 'Bastion Warden',
    description: 'An immovable bulwark who shields allies with unwavering resolve.',
    aptitude_multipliers: { primary: { defense: 1.4, protection: 1.3 }, secondary: { combat: 0.8 } },
    minRank: 'Veteran',
  },
  {
    requires: { weapon: 'Mace', armor: 'Plate Armor' },
    result: 'Warlord',
    description: 'A relentless commander who crushes enemies with overwhelming force.',
    aptitude_multipliers: { primary: { combat: 1.4, defense: 1.3 }, secondary: { protection: 1.1 } },
    minRank: 'Veteran',
  },
];

export function evolveClass(adventurer: Adventurer): EvolutionResult {
  const equipment = adventurer.equipment || {};

  for (const evolution of CLASS_EVOLUTIONS) {
    const { weapon: reqWeapon, armor: reqArmor, accessory: reqAccessory } = evolution.requires;

    const hasWeapon = reqWeapon ? equipment.weapon?.name === reqWeapon : true;
    const hasArmor = reqArmor ? equipment.armor?.name === reqArmor : true;
    const hasAccessory = reqAccessory ? equipment.accessory?.name === reqAccessory : true;

    if (hasWeapon && hasArmor && hasAccessory) {
      return {
        evolved: true,
        newClass: evolution.result,
        newAptitudes: evolution.aptitude_multipliers,
        description: evolution.description,
      };
    }
  }

  return { evolved: false, newClass: null, newAptitudes: null, description: null };
}

export function getEvolutionStatus(adventurer: Adventurer): EvolutionStatus {
  const equipment = adventurer.equipment || {};
  const possible = CLASS_EVOLUTIONS.filter(e => {
    const rankIndex = VALID_RANKS.indexOf((adventurer.rank || 'Novice') as typeof VALID_RANKS[number]);
    const minRankIndex = VALID_RANKS.indexOf(e.minRank as typeof VALID_RANKS[number]);
    return rankIndex >= minRankIndex;
  });

  const matching: ClassEvolution[] = [];
  const unmet: Array<ClassEvolution & { missing: [string, string][] }> = [];

  for (const evolution of possible) {
    const { weapon: reqWeapon, armor: reqArmor, accessory: reqAccessory } = evolution.requires;
    const equipped = {
      weapon: equipment.weapon?.name,
      armor: equipment.armor?.name,
      accessory: equipment.accessory?.name,
    };

    const metRequirements = Object.entries(evolution.requires).every(([slot, cls]) => {
      return equipped[slot as 'weapon' | 'armor' | 'accessory'] === cls;
    });

    if (metRequirements) {
      matching.push(evolution);
    } else {
      unmet.push({
        ...evolution,
        missing: Object.entries(evolution.requires).filter(([slot, cls]) => {
          return equipped[slot as 'weapon' | 'armor' | 'accessory'] !== cls;
        }) as [string, string][],
      });
    }
  }

  return { matching, unmet, canEvolve: matching.length > 0 };
}

export function evolveAdventurer(adventurer: Adventurer): Adventurer {
  const result = evolveClass(adventurer);
  if (!result.evolved) return { ...adventurer };

  // Get base aptitudes for the adventurer's current (base) class
  const baseAptitudes = CLASS_APTITUDES[adventurer.class] || {};

  // Apply multipliers: primary boosted, secondary reduced, others unchanged
  const evolvedAptitudes: Record<string, number> = { ...baseAptitudes };
  const multipliers = result.newAptitudes!;

  for (const [aptitude, mult] of Object.entries(multipliers.primary)) {
    evolvedAptitudes[aptitude] = (evolvedAptitudes[aptitude] || 0) * mult;
  }
  for (const [aptitude, mult] of Object.entries(multipliers.secondary)) {
    evolvedAptitudes[aptitude] = (evolvedAptitudes[aptitude] || 0) * mult;
  }

  const newAdventurer: Adventurer = {
    ...adventurer,
    class: result.newClass!,
    aptitudes: evolvedAptitudes,
    evolvedClass: result.newClass,
    evolved: true,
    evolutionDate: new Date().toISOString(),
  };

  return newAdventurer;
}

// ─── Fame Gain ─────────────────────────────────────────

export function calculateFameGain(state: {
  adventurers?: Adventurer[];
  officeLevel?: number;
  fameMultiplier?: number;
}): number {
  let fameGain = 0;
  // Base per-completion fame gain (linear, not cumulative)
  fameGain += 2;
  const adventurerCount = (state.adventurers || []).length;
  fameGain += adventurerCount * 3;
  const officeLevel = state.officeLevel ?? 1;
  fameGain += (officeLevel - 1) * 5;
  const fameMultiplier = state.fameMultiplier ?? 1;
  return Math.floor(fameGain * fameMultiplier);
}

// ─── Fame Milestone Arrivals ───────────────────────────

export const FAME_MILESTONE_ARRIVALS = [
  { fame: 10, arrivals: [
    { type: 'equipped' as const, equipment: ['weapon'] },
    { type: 'raw' as const },
  ]},
  { fame: 30, arrivals: [
    { type: 'equipped' as const, equipment: ['weapon', 'armor'] },
    { type: 'raw' as const },
  ]},
  { fame: 60, arrivals: [
    { type: 'equipped' as const, equipment: ['weapon', 'accessory'] },
    { type: 'raw' as const },
  ]},
  { fame: 100, arrivals: [
    { type: 'equipped' as const, equipment: ['weapon', 'armor'] },
    { type: 'raw' as const },
  ]},
];

export function createGuildMaster(): Adventurer {
  const gmClass = VALID_CLASSES[Math.floor(Math.random() * VALID_CLASSES.length)];
  const stats: Stats = {
    str: 4 + Math.floor(Math.random() * 5),
    dex: 4 + Math.floor(Math.random() * 5),
    int: 4 + Math.floor(Math.random() * 5),
    vit: 4 + Math.floor(Math.random() * 5),
    lck: 4 + Math.floor(Math.random() * 5),
  };
  return {
    id: generateId(),
    name: 'Guild Master',
    class: gmClass,
    stats,
    equipment: { weapon: null, armor: null, accessory: null },
    morale: 80,
    origin: 'Town-born',
    personality: { traits: [] },
    level: 1,
    experience: 0,
    rank: 'Novice',
    aptitudes: {},
    evolved: false,
    evolutionDate: null,
    evolvedClass: null,
    isGuildMaster: true,
  };
}

export function generateMilestoneArrivals(
  state: { fameMilestonesReached?: number[]; adventurers?: Adventurer[]; party?: { adventurerIds?: string[] }; gold?: number; officeLevel?: number; fameMultiplier?: number },
  milestoneFame: number
): Adventurer[] {
  const milestone = FAME_MILESTONE_ARRIVALS.find(m => m.fame === milestoneFame);
  if (!milestone) return [];

  const arrivals: Adventurer[] = [];
  for (const config of milestone.arrivals) {
    const adventurer = defaultAdventurer();
    adventurer.name = generateName();
    adventurer.class = VALID_CLASSES[Math.floor(Math.random() * VALID_CLASSES.length)];
    adventurer.origin = VALID_ORIGINS[Math.floor(Math.random() * VALID_ORIGINS.length)];

    if (config.type === 'equipped') {
      // Give them some starting equipment based on config
      for (const slot of (config.equipment || [])) {
        const rarity = RARITY_TIERS[Math.floor(Math.random() * 2)] || 'Common'; // Common or Uncommon
        const slotNames: Record<string, string> = { weapon: 'Sword', armor: 'Leather', accessory: 'Ring' };
        const slotKey = slot as 'weapon' | 'armor' | 'accessory';
        adventurer.equipment[slotKey] = {
          name: `${rarity} ${slotNames[slot] || slot}`,
          rarity,
          slot,
        };
      }
    }

    arrivals.push(adventurer);
  }
  return arrivals;
}

// ─── Game Defaults ─────────────────────────────────────

export function gameDefaults(): {
  gold: number;
  day: number;
  adventurers: Adventurer[];
  quests: Quest[];
  party: { id: string; adventurerIds: string[]; synergyScore: number; aptitudeBonus: number };
  activeQuest: null;
  fame: number;
  recruitmentPool: Adventurer[];
  fameMilestonesReached: number[];
  notifications: never[];
  questCount: number;
  events: never[];
  eventCooldowns: Record<string, number>;
  questRisk: number;
  reputation: number;
  favorDebt: number;
  legacyPerks: never[];
  equipmentBonus: number;
  fameMultiplier: number;
  officeVisualBonus: number;
} {
  const guildMaster = createGuildMaster();
  const recruitmentPool = generateRecruitmentPool(5);
  const initialPool = { fame: 0, adventurers: [guildMaster] };
  const quests = getFameGatedQuestPool(initialPool, 3);
  return {
    gold: 20,
    day: 1,
    adventurers: [guildMaster],
    quests: quests,
    party: defaultParty([guildMaster.id]),
    activeQuest: null,
    fame: 0,
    recruitmentPool: recruitmentPool,
    fameMilestonesReached: [],
    notifications: [],
    questCount: 0,
    events: [],
    eventCooldowns: {},
    questRisk: 0,
    reputation: 0,
    favorDebt: 0,
    legacyPerks: [],
    equipmentBonus: 0,
    fameMultiplier: 1,
    officeVisualBonus: 0,
  };
}

export function validateGame(state: Record<string, unknown>): { valid: true } | { valid: false; reason: string } {
  if (!Array.isArray((state.adventurers as unknown[]))) return { valid: false, reason: 'Missing adventurers array' };
  if (!Array.isArray((state.quests as unknown[]))) return { valid: false, reason: 'Missing quests array' };
  if (!state.party || typeof state.party !== 'object') return { valid: false, reason: 'Missing party object' };
  if (state.events !== undefined && !Array.isArray((state.events as unknown[]))) return { valid: false, reason: 'events must be an array' };
  return { valid: true };
}
