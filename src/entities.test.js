// Adventurers Guild Simulator — Entity Tests (RED)
// Tests for entity models: Adventurer, Quest, Party

const assert = (condition, msg) => {
  if (!condition) throw new Error(msg || 'assertion failed');
};

let testsRun = 0;
let testsPassed = 0;

const test = (name, fn) => {
  testsRun++;
  try { fn(); testsPassed++; console.log(`✓ ${name}`); }
  catch(e) { console.log(`✗ ${name}: ${e.message}`); }
};

// Import entity module
import('./entities.js').then((module) => {
  const {
    defaultAdventurer,
    defaultQuest,
    defaultParty,
    adventurerSchema,
    validateAdventurer,
    validateParty,
    VALID_CLASSES,
    VALID_ORIGINS,
  } = module;

  // --- Tests for defaultAdventurer ---

  test('defaultAdventurer returns object with all required fields', () => {
    const a = defaultAdventurer();
    assert(a.id !== undefined, 'adventurer must have id');
    assert(typeof a.name === 'string', 'adventurer must have name');
    assert(typeof a.class === 'string', 'adventurer must have class');
    assert(typeof a.stats === 'object', 'adventurer must have stats');
    assert(typeof a.equipment === 'object', 'adventurer must have equipment');
    assert(typeof a.morale === 'number', 'adventurer must have morale');
    assert(typeof a.origin === 'string', 'adventurer must have origin');
    assert(typeof a.personality === 'object', 'adventurer must have personality');
    assert(typeof a.level === 'number', 'adventurer must have level');
    assert(typeof a.experience === 'number', 'adventurer must have experience');
  });

  test('defaultAdventurer sets defaults correctly', () => {
    const a = defaultAdventurer();
    assert(a.level === 1, `level should default to 1, got ${a.level}`);
    assert(a.experience === 0, `experience should default to 0, got ${a.experience}`);
    assert(a.morale === 70, `morale should default to 70, got ${a.morale}`);
    assert(a.equipment.weapon === null, 'weapon should default to null');
    assert(a.equipment.armor === null, 'armor should default to null');
    assert(a.equipment.accessory === null, 'accessory should default to null');
  });

  test('defaultAdventurer accepts overrides', () => {
    const a = defaultAdventurer({ name: 'Grimshaw', class: 'Sword', morale: 50, level: 3, experience: 100 });
    assert(a.name === 'Grimshaw', `name override failed: ${a.name}`);
    assert(a.class === 'Sword', `class override failed: ${a.class}`);
    assert(a.morale === 50, `morale override failed: ${a.morale}`);
    assert(a.level === 3, `level override failed: ${a.level}`);
    assert(a.experience === 100, `experience override failed: ${a.experience}`);
  });

  test('adventurer stats contain all five attributes', () => {
    const a = defaultAdventurer();
    assert('str' in a.stats, 'stats must have str');
    assert('dex' in a.stats, 'stats must have dex');
    assert('int' in a.stats, 'stats must have int');
    assert('vit' in a.stats, 'stats must have vit');
    assert('lck' in a.stats, 'stats must have lck');
  });

  // --- Tests for defaultQuest ---

  test('defaultQuest returns object with all required fields', () => {
    const q = defaultQuest();
    assert(q.id !== undefined, 'quest must have id');
    assert(typeof q.name === 'string', 'quest must have name');
    assert(typeof q.difficulty === 'number', 'quest must have difficulty');
    assert(typeof q.requirements === 'object', 'quest must have requirements');
    assert(typeof q.rewards === 'object', 'quest must have rewards');
    assert(typeof q.description === 'string', 'quest must have description');
  });

  test('defaultQuest sets defaults correctly', () => {
    const q = defaultQuest();
    assert(q.difficulty === 1, `difficulty should default to 1, got ${q.difficulty}`);
    assert(typeof q.requirements.minStats === 'object', 'must have minStats');
    assert(typeof q.rewards.gold === 'number', 'must have gold reward');
    assert(typeof q.rewards.experience === 'number', 'must have xp reward');
  });

  // --- Tests for defaultParty ---

  test('defaultParty returns object with all required fields', () => {
    const p = defaultParty();
    assert(p.id !== undefined, 'party must have id');
    assert(Array.isArray(p.adventurerIds), 'party must have adventurerIds array');
    assert(typeof p.synergyScore === 'number', 'party must have synergyScore');
  });

  test('defaultParty caps at 3 adventurers', () => {
    const ids = ['a1', 'a2', 'a3', 'a4'];
    const p = defaultParty(ids);
    assert(p.adventurerIds.length <= 3, `party should cap at 3, got ${p.adventurerIds.length}`);
  });

  // --- Tests for validateAdventurer ---

  test('adventurerSchema / validateAdventurer accepts a valid adventurer', () => {
    const a = defaultAdventurer();
    const result = validateAdventurer(a);
    assert(result.valid === true, `valid adventurer should pass: ${JSON.stringify(result)}`);
  });

  test('adventurerSchema / validateAdventurer rejects missing id field', () => {
    const a = defaultAdventurer();
    delete a.id;
    const result = validateAdventurer(a);
    assert(result.valid === false, 'should reject missing id');
  });

  test('adventurerSchema / validateAdventurer rejects missing class field', () => {
    const a = defaultAdventurer();
    delete a.class;
    const result = validateAdventurer(a);
    assert(result.valid === false, 'should reject missing class');
  });

  test('adventurerSchema / validateAdventurer rejects invalid class', () => {
    const a = defaultAdventurer();
    a.class = 'Dragon';
    const result = validateAdventurer(a);
    assert(result.valid === false, 'should reject invalid class');
  });

  test('adventurerSchema / validateAdventurer rejects out-of-range stats', () => {
    const a = defaultAdventurer();
    a.stats.str = 25;
    const result = validateAdventurer(a);
    assert(result.valid === false, 'should reject stat out of range');
  });

  test('adventurerSchema / validateAdventurer rejects morale out of range (negative)', () => {
    const a = defaultAdventurer();
    a.morale = -10;
    const result = validateAdventurer(a);
    assert(result.valid === false, 'should reject negative morale');
  });

  test('adventurerSchema / validateAdventurer rejects morale out of range (above 100)', () => {
    const a = defaultAdventurer();
    a.morale = 150;
    const result = validateAdventurer(a);
    assert(result.valid === false, 'should reject morale above 100');
  });

  // --- Tests for validateParty ---

  test('validateParty accepts party of 2 adventurers', () => {
    const result = validateParty(['a1', 'a2']);
    assert(result.valid === true, 'party of 2 should be valid');
  });

  test('validateParty accepts party of 3 adventurers', () => {
    const result = validateParty(['a1', 'a2', 'a3']);
    assert(result.valid === true, 'party of 3 should be valid');
  });

  test('validateParty rejects party too small (0)', () => {
    const result = validateParty([]);
    assert(result.valid === false, 'empty party should be rejected');
  });

  test('validateParty rejects party too large (4)', () => {
    const result = validateParty(['a1', 'a2', 'a3', 'a4']);
    assert(result.valid === false, 'party of 4 should be rejected');
  });

  // Print summary
  console.log(`\n${testsPassed}/${testsRun} tests passed`);
  if (testsPassed < testsRun) process.exit(1);
});
