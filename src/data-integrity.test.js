// Adventurers Guild Simulator — Data Integrity & Economy Tests
// =========================================================
// Validates data consistency, economy bounds, and serialization safety.

const assert = (condition, msg) => {
  if (!condition) throw new Error(msg || 'assertion failed');
};

let testsRun = 0;
let testsPassed = 0;

const test = (name, fn) => {
  testsRun++;
  try {
    fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
  }
};

const ECONOMY_TARGETS = {
  1: { gold: [10, 15], xp: [20, 25] },
  2: { gold: [20, 35], xp: [30, 40] },
  3: { gold: [40, 50], xp: [50, 55] },
  4: { gold: [55, 70], xp: [60, 80] },
  5: { gold: [90, 100], xp: [110, 120] },
};

const MARGIN = 0.15; // 15% allowance for perturbations and fuzzy bounds

import('./entities/index.js').then((module) => {
  const {
    VALID_CLASSES,
    CLASS_APTITUDES,
    VALID_PERSONALITY_TRAITS,
    PERSONALITY_TRAIT_TABLE,
    VALID_DIFFICULTIES,
    QUEST_TEMPLATES,
    perturbQuest,
    EVENT_TEMPLATES,
    VALID_EVENT_CATEGORIES,
    gameDefaults,
  } = module;

  console.log('\n--- Consistency Tests ---');

  test('CLASS_APTITUDES covers all VALID_CLASSES', () => {
    for (const className of VALID_CLASSES) {
      assert(className in CLASS_APTITUDES, `Missing aptitude definition for class: ${className}`);
    }
  });

  test('PERSONALITY_TRAIT_TABLE matches VALID_PERSONALITY_TRAITS exactly', () => {
    const tableKeys = Object.keys(PERSONALITY_TRAIT_TABLE);
    assert(tableKeys.length === VALID_PERSONALITY_TRAITS.length, 'Table size mismatch');
    for (const trait of VALID_PERSONALITY_TRAITS) {
      assert(trait in PERSONALITY_TRAIT_TABLE, `Missing trait in table: ${trait}`);
    }
  });

  test('QUEST_TEMPLATES use valid difficulties', () => {
    for (const template of QUEST_TEMPLATES) {
      assert(VALID_DIFFICULTIES.includes(template.difficulty), `Invalid difficulty ${template.difficulty} in ${template.name}`);
    }
  });

  test('EVENT_TEMPLATES use valid categories', () => {
    for (const template of EVENT_TEMPLATES) {
      assert(VALID_EVENT_CATEGORIES.includes(template.category), `Invalid category ${template.category} in ${template.id}`);
    }
  });

  test('LEGACY_PERKS are consistent with classes and ranks', () => {
    const { LEGACY_PERKS, VALID_RANKS } = module;
    for (const perk of LEGACY_PERKS) {
      assert(VALID_RANKS.includes(perk.minRank), `Invalid rank ${perk.minRank} in perk ${perk.id}`);
      for (const cls of perk.allowedClasses) {
        assert(VALID_CLASSES.includes(cls), `Invalid class ${cls} in perk ${perk.id}`);
      }
    }
  });

  test('CLASS_EVOLUTIONS are consistent with classes and ranks', () => {
    const { CLASS_EVOLUTIONS, VALID_RANKS } = module;
    for (const evo of CLASS_EVOLUTIONS) {
      assert(VALID_RANKS.includes(evo.minRank), `Invalid rank ${evo.minRank} in evolution ${evo.result}`);
      if (evo.requires.weapon) assert(VALID_CLASSES.includes(evo.requires.weapon), `Invalid weapon class ${evo.requires.weapon} in ${evo.result}`);
      if (evo.requires.armor) assert(VALID_CLASSES.includes(evo.requires.armor), `Invalid armor class ${evo.requires.armor} in ${evo.result}`);
      if (evo.requires.accessory) assert(VALID_CLASSES.includes(evo.requires.accessory), `Invalid accessory class ${evo.requires.accessory} in ${evo.result}`);
    }
  });

  console.log('\n--- Economy & Reward Tests ---');

  test('QUEST_TEMPLATES rewards fall within target ranges', () => {
    for (const template of QUEST_TEMPLATES) {
      const target = ECONOMY_TARGETS[template.difficulty];
      assert(target, `No economy target for difficulty ${template.difficulty}`);

      const { gold, experience: xp } = template.rewards;
      assert(gold >= target.gold[0] && gold <= target.gold[1],
        `Gold reward ${gold} for ${template.name} (Diff ${template.difficulty}) outside target [${target.gold[0]}, ${target.gold[1]}]`);
      assert(xp >= target.xp[0] && xp <= target.xp[1],
        `XP reward ${xp} for ${template.name} (Diff ${template.difficulty}) outside target [${target.xp[0]}, ${target.xp[1]}]`);
    }
  });

  test('perturbQuest rewards stay within 15% margin of target ranges', () => {
    for (const template of QUEST_TEMPLATES) {
      const target = ECONOMY_TARGETS[template.difficulty];

      for (let i = 0; i < 50; i++) {
        const perturbed = perturbQuest(template);
        const { gold, experience: xp } = perturbed.rewards;

        const goldMin = Math.floor(target.gold[0] * (1 - MARGIN));
        const goldMax = Math.ceil(target.gold[1] * (1 + MARGIN));
        const xpMin = Math.floor(target.xp[0] * (1 - MARGIN));
        const xpMax = Math.ceil(target.xp[1] * (1 + MARGIN));

        assert(gold >= goldMin && gold <= goldMax,
          `Perturbed gold ${gold} for ${template.name} outside margin-allowed range [${goldMin}, ${goldMax}]`);
        assert(xp >= xpMin && xp <= xpMax,
          `Perturbed XP ${xp} for ${template.name} outside margin-allowed range [${xpMin}, ${xpMax}]`);
      }
    }
  });

  console.log('\n--- Serialization Tests ---');

  test('gameDefaults() is safe for structuredClone (no functions/circularity)', () => {
    const state = gameDefaults();
    try {
      const clone = structuredClone(state);
      assert(clone.gold === state.gold, 'Gold value mismatch after clone');
      assert(clone.adventurers.length === state.adventurers.length, 'Adventurer count mismatch');
      assert(clone.party.adventurerIds.length === state.party.adventurerIds.length, 'Party member mismatch');
    } catch (e) {
      assert(false, `structuredClone failed: ${e.message}`);
    }
  });

  test('Initial adventurers have valid structure after cloning', () => {
    const state = gameDefaults();
    const clone = structuredClone(state);
    const gm = clone.adventurers.find(a => a.isGuildMaster);
    assert(gm, 'Guild Master missing after clone');
    assert(typeof gm.stats === 'object', 'Stats should be an object');
    assert(typeof gm.personality === 'object', 'Personality should be an object');
  });

  console.log(`\n${testsPassed}/${testsRun} tests passed`);
  if (testsPassed < testsRun) process.exit(1);
});
