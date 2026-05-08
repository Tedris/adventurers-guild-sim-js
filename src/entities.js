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
        wage += tierIndex; // Common=0, Uncommon=1, Rare=2, Epic=3
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
      weapon: null,
      armor: null,
      accessory: null,
    },
    morale: Math.max(0, Math.min(100, overrides.morale ?? DEFAULT_MORALE)),
    origin: overrides.origin || VALID_ORIGINS[Math.floor(Math.random() * VALID_ORIGINS.length)],
    personality: overrides.personality || { traits: [] },
    level: overrides.level ?? 1,
    experience: overrides.experience ?? 0,
    rank: 'Novice',
    aptitudes: {},
    wage: 0,
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
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateParty(adventurerIds) {
  if (adventurerIds.length < MIN_PARTY_SIZE) return { valid: false, reason: `Party too small: ${adventurerIds.length} < ${MIN_PARTY_SIZE}` };
  if (adventurerIds.length > MAX_PARTY_SIZE) return { valid: false, reason: `Party too large: ${adventurerIds.length} > ${MAX_PARTY_SIZE}` };
  return { valid: true };
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
