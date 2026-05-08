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

  return classAptitudes[adventurer.class] || {};
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
    name: overrides.name || 'Unnamed Adventurer',
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
    personality: overrides.personality || { traits: [] },
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
 * Generate a pool of quest templates.
 * @param {number} [count=3] — Number of quests to generate
 * @returns {Object[]} Array of quest templates
 */
export function generateQuestPool(count = 3) {
  const templates = [
    // Easy quests (difficulty 1-2)
    { name: 'Scout the nearby forest', difficulty: 1, requirements: { minStats: { str: 5, dex: 5, int: 5, vit: 5, lck: 5 }, preferredClasses: ['Sword', 'Bow'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 15, experience: 25 }, description: 'Reconnaissance mission in the nearby forest.' },
    { name: 'Clear rat infestation', difficulty: 1, requirements: { minStats: { str: 4, dex: 4, int: 3, vit: 4, lck: 3 }, preferredClasses: ['Sword', 'Dagger'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 10, experience: 20 }, description: 'The town needs rats cleared from the cellar.' },
    { name: 'Deliver messages to border village', difficulty: 2, requirements: { minStats: { str: 5, dex: 6, int: 4, vit: 5, lck: 5 }, preferredClasses: ['Bow', 'Wand'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 20, experience: 30 }, description: 'Urgent message delivery to a distant village.' },
    // Medium quests (difficulty 3-4)
    { name: 'Hunt bandits on the highway', difficulty: 3, requirements: { minStats: { str: 8, dex: 7, int: 5, vit: 7, lck: 6 }, preferredClasses: ['Sword', 'Axe'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 40, experience: 50 }, description: 'Bandits have been plundering merchant caravans.' },
    { name: 'Explore the abandoned mine', difficulty: 3, requirements: { minStats: { str: 7, dex: 6, int: 8, vit: 6, lck: 7 }, preferredClasses: ['Staff', 'Shield'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 45, experience: 55 }, description: 'An old mine has been emitting strange noises.' },
    { name: 'Escort merchant caravan', difficulty: 4, requirements: { minStats: { str: 9, dex: 8, int: 6, vit: 9, lck: 7 }, preferredClasses: ['Shield', 'Sword'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 55, experience: 60 }, description: 'Protect a valuable merchant caravan through dangerous territory.' },
    // Hard quests (difficulty 5)
    { name: 'Slay the dragon', difficulty: 5, requirements: { minStats: { str: 15, dex: 12, int: 10, vit: 14, lck: 12 }, preferredClasses: ['Sword', 'Axe', 'Mace'], minPartySize: 1, maxPartySize: 3 }, rewards: { gold: 100, experience: 120 }, description: 'A dragon has taken up residence in the mountain. Only the bravest dare attempt this.' },
    { name: 'Infiltrate the rival guild', difficulty: 5, requirements: { minStats: { str: 10, dex: 14, int: 12, vit: 10, lck: 13 }, preferredClasses: ['Dagger', 'Bow'], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 90, experience: 110 }, description: 'The rival guild has been poaching your adventurers. Infiltrate and expose them.' },
  ];

  // Select 'count' quests, cycling through difficulty tiers
  const selected = [];
  for (let i = 0; i < count; i++) {
    const template = templates[i % templates.length];
    selected.push({ ...template, id: crypto.randomUUID() });
  }
  return selected;
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
  return { valid: true };
}
