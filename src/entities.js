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
