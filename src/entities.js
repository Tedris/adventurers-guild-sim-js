// Adventurers Guild Simulator — Entity Models
// ===================================================
// Plain data structures for Adventurer, Quest, and Party.
// Provides default factories, constants, and validation schemas.

// ─── Adventurer ───

export const VALID_CLASSES = [
  'Sword', 'Wand', 'Bow', 'Shield', 'Staff', 'Dagger', 'Axe', 'Mace',
];

export const VALID_ORIGINS = [
  'Town-born', 'Migrant', 'Wanderer', 'Exile', 'Apprentice',
];

export const RARITY_TIERS = ['Common', 'Uncommon', 'Rare', 'Epic'];
export const VALID_RANKS = ['Novice', 'Journeyman', 'Veteran', 'Champion', 'Legend'];
export const DEFAULT_WAGE = 2;

// ─── Quest Templates (Phase 3-02) ───

/**
 * Hand-crafted quest templates for the quest pool.
 * Each template defines name, difficulty, stat requirements, preferred classes,
 * gold/XP rewards, and description.
 * @type {Object[]}
 */
export const QUEST_TEMPLATES = [
  // Easy quests (difficulty 1-2)
  { name: 'Scout the nearby forest', difficulty: 1, requirements: { minStats: { str: 5, dex: 5, int: 5, vit: 5, lck: 5 }, preferredClasses: ['Sword', 'Bow'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 15, experience: 25 }, description: 'Reconnaissance mission in the nearby forest.' },
  { name: 'Clear rat infestation', difficulty: 1, requirements: { minStats: { str: 4, dex: 4, int: 3, vit: 4, lck: 3 }, preferredClasses: ['Sword', 'Dagger'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 10, experience: 20 }, description: 'The town needs rats cleared from the cellar.' },
  { name: 'Deliver messages to border village', difficulty: 2, requirements: { minStats: { str: 5, dex: 6, int: 4, vit: 5, lck: 5 }, preferredClasses: ['Bow', 'Wand'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 20, experience: 30 }, description: 'Urgent message delivery to a distant village.' },
  { name: 'Investigate missing farmers', difficulty: 2, requirements: { minStats: { str: 6, dex: 5, int: 7, vit: 6, lck: 6 }, preferredClasses: ['Wand', 'Staff'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 25, experience: 35 }, description: 'Three farmers have vanished near the old mill. Something unnatural is afoot.' },
  { name: 'Repair the bridge', difficulty: 2, requirements: { minStats: { str: 8, dex: 4, int: 4, vit: 7, lck: 4 }, preferredClasses: ['Shield', 'Axe'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 30, experience: 35 }, description: 'A storm destroyed the only bridge to the eastern valley. Villagers need it fixed before harvest.' },
  { name: 'Negotiate the troll peace', difficulty: 2, requirements: { minStats: { str: 8, dex: 5, int: 10, vit: 9, lck: 7 }, preferredClasses: ['Shield', 'Wand'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 35, experience: 40 }, description: 'A troll blockades the mountain pass. Diplomacy is preferred over combat.' },
  // Medium quests (difficulty 3-4)
  { name: 'Hunt bandits on the highway', difficulty: 3, requirements: { minStats: { str: 8, dex: 7, int: 5, vit: 7, lck: 6 }, preferredClasses: ['Sword', 'Axe'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 40, experience: 50 }, description: 'Bandits have been plundering merchant caravans.' },
  { name: 'Explore the abandoned mine', difficulty: 3, requirements: { minStats: { str: 7, dex: 6, int: 8, vit: 6, lck: 7 }, preferredClasses: ['Staff', 'Shield'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 45, experience: 55 }, description: 'An old mine has been emitting strange noises.' },
  { name: 'Track the shadow wolf', difficulty: 3, requirements: { minStats: { str: 6, dex: 10, int: 6, vit: 8, lck: 8 }, preferredClasses: ['Bow', 'Dagger'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 45, experience: 50 }, description: 'A massive wolf has been killing livestock. The locals call it shadow.' },
  { name: 'Clear the goblin camp', difficulty: 3, requirements: { minStats: { str: 9, dex: 7, int: 5, vit: 8, lck: 6 }, preferredClasses: ['Sword', 'Axe', 'Shield'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 50, experience: 55 }, description: 'A goblin camp has been raiding supply caravans on the northern road.' },
  { name: 'Escort merchant caravan', difficulty: 4, requirements: { minStats: { str: 9, dex: 8, int: 6, vit: 9, lck: 7 }, preferredClasses: ['Shield', 'Sword'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 55, experience: 60 }, description: 'Protect a valuable merchant caravan through dangerous territory.' },
  { name: 'Retrieve the ancient tome', difficulty: 4, requirements: { minStats: { str: 7, dex: 8, int: 12, vit: 7, lck: 9 }, preferredClasses: ['Wand', 'Staff', 'Dagger'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 60, experience: 70 }, description: 'An ancient library beneath the old keep holds a tome of forgotten magic.' },
  // Hard quests (difficulty 5)
  { name: 'Slay the dragon', difficulty: 5, requirements: { minStats: { str: 15, dex: 12, int: 10, vit: 14, lck: 12 }, preferredClasses: ['Sword', 'Axe', 'Mace'], minPartySize: 1, maxPartySize: 3 }, rewards: { gold: 100, experience: 120 }, description: 'A dragon has taken up residence in the mountain. Only the bravest dare attempt this.' },
  { name: 'Infiltrate the rival guild', difficulty: 5, requirements: { minStats: { str: 10, dex: 14, int: 12, vit: 10, lck: 13 }, preferredClasses: ['Dagger', 'Bow'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 90, experience: 110 }, description: 'The rival guild has been poaching your adventurers. Infiltrate and expose them.' },
  { name: 'Purge the haunted crypt', difficulty: 4, requirements: { minStats: { str: 10, dex: 8, int: 10, vit: 10, lck: 10 }, preferredClasses: ['Staff', 'Mace', 'Sword'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 70, experience: 80 }, description: 'Undead have risen in the family crypts of the old nobility. Send the bravest.' },
];

// ─── Name Generation (Phase 3) ───

const NAME_SYLLABLES = {
  start: ['Ae', 'Bal', 'Cael', 'Dar', 'El', 'Fen', 'Grim', 'Hal', 'Ith', 'Jor', 'Kal', 'Lyr', 'Mor', 'Nex', 'Or', 'Pel', 'Quin', 'Ran', 'Sel', 'Thor', 'Ul', 'Val', 'War', 'Xan', 'Yar', 'Zep'],
  end: ['an', 'ar', 'as', 'din', 'dor', 'el', 'en', 'er', 'gar', 'gin', 'ias', 'in', 'ion', 'ius', 'kar', 'lan', 'lin', 'mar', 'mus', 'nar', 'or', 'rin', 'ros', 'sar', 'thas', 'tin', 'tor', 'us', 'win'],
};

/**
 * Generate a procedurally composed adventurer name from syllable pools.
 * Combines a start syllable + end syllable.
 * @param {Object} [overrides={}] — Optional overrides
 * @param {string} [overrides.name] — Specific name to return instead of generated
 * @param {string} [overrides.gender] — Not used yet, reserved for future gendered pools
 * @returns {string} Generated name (e.g., 'Aerin', 'Grimar')
 */
export function generateName(overrides = {}) {
  if (overrides.name) return overrides.name;
  const start = NAME_SYLLABLES.start[Math.floor(Math.random() * NAME_SYLLABLES.start.length)];
  const end = NAME_SYLLABLES.end[Math.floor(Math.random() * NAME_SYLLABLES.end.length)];
  return start + end;
}

// ─── Personality Traits (Phase 3) ───

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
];

/**
 * Personality trait definitions with gameplay effects.
 * Each trait: morale effect on hire, quest success modifier.
 * Values: morale = +/- bonus to base morale (default 70).
 *         quest_success = +/- percentage point modifier.
 */
export const PERSONALITY_TRAIT_TABLE = {
  // Courageous: +morale, +combat/tracking aptitude
  Brave:       { morale: 5,  quest_success: 2,  description: '+5 morale on hire, +2% combat quest success' },
  Fierce:      { morale: 3,  quest_success: 3,  description: '+3 morale on hire, +3% combat quest success' },
  Unyielding:  { morale: 8,  quest_success: 1,  description: '+8 morale on hire, +1% all quest success' },
  Stalwart:    { morale: 6,  quest_success: 2,  description: '+6 morale on hire, +2% defense quest success' },
  Dauntless:   { morale: 4,  quest_success: 4,  description: '+4 morale on hire, +4% high-difficulty quest success' },
  // Cautious: stable morale, +defense
  Cautious:    { morale: 2,  quest_success: 1,  description: '+2 morale on hire, +1% defense quest success' },
  Prudent:     { morale: 3,  quest_success: 1,  description: '+3 morale on hire, +1% protection quest success' },
  Methodical:  { morale: 4,  quest_success: 2,  description: '+4 morale on hire, +2% investigation quest success' },
  Watchful:    { morale: 3,  quest_success: 1,  description: '+3 morale on hire, +1% tracking quest success' },
  Meticulous:  { morale: 5,  quest_success: 1,  description: '+5 morale on hire, +1% herb_gathering quest success' },
  // Social: morale effects on party
  Charismatic: { morale: 3,  quest_success: 1,  description: '+3 morale on hire, +1% all quest success' },
  Witty:       { morale: 5,  quest_success: 0,  description: '+5 morale on hire, no quest modifier' },
  Loyal:       { morale: 7,  quest_success: 1,  description: '+7 morale on hire, +1% shield-type quest success' },
  Ambitious:   { morale: -3, quest_success: 3,  description: '-3 morale on hire, +3% high-value quest success' },
  Mentor:      { morale: 4,  quest_success: 1,  description: '+4 morale on hire, +1% aptitude-based quests' },
  // Scholarly: +investigation, +herb_gathering
  Scholarly:   { morale: 1,  quest_success: 2,  description: '+1 morale on hire, +2% investigation quest success' },
  Curious:     { morale: 2,  quest_success: 2,  description: '+2 morale on hire, +2% herb_gathering quest success' },
  Analytical:  { morale: 1,  quest_success: 2,  description: '+1 morale on hire, +2% investigation quest success' },
  Patient:     { morale: 3,  quest_success: 1,  description: '+3 morale on hire, +1% long-duration quest success' },
  'Detail-oriented': { morale: 2, quest_success: 2, description: '+2 morale on hire, +2% investigation quest success' },
  // Roguish: +stealth, +ranged_combat
  Cunning:     { morale: 0,  quest_success: 3,  description: 'No morale change, +3% stealth quest success' },
  Resourceful: { morale: 2,  quest_success: 2,  description: '+2 morale on hire, +2% any quest success' },
  Stealthy:    { morale: -1, quest_success: 3,  description: '-1 morale on hire, +3% stealth quest success' },
  Lucky:       { morale: 3,  quest_success: 2,  description: '+3 morale on hire, +2% luck-dependent quest success' },
  Adaptable:   { morale: 2,  quest_success: 2,  description: '+2 morale on hire, +2% any quest success' },
};

/**
 * Generate a personality object with 1-3 random traits.
 * @param {number} [count=2] — Number of traits to generate (1-3)
 * @returns {{ traits: string[] }} Personality object
 */
export function generatePersonality(count = 2) {
  const numTraits = count === 1 ? 1 : 1 + Math.floor(Math.random() * Math.min(count, 3));
  const traits = [];
  const pool = [...VALID_PERSONALITY_TRAITS];

  for (let i = 0; i < numTraits && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    traits.push(pool.splice(idx, 1)[0]); // no duplicates
  }

  return { traits };
}

export const MIN_STAT = 1;
export const MAX_STAT = 20;
export const DEFAULT_MORALE = 70;

/**
 * Roll 3d6 and return sum (3–18).
 */
function rollStat() {
  return 3 + Math.floor(Math.random() * 3)
           + Math.floor(Math.random() * 3)
           + Math.floor(Math.random() * 3);
}

// ─── Wage Calculation ───

const RANK_WAGE_BASE = {
  Novice: 2,
  Journeyman: 3,
  Veteran: 4,
  Champion: 5,
  Legend: 7,
};

/**
 * Calculate wage for an adventurer based on rank and equipment rarity.
 * @param {Object} adventurer — Adventurer entity
 * @returns {number} Wage in gold
 */
export function calculateWage(adventurer) {
  let wage = RANK_WAGE_BASE[adventurer.rank] ?? DEFAULT_WAGE;

  // Add +1g per rarity tier above Common
  const equipment = adventurer.equipment || {};
  const slots = ['weapon', 'armor', 'accessory'];
  for (const slot of slots) {
    const item = equipment[slot];
    if (item && item.rarity) {
      const tierIndex = RARITY_TIERS.indexOf(item.rarity);
      if (tierIndex > 0) {
        wage += tierIndex; // Uncommon=+1, Rare=+2, Epic=+3
      }
    }
  }

  // Apply personality trait wage modifiers (Phase 3)
  const personality = adventurer.personality || {};
  const traits = personality.traits || [];
  for (const traitName of traits) {
    const trait = PERSONALITY_TRAIT_TABLE[traitName];
    if (trait && trait.morale > 0) {
      // Traits that boost morale also slightly increase wage (enthusiasm premium)
      wage += Math.floor(trait.morale / 5);
    }
  }

  return wage;
}

/**
 * Calculate aptitudes for an adventurer based on their class.
 * @param {Object} adventurer — Adventurer entity
 * @returns {Object} Map of quest type to aptitude level (0–1)
 */
export function calculateAptitudes(adventurer) {
  const classAptitudes = {
    Sword:  { tracking: 0.8, combat: 0.9 },
    Wand:   { herb_gathering: 0.9, investigation: 0.7 },
    Bow:    { tracking: 0.9, ranged_combat: 0.8 },
    Staff:  { herb_gathering: 0.8, investigation: 0.8 },
    Shield: { defense: 0.9, protection: 0.7 },
    Dagger: { stealth: 0.9, assassination: 0.8 },
    Axe:    { tracking: 0.7, combat: 0.8 },
    Mace:   { combat: 0.8, defense: 0.7 },
  };

  const baseAptitudes = classAptitudes[adventurer.class] || {};

  // Apply personality trait aptitude modifiers (Phase 3)
  const personality = adventurer.personality || {};
  const traits = personality.traits || [];
  const traitAptitudes = {};
  for (const traitName of traits) {
    const trait = PERSONALITY_TRAIT_TABLE[traitName];
    if (trait && trait.quest_success > 0) {
      // Apply to a reasonable default aptitude category based on class
      const classType = adventurer.class.toLowerCase();
      if (classType === 'sword' || classType === 'axe') {
        traitAptitudes.combat = (traitAptitudes.combat || 0) + trait.quest_success * 0.01;
      } else if (classType === 'staff' || classType === 'wand') {
        traitAptitudes.investigation = (traitAptitudes.investigation || 0) + trait.quest_success * 0.01;
      }
    }
  }

  return { ...baseAptitudes, ...traitAptitudes };
}

/**
 * Generate a recruitment pool of adventurers.
 * @param {number} [count=1] — Number of adventurers to generate
 * @returns {Object[]} Array of adventurer entities
 */
export function generateRecruitmentPool(count = 1) {
  const pool = [];
  for (let i = 0; i < count; i++) {
    const adventurer = defaultAdventurer();
    adventurer.rank = 'Novice';
    adventurer.aptitudes = calculateAptitudes(adventurer);
    adventurer.wage = calculateWage(adventurer);
    pool.push(adventurer);
  }
  return pool;
}

/**
 * Generate a UUID v4.
 */
const generateId = () => crypto.randomUUID();

/**
 * Create a new Adventurer entity with defaults.
 * @param {Object} [overrides={}] — Fields to override
 * @returns {Object} Adventurer entity
 */
export function defaultAdventurer(overrides = {}) {
  return {
    id: generateId(),
    name: overrides.name || generateName(overrides),
    class: overrides.class || VALID_CLASSES[0],
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
    origin: overrides.origin || VALID_ORIGINS[Math.floor(Math.random() * VALID_ORIGINS.length)],
    personality: overrides.personality || generatePersonality(),
    level: overrides.level ?? 1,
    experience: overrides.experience ?? 0,
    rank: overrides.rank ?? 'Novice',
    aptitudes: overrides.aptitudes ?? {},
    wage: overrides.wage ?? 0,
  };
}

// ─── Quest ───

export const VALID_DIFFICULTIES = [1, 2, 3, 4, 5];

/**
 * Create a new Quest entity with defaults.
 * @param {Object} [overrides={}] — Fields to override
 * @returns {Object} Quest entity
 */
export function defaultQuest(overrides = {}) {
  return {
    id: generateId(),
    name: overrides.name || 'Unnamed Quest',
    difficulty: overrides.difficulty ?? 1,
    requirements: overrides.requirements ?? {
      minStats: { str: 5, dex: 5, int: 5, vit: 5, lck: 5 },
      preferredClasses: [],
      minPartySize: overrides.minPartySize ?? 2,
      maxPartySize: overrides.maxPartySize ?? 3,
    },
    rewards: overrides.rewards ?? {
      gold: 10,
      experience: 20,
    },
    description: overrides.description || 'A quest for adventurers.',
  };
}

// ─── Party ───

const MAX_PARTY_SIZE = 3;
const MIN_PARTY_SIZE = 2;

/**
 * Create a new Party entity with given adventurer IDs.
 * @param {string[]} [adventurerIds=[]] — IDs of adventurers in the party
 * @returns {Object} Party entity
 */
export function defaultParty(adventurerIds = []) {
  return {
    id: generateId(),
    adventurerIds: adventurerIds.slice(0, MAX_PARTY_SIZE),
    synergyScore: 0,
    aptitudeBonus: 0,
  };
}

// ─── Validation ───

/**
 * Validate an adventurer object against schema rules.
 * @param {Object} data — Adventurer object to validate
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateAdventurer(data) {
  const required = [
    'id', 'name', 'class', 'stats', 'equipment',
    'morale', 'origin', 'personality', 'level', 'experience',
  ];
  for (const field of required) {
    if (!(field in data)) return { valid: false, reason: `Missing field: ${field}` };
  }
  if (!VALID_CLASSES.includes(data.class)) return { valid: false, reason: `Invalid class: ${data.class}` };
  if (!VALID_ORIGINS.includes(data.origin)) return { valid: false, reason: `Invalid origin: ${data.origin}` };
  for (const [stat, value] of Object.entries(data.stats)) {
    if (value < MIN_STAT || value > MAX_STAT) return { valid: false, reason: `Stat ${stat} out of range: ${value}` };
  }
  if (data.morale < 0 || data.morale > 100) return { valid: false, reason: `Morale out of range: ${data.morale}` };
  return { valid: true };
}

/**
 * Validate party size constraints.
 * @param {string[]} adventurerIds — Array of adventurer IDs
 * @param {Object} [quest=null] — Optional quest for solo eligibility check
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateParty(adventurerIds, quest = null) {
  // Solo quest: allow party size of 1 if we have Legend rank
  if (quest && quest.requirements?.minPartySize === 1) {
    // This is a solo-eligible quest; size 1 is allowed
    if (adventurerIds.length > MAX_PARTY_SIZE) return { valid: false, reason: `Party too large: ${adventurerIds.length} > ${MAX_PARTY_SIZE}` };
    return { valid: true };
  }

  if (adventurerIds.length < MIN_PARTY_SIZE) return { valid: false, reason: `Party too small: ${adventurerIds.length} < ${MIN_PARTY_SIZE}` };
  if (adventurerIds.length > MAX_PARTY_SIZE) return { valid: false, reason: `Party too large: ${adventurerIds.length} > ${MAX_PARTY_SIZE}` };
  return { valid: true };
}

// ─── Party Synergy ───

/**
 * Calculate class diversity bonus for a party.
 * @param {Object[]} adventurers — Party adventurers
 * @returns {{ uniqueClasses: number, bonus: number }}
 */
export function calculateClassDiversity(adventurers) {
  const uniqueClasses = new Set(adventurers.map(a => a.class));
  const uniqueCount = uniqueClasses.size;
  const bonus = Math.min(uniqueCount * 0.2, 1.5);
  return { uniqueClasses: uniqueCount, bonus };
}

/**
 * Calculate aptitude bonus for a party against preferred quest classes.
 * @param {Object[]} adventurers — Party adventurers
 * @param {string[]} preferredClasses — Quest preferred class names
 * @returns {number} Total aptitude bonus
 */
export function calculateAptitudeBonus(adventurers, preferredClasses) {
  let bonus = 0;
  for (const adventurer of adventurers) {
    const aptitudes = adventurer.aptitudes || {};
    for (const preferredClass of preferredClasses) {
      // Check if the adventurer has an aptitude matching this preferred class type
      for (const [aptitudeKey, aptitudeValue] of Object.entries(aptitudes)) {
        if (preferredClass.toLowerCase().includes(aptitudeKey.split('_')[0]) ||
            aptitudeKey.toLowerCase().includes(preferredClass.split(' ')[0].toLowerCase())) {
          bonus += aptitudeValue * 0.15;
        }
      }
      // Also check direct class match
      if (adventurer.class.toLowerCase() === preferredClass.toLowerCase()) {
        bonus += 0.15;
      }
    }
  }
  return bonus;
}

/**
 * Calculate synergy score for a party against a quest.
 * @param {Object[]} adventurers — Party adventurers
 * @param {Object} [quest=null] — Optional quest for aptitude matching
 * @returns {{ synergyScore: number, diversityBonus: number, aptitudeBonus: number }}
 */
export function calculateSynergyScore(adventurers, quest = null) {
  const { bonus: diversityBonus } = calculateClassDiversity(adventurers);

  let aptitudeBonus = 0;
  if (quest && quest.requirements?.preferredClasses) {
    aptitudeBonus = calculateAptitudeBonus(adventurers, quest.requirements.preferredClasses);
  }

  const synergyScore = diversityBonus + aptitudeBonus;
  return { synergyScore, diversityBonus, aptitudeBonus };
}

/**
 * Check if any adventurer in the party is eligible for solo quests.
 * @param {Object[]} adventurers — Party adventurers
 * @returns {boolean} True if any adventurer has Legend rank
 */
export function getSoloEligible(adventurers) {
  return adventurers.some(a => a.rank === 'Legend');
}

// ─── Quest Resolution ───

const EQUIPMENT_BONUS = {
  Common: 1,
  Uncommon: 2,
  Rare: 3,
  Epic: 5,
};

/**
 * Calculate total stat contribution for a party on a given stat.
 * @param {Object[]} adventurers — Party adventurers
 * @param {string} statName — Stat to sum (str, dex, int, vit, lck)
 * @returns {number} Total stat value
 */
export function calculateStatContribution(adventurers, statName) {
  let total = 0;
  for (const adventurer of adventurers) {
    total += adventurer.stats?.[statName] ?? 0;

    // Add equipment bonus if equipped
    const equipment = adventurer.equipment || {};
    for (const slot of ['weapon', 'armor', 'accessory']) {
      const item = equipment[slot];
      if (item && item.rarity && EQUIPMENT_BONUS[item.rarity]) {
        total += EQUIPMENT_BONUS[item.rarity];
      }
    }
  }
  return total;
}

/**
 * Calculate effective party stat with synergy bonus and solo penalty.
 * @param {Object[]} adventurers — Party adventurers
 * @param {Object} quest — Quest object
 * @param {string} statName — Stat to calculate
 * @returns {number} Effective stat value
 */
export function calculatePartyEffectiveStat(adventurers, quest, statName) {
  let effective = calculateStatContribution(adventurers, statName);

  // Solo penalty
  if (adventurers.length === 1) {
    effective *= 0.85;
  }

  // Apply synergy bonus from party
  const { synergyScore } = calculateSynergyScore(adventurers, quest);
  effective *= (1 + synergyScore * 0.1);

  return Math.floor(effective);
}

/**
 * Calculate quest success rate (D-07).
 * @param {Object[]} adventurers — Party adventurers
 * @param {Object} quest — Quest object
 * @returns {number} Success rate as percentage (10-95)
 */
export function calculateQuestSuccessRate(adventurers, quest) {
  const minStats = quest.requirements?.minStats || {};
  const statNames = Object.keys(minStats);

  if (statNames.length === 0) return 50; // No requirements = 50% chance

  let product = 1;
  for (const statName of statNames) {
    const required = minStats[statName];
    const effective = calculatePartyEffectiveStat(adventurers, quest, statName);
    const ratio = effective / required;

    // Cap at 1.5 (diminishing returns)
    const cappedRatio = Math.min(ratio, 1.5);
    product *= cappedRatio;
  }

  // Normalize to 0-100%
  const normalized = (product / Math.pow(1.5, statNames.length)) * 100;

  // Clamp to 10-95%
  return Math.max(10, Math.min(95, Math.round(normalized)));
}

/**
 * Calculate quest outcome (D-06).
 * @param {Object[]} adventurers — Party adventurers
 * @param {Object} quest — Quest object
 * @param {boolean} success — Whether the quest succeeded
 * @returns {{ success: boolean, gold: number, experience: number, moraleAdjustment: number }}
 */
export function calculateQuestOutcome(adventurers, quest, success) {
  if (success) {
    const successRate = calculateQuestSuccessRate(adventurers, quest);
    const performanceMultiplier = 1 + (successRate / 100) * 0.5;
    const finalGold = Math.floor(quest.rewards.gold * performanceMultiplier);
    const finalXP = Math.floor(quest.rewards.experience * performanceMultiplier);
    return { success: true, gold: finalGold, experience: finalXP, moraleAdjustment: 0 };
  } else {
    // Failure: partial rewards
    const partialGold = Math.floor(quest.rewards.gold * 0.2);
    const partialXP = Math.floor(quest.rewards.experience * 0.1);
    return { success: false, gold: partialGold, experience: partialXP, moraleAdjustment: -5 };
  }
}

/**
 * Apply procedural variation to a quest template.
 * Perturbs gold (±10%), experience (±10%), and stat requirements (±2).
 * @param {Object} template — Quest template definition
 * @returns {Object} Perturbed quest with unique ID
 */
export function perturbQuest(template) {
  const goldMultiplier = 1 + (Math.random() * 0.2 - 0.1); // ±10%
  const xpMultiplier = 1 + (Math.random() * 0.2 - 0.1);   // ±10%
  const minStats = {};
  const reqs = template.requirements.minStats || {};
  for (const [stat, value] of Object.entries(reqs)) {
    minStats[stat] = Math.max(1, value + Math.floor(Math.random() * 5) - 2); // ±2
  }

  return {
    id: crypto.randomUUID(),
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

/**
  * Generate a pool of quest templates.
 * @param {number} [count=3] — Number of quests to generate
 * @returns {Object[]} Array of quest templates
 */
export function generateQuestPool(count = 3) {
  const selected = [];
  const available = [...QUEST_TEMPLATES];

  // Select 'count' quests, preferring to avoid repeats within a pool
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length);
    const template = available.splice(idx, 1)[0];
    selected.push(perturbQuest(template));
  }

  return selected;
}

// ─── Economy Engine ───

const BASE_WAGE_SCALE = 0.1; // 10% increase per guild level
const FAME_DISCOUNT_THRESHOLDS = [50, 100]; // fame levels for 10%/20% discount
const FAME_DISCOUNT_VALUES = [0.1, 0.2];

const UPGRADE_BASE_COSTS = {
  office: 50,
  equipment: 30,
  job_postings: 15,
};

const UPGRADE_NAMES = {
  office: 'Guild Office',
  equipment: 'Equipment Stock',
  job_postings: 'Job Postings',
};

const UPGRADE_DESCRIPTIONS = {
  office: 'Upgrade guild office — attracts better adventurers and increases fame gain.',
  equipment: 'Improve equipment stock — grants +10% quest success rate.',
  job_postings: 'Post job listings — improves recruitment pool quality.',
};

/**
 * Calculate scaled wage for adventurers based on guild level and fame.
 * @param {Object[]} adventurers — Party adventurers
 * @param {number} guildLevel — Current guild level
 * @param {number} [fame=0] — Current guild fame
 * @returns {{ scaledWage: number, totalWageBill: number, scaleFactor: number }}
 */
export function calculateWageScale(adventurers, guildLevel, fame = 0) {
  // Level scaling: 10% increase per level above 1
  const scaleFactor = 1 + (guildLevel - 1) * BASE_WAGE_SCALE;

  // Fame discount
  let fameDiscount = 0;
  if (fame > FAME_DISCOUNT_THRESHOLDS[1]) {
    fameDiscount = FAME_DISCOUNT_VALUES[1]; // 20%
  } else if (fame > FAME_DISCOUNT_THRESHOLDS[0]) {
    fameDiscount = FAME_DISCOUNT_VALUES[0]; // 10%
  }

  let totalWageBill = 0;
  for (const adventurer of adventurers) {
    const baseWage = calculateWage(adventurer);
    const scaledWage = baseWage * scaleFactor * (1 - fameDiscount);
    totalWageBill += scaledWage;
  }

  return {
    scaleFactor,
    fameDiscount,
    totalWageBill: Math.round(totalWageBill),
  };
}

/**
 * Calculate upgrade cost based on type and current level.
 * @param {string} upgradeType — 'office', 'equipment', or 'job_postings'
 * @param {number} currentLevel — Current upgrade level
 * @returns {number} Cost in gold
 */
export function calculateUpgradeCost(upgradeType, currentLevel) {
  const baseCost = UPGRADE_BASE_COSTS[upgradeType] || 30;
  return Math.floor(baseCost * Math.pow(1.5, currentLevel || 0));
}

/**
 * Get available upgrades based on current state.
 * @param {Object} state — Current game state
 * @returns {Object[]} Array of available upgrades with costs
 */
export function getAvailableUpgrades(state) {
  const upgrades = state.upgrades || { office: 0, equipment: 0, job_postings: 0 };
  const gold = state.gold ?? 0;

  const results = [];
  for (const type of ['office', 'equipment', 'job_postings']) {
    const cost = calculateUpgradeCost(type, upgrades[type] || 0);
    if (type === 'equipment' && gold < 20) continue;
    if (type === 'job_postings' && gold < 10) continue;

    results.push({
      type,
      name: UPGRADE_NAMES[type],
      currentLevel: upgrades[type] || 0,
      nextCost: cost,
      description: UPGRADE_DESCRIPTIONS[type],
    });
  }
  return results;
}

/**
 * Calculate inflation pressure based on gold/adventurer ratio.
 * @param {Object} state — Current game state
 * @returns {{ ratio: number, pressure: 'low'|'medium'|'high' }}
 */
export function calculateInflationPressure(state) {
  const totalGold = state.gold ?? 0;
  const adventurerCount = (state.adventurers || []).length;
  const denominator = adventurerCount * 3;

  if (denominator === 0) return { ratio: 0, pressure: 'low' };

  const ratio = totalGold / denominator;
  let pressure;
  if (ratio > 5) pressure = 'high';
  else if (ratio > 2) pressure = 'medium';
  else pressure = 'low';

  return { ratio: Math.round(ratio * 100) / 100, pressure };
}

/**
 * Calculate gold sink opportunities available to the player.
 * @param {Object} state — Current game state
 * @returns {Object[]} Array of spending options
 */
export function calculateGoldSinkOpportunities(state) {
  const sinks = [];

  // Restock pool costs (generate 1 adventurer)
  sinks.push({ name: 'Restock Recruitment Pool', cost: 5, benefit: 'Generate 1 new adventurer in pool', type: 'recruitment' });

  // Job postings
  const jobPostingCost = calculateUpgradeCost('job_postings', (state.upgrades || {}).job_postings || 0);
  sinks.push({ name: 'Post Job Listing', cost: jobPostingCost, benefit: 'Improve future recruitment quality', type: 'upgrade' });

  // Equipment upgrade
  const equipCost = calculateUpgradeCost('equipment', (state.upgrades || {}).equipment || 0);
  sinks.push({ name: 'Upgrade Equipment Stock', cost: equipCost, benefit: '+10% quest success rate', type: 'upgrade' });

  // Office upgrade
  const officeCost = calculateUpgradeCost('office', (state.upgrades || {}).office || 0);
  sinks.push({ name: 'Upgrade Guild Office', cost: officeCost, benefit: '+5% fame gain, better adventurer attraction', type: 'upgrade' });

  return sinks;
}

// ─── Event System (Phase 3) ───

export const VALID_EVENT_CATEGORIES = ['Budget', 'Crisis', 'Drama'];

const EVENT_COOLDOWN_TICKS = 20; // Minimum ticks between same event

export const EVENT_TEMPLATES = [
  // ── Budget Events (4) ───────────────────────────────

  {
    id: 'budget-wage-demand',
    category: 'Budget',
    weight: 3,
    title: 'Wage Demands',
    description: 'Your adventurers are demanding higher pay. The economy has shifted since they joined.',
    choices: [
      { label: 'Accept (+5g/day wages)', effect: (state) => ({ wageMultiplier: (state.wageMultiplier || 1) + 0.1 }) },
      { label: 'Negotiate (+2 gold cost, no wage increase)', effect: (state) => ({ gold: -2, wageMultiplier: (state.wageMultiplier || 1) }) },
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
      { label: 'Skip supplies (morale -8, quest risk +10%)', effect: (state) => ({ moraleAdjustment: -8, questRisk: (state.questRisk || 0) + 10 }) },
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
      { label: 'Negotiate (+20 gold, favor debt)', effect: (state) => ({ gold: 20, favorDebt: (state.favorDebt || 0) + 1 }) },
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
      { label: 'Refuse (reputation -2)', effect: (state) => ({ reputation: (state.reputation || 0) - 2 }) },
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
      { label: 'Send a party (-2 adventurers for 3 days)', effect: (state) => ({ temporaryUnavailability: (state.temporaryUnavailability || 3) }) },
      { label: 'Post guards (-5 gold, no adventurer loss)', effect: (state) => ({ gold: -5 }) },
      { label: 'Ignore it (morale -5, risk of guild damage)', effect: (state) => ({ moraleAdjustment: -5 }) },
    ],
  },
  {
    id: 'crisis-rival-poaching',
    category: 'Crisis',
    weight: 3,
    title: 'Rival Poaching',
    description: 'The rival Blackwood Guild has been offering your adventurers double wages.',
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
      { label: 'Decline (reputation -2)', effect: (state) => ({ reputation: (state.reputation || 0) - 2 }) },
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
      { label: 'Find the source (-3 gold for investigation)', effect: (state) => ({ gold: -3, reputation: (state.reputation || 0) + 1 }) },
    ],
  },
];

// ─── Event Pool & Selection (Phase 3) ───

/**
 * Build a weighted event pool from EVENT_TEMPLATES.
 * Each event appears in the pool `weight` times for weighted random selection.
 * @returns {Object[]} Weighted event pool
 */
export function generateEventPool() {
  const pool = [];
  for (const template of EVENT_TEMPLATES) {
    for (let i = 0; i < template.weight; i++) {
      pool.push(template);
    }
  }
  return pool;
}

/**
 * Select the next available event for the current game state.
 * Filters out events within their cooldown period.
 * Returns null if no events are available.
 * @param {Object} state — Current game state
 * @returns {Object|null} Selected event template or null
 */
export function selectNextEvent(state) {
  const pool = generateEventPool();
  const cooldowns = state.eventCooldowns || {};
  const currentTick = state.day || 0;

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

/**
 * Resolve an event by applying the chosen effect.
 * Returns a delta object to be merged into state by the store reducer.
 * Also returns { eventId, resolvedAt } for cooldown tracking.
 * @param {Object} state — Current game state
 * @param {string} eventId — ID of the event to resolve
 * @param {number} choiceIndex — Index of the chosen effect (0-based)
 * @returns {{ delta: Object, eventId: string, resolvedAt: number, moraleAdjustment: number }}
 */
export function resolveEvent(state, eventId, choiceIndex) {
  const template = EVENT_TEMPLATES.find(t => t.id === eventId);
  if (!template) {
    return { delta: {}, eventId, resolvedAt: state.day || 0, moraleAdjustment: 0 };
  }

  const choice = template.choices[choiceIndex];
  if (!choice) {
    return { delta: {}, eventId, resolvedAt: state.day || 0, moraleAdjustment: 0 };
  }

  // Apply the effect function
  const delta = choice.effect(state);

  // Handle special effects that modify adventurer arrays
  let moraleAdjustment = delta.moraleAdjustment || 0;
  let adventurerChanges = {};

  if (delta.departureCount && delta.departureCount > 0) {
    // Will be handled by store reducer — just signal it
    adventurerChanges = { departureCount: delta.departureCount };
  }

  if (delta.retirementTriggered) {
    adventurerChanges = { ...adventurerChanges, retirementTriggered: true };
  }

  return {
    delta: { ...delta, ...adventurerChanges },
    eventId,
    resolvedAt: state.day || 0,
    moraleAdjustment,
  };
}

// ─── Tick Processor ───

/**
 * Deduct wages from state gold.
 * @param {Object} state — Current game state
 * @returns {{ deducted: number, remainingGold: number, unpaid: boolean }}
 */
export function deductWages(state) {
  const adventurers = state.adventurers || [];
  const guildLevel = (state.guildLevel || 1);
  const fame = state.fame || 0;

  const { totalWageBill } = calculateWageScale(adventurers, guildLevel, fame);
  const gold = state.gold ?? 0;

  if (totalWageBill === 0 || adventurers.length === 0) {
    return { deducted: 0, remainingGold: gold, unpaid: false };
  }

  const deducted = Math.min(totalWageBill, gold);
  const unpaid = deducted < totalWageBill;

  return { deducted, remainingGold: gold - deducted, unpaid };
}

/**
 * Check and adjust adventurer morale based on tick conditions.
 * @param {Object} state — Current game state
 * @param {number} tickCount — Number of ticks passed
 * @returns {{ adjustedAdventurers: Object[], moraleEvents: string[] }}
 */
export function checkMorale(state, tickCount) {
  const adventurers = state.adventurers || [];
  const guildLevel = (state.guildLevel || 1);
  const fame = state.fame || 0;
  const { totalWageBill } = calculateWageScale(adventurers, guildLevel, fame);
  const gold = state.gold ?? 0;

  const adjusted = adventurers.map(a => {
    let morale = a.morale;

    // Base morale decay: -1 per 10 ticks
    const baseDecay = Math.floor(tickCount / 10);
    morale -= baseDecay;

    // Low gold warning: -2 if gold < totalWageBill
    if (gold < totalWageBill && totalWageBill > 0) {
      morale -= 2;
    }

    return { ...a, morale: Math.max(0, Math.min(100, morale)) };
  });

  const events = [];
  if (gold < totalWageBill && totalWageBill > 0) {
    events.push(`Warning: insufficient gold for wages (${gold} < ${totalWageBill})`);
  }

  return { adjustedAdventurers: adjusted, moraleEvents: events };
}

/**
 * Check for adventurer departures (morale <= 0).
 * @param {Object} state — Current game state
 * @returns {{ departed: Object[], remaining: Object[] }}
 */
export function checkDepartures(state) {
  const adventurers = state.adventurers || [];
  const departed = [];
  const remaining = [];

  for (const adventurer of adventurers) {
    if (adventurer.morale <= 0) {
      departed.push(adventurer);
    } else {
      remaining.push(adventurer);
    }
  }

  return { departed, remaining };
}

/**
 * Process quest progress for active quests.
 * @param {Object} state — Current game state
 * @param {number} tickCount — Number of ticks passed
 * @returns {{ updatedQuests: Object[], completedQuests: Object[], failedQuests: Object[] }}
 */
export function processQuestProgress(state, tickCount) {
  const activeQuest = state.activeQuest;
  const quests = state.quests || [];

  if (!activeQuest || activeQuest.status !== 'active') {
    return { updatedQuests: quests, completedQuests: [], failedQuests: [] };
  }

  const quest = quests.find(q => q.id === activeQuest.questId);
  if (!quest) {
    return { updatedQuests: quests, completedQuests: [], failedQuests: [] };
  }

  // Advance quest progress: tickCount / difficulty
  const progress = (tickCount / quest.difficulty) * 10;

  // For simplicity, auto-complete after enough ticks
  const ticksNeeded = quest.difficulty * 10;
  const completed = state.questTickCount >= ticksNeeded;

  return {
    updatedQuests: quests,
    completedQuests: completed ? [quest] : [],
    failedQuests: [],
  };
}

/**
 * Process a game tick — main tick processor.
 * @param {Object} state — Current game state
 * @param {number} [tickCount=1] — Number of ticks to process
 * @returns {Object} Updated state
 */
export function processTick(state, tickCount = 1) {
  let newState = { ...state, day: state.day + tickCount };

  // Deduct wages
  const wages = deductWages(newState);
  newState = { ...newState, gold: wages.remainingGold };

  // Check morale
  const morale = checkMorale(newState, tickCount);
  newState = { ...newState, adventurers: morale.adjustedAdventurers };

  // Check departures
  const departures = checkDepartures(newState);
  newState = { ...newState, adventurers: departures.remaining };

  // Process quest progress
  const quests = processQuestProgress(newState, tickCount);
  newState = {
    ...newState,
    questTickCount: (newState.questTickCount || 0) + tickCount,
    activeQuest: quests.completedQuests.length > 0
      ? { ...newState.activeQuest, status: 'complete', result: { success: true } }
      : newState.activeQuest,
  };

  return newState;
}

// ─── Game Defaults ───

/**
 * Create a fresh game state with entity defaults.
 * @returns {Object} Initial game state
 */
export function gameDefaults() {
  return {
    gold: 0,
    day: 1,
    adventurers: [],
    quests: [],
    party: defaultParty([]),
    activeQuest: null,
    fame: 0,
    recruitmentPool: [],
    wageReserves: 0,
    lastWageDay: 0,
    // Progression tracking (Phase 3)
    questCount: 0,
    // Event system (Phase 3)
    events: [],
    eventCooldowns: {},
    // Event modifiers (Phase 3)
    wageMultiplier: 1,
    questRisk: 0,
    reputation: 0,
    favorDebt: 0,
  };
}

/**
 * Validate full game state shape.
 * @param {Object} state — Game state to validate
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateGame(state) {
  if (!Array.isArray(state.adventurers)) return { valid: false, reason: 'Missing adventurers array' };
  if (!Array.isArray(state.quests)) return { valid: false, reason: 'Missing quests array' };
  if (!state.party || typeof state.party !== 'object') return { valid: false, reason: 'Missing party object' };
  // Events array is optional (for saves from before Phase 3)
  if (state.events !== undefined && !Array.isArray(state.events)) return { valid: false, reason: 'events must be an array' };
  return { valid: true };
}
