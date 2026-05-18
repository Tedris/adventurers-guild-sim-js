// Adventurers Guild Simulator — Quest Templates Tests (Phase 11-01)
// Tests for the 6 new quest templates: 3 Defense + 3 Social archetypes

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

import('./entities/index.js').then((module) => {
  const {
    QUEST_TEMPLATES,
    VALID_CLASSES,
    VALID_DIFFICULTIES,
    getFameGatedQuestPool,
    generateQuestPool,
    perturbQuest,
  } = module;

  const ECONOMY_TARGETS = {
    1: { gold: [10, 15], xp: [20, 25] },
    2: { gold: [20, 35], xp: [30, 40] },
    3: { gold: [40, 50], xp: [50, 55] },
    4: { gold: [55, 70], xp: [60, 80] },
    5: { gold: [90, 100], xp: [110, 120] },
  };

  // --- New Quest Templates (Phase 11) ---

  test('QUEST_TEMPLATES has exactly 21 entries (15 original + 6 new)', () => {
    assert(QUEST_TEMPLATES.length === 21, `expected 21 templates, got ${QUEST_TEMPLATES.length}`);
  });

  // Defense archetype quests

  test('QUEST_TEMPLATES contains "Reinforce the watchtower" at difficulty 2', () => {
    const q = QUEST_TEMPLATES.find(t => t.name === 'Reinforce the watchtower');
    assert(q, 'must contain "Reinforce the watchtower"');
    assert(q.difficulty === 2, `difficulty should be 2, got ${q.difficulty}`);
    assert(q.description.includes('watchtower'), 'description should reference watchtower');
  });

  test('QUEST_TEMPLATES contains "Hold the mountain pass" at difficulty 3', () => {
    const q = QUEST_TEMPLATES.find(t => t.name === 'Hold the mountain pass');
    assert(q, 'must contain "Hold the mountain pass"');
    assert(q.difficulty === 3, `difficulty should be 3, got ${q.difficulty}`);
    assert(q.description.includes('mountain pass'), 'description should reference mountain pass');
  });

  test('QUEST_TEMPLATES contains "Fortify the frontier settlement" at difficulty 4', () => {
    const q = QUEST_TEMPLATES.find(t => t.name === 'Fortify the frontier settlement');
    assert(q, 'must contain "Fortify the frontier settlement"');
    assert(q.difficulty === 4, `difficulty should be 4, got ${q.difficulty}`);
    assert(q.description.includes('frontier'), 'description should reference frontier');
  });

  // Social archetype quests

  test('QUEST_TEMPLATES contains "Organize the harvest festival" at difficulty 2', () => {
    const q = QUEST_TEMPLATES.find(t => t.name === 'Organize the harvest festival');
    assert(q, 'must contain "Organize the harvest festival"');
    assert(q.difficulty === 2, `difficulty should be 2, got ${q.difficulty}`);
    assert(q.description.includes('harvest'), 'description should reference harvest');
  });

  test('QUEST_TEMPLATES contains "Establish the trade guild" at difficulty 3', () => {
    const q = QUEST_TEMPLATES.find(t => t.name === 'Establish the trade guild');
    assert(q, 'must contain "Establish the trade guild"');
    assert(q.difficulty === 3, `difficulty should be 3, got ${q.difficulty}`);
    assert(q.description.includes('trade'), 'description should reference trade');
  });

  test('QUEST_TEMPLATES contains "Negotiate the regional alliance" at difficulty 4', () => {
    const q = QUEST_TEMPLATES.find(t => t.name === 'Negotiate the regional alliance');
    assert(q, 'must contain "Negotiate the regional alliance"');
    assert(q.difficulty === 4, `difficulty should be 4, got ${q.difficulty}`);
    assert(q.description.includes('alliance'), 'description should reference alliance');
  });

  // Defense archetype: class preferences lean combat

  test('Defense quests prefer combat classes (Sword/Shield/Axe/Mace)', () => {
    const defenseNames = [
      'Reinforce the watchtower',
      'Hold the mountain pass',
      'Fortify the frontier settlement',
    ];
    const combatClasses = ['Sword', 'Shield', 'Axe', 'Mace'];
    for (const name of defenseNames) {
      const q = QUEST_TEMPLATES.find(t => t.name === name);
      assert(q, `must find ${name}`);
      for (const cls of q.requirements.preferredClasses) {
        assert(combatClasses.includes(cls), `${name} has non-combat class "${cls}"`);
      }
      assert(q.requirements.preferredClasses.length >= 2, `${name} should have >= 2 preferred classes`);
    }
  });

  // Social archetype: class preferences lean support

  test('Social quests prefer support classes (Wand/Staff/Shield)', () => {
    const socialNames = [
      'Organize the harvest festival',
      'Establish the trade guild',
      'Negotiate the regional alliance',
    ];
    const supportClasses = ['Wand', 'Staff', 'Shield'];
    for (const name of socialNames) {
      const q = QUEST_TEMPLATES.find(t => t.name === name);
      assert(q, `must find ${name}`);
      for (const cls of q.requirements.preferredClasses) {
        assert(supportClasses.includes(cls), `${name} has non-support class "${cls}"`);
      }
      assert(q.requirements.preferredClasses.length >= 2, `${name} should have >= 2 preferred classes`);
    }
  });

  // Party size constraints

  test('Defense quest "Reinforce the watchtower" allows solo (minPartySize: 1)', () => {
    const q = QUEST_TEMPLATES.find(t => t.name === 'Reinforce the watchtower');
    assert(q, 'must find template');
    assert(q.requirements.minPartySize === 1, `minPartySize should be 1, got ${q.requirements.minPartySize}`);
    assert(q.requirements.maxPartySize === 3, `maxPartySize should be 3, got ${q.requirements.maxPartySize}`);
  });

  test('Defense/Social quests at diff 3-4 require party of 2-3', () => {
    const partyQuestNames = [
      'Hold the mountain pass',
      'Fortify the frontier settlement',
      'Establish the trade guild',
      'Negotiate the regional alliance',
    ];
    for (const name of partyQuestNames) {
      const q = QUEST_TEMPLATES.find(t => t.name === name);
      assert(q, `must find ${name}`);
      assert(q.requirements.minPartySize === 2, `${name}: minPartySize should be 2, got ${q.requirements.minPartySize}`);
      assert(q.requirements.maxPartySize === 3, `${name}: maxPartySize should be 3, got ${q.requirements.maxPartySize}`);
    }
  });

  // Stat requirements: Defense quests lean str/vit, Social lean int/lck

  test('Defense quests have higher str/vit than int/lck', () => {
    const defenseNames = [
      'Reinforce the watchtower',
      'Hold the mountain pass',
      'Fortify the frontier settlement',
    ];
    for (const name of defenseNames) {
      const q = QUEST_TEMPLATES.find(t => t.name === name);
      const { str, vit, int: intel, lck } = q.requirements.minStats;
      assert(str >= intel, `${name}: str (${str}) should be >= int (${intel})`);
      assert(vit >= lck, `${name}: vit (${vit}) should be >= lck (${lck})`);
    }
  });

  test('Social quests have higher int/lck than str/vit', () => {
    const socialNames = [
      'Organize the harvest festival',
      'Establish the trade guild',
      'Negotiate the regional alliance',
    ];
    for (const name of socialNames) {
      const q = QUEST_TEMPLATES.find(t => t.name === name);
      const { str, int: intel, vit, lck } = q.requirements.minStats;
      assert(intel >= str, `${name}: int (${intel}) should be >= str (${str})`);
      assert(lck >= vit, `${name}: lck (${lck}) should be >= vit (${vit})`);
    }
  });

  // Reward economy validation

  test('New quests rewards fall within ECONOMY_TARGETS per difficulty', () => {
    const newTemplates = [
      { name: 'Reinforce the watchtower', diff: 2, gold: 27, xp: 35 },
      { name: 'Hold the mountain pass', diff: 3, gold: 45, xp: 52 },
      { name: 'Fortify the frontier settlement', diff: 4, gold: 62, xp: 70 },
      { name: 'Organize the harvest festival', diff: 2, gold: 28, xp: 35 },
      { name: 'Establish the trade guild', diff: 3, gold: 45, xp: 53 },
      { name: 'Negotiate the regional alliance', diff: 4, gold: 63, xp: 70 },
    ];
    for (const expected of newTemplates) {
      const q = QUEST_TEMPLATES.find(t => t.name === expected.name);
      assert(q, `must find ${expected.name}`);
      assert(q.difficulty === expected.diff, `${expected.name}: difficulty ${q.difficulty} should be ${expected.diff}`);

      const target = ECONOMY_TARGETS[expected.diff];
      assert(target, `no economy target for difficulty ${expected.diff}`);
      assert(q.rewards.gold >= target.gold[0] && q.rewards.gold <= target.gold[1],
        `${expected.name}: gold ${q.rewards.gold} outside [${target.gold[0]}, ${target.gold[1]}]`);
      assert(q.rewards.experience >= target.xp[0] && q.rewards.experience <= target.xp[1],
        `${expected.name}: xp ${q.rewards.experience} outside [${target.xp[0]}, ${target.xp[1]}]`);
    }
  });

  test('perturbQuest on new templates produces rewards within ±10% margin', () => {
    const newNames = [
      'Reinforce the watchtower',
      'Hold the mountain pass',
      'Fortify the frontier settlement',
      'Organize the harvest festival',
      'Establish the trade guild',
      'Negotiate the regional alliance',
    ];
    for (const name of newNames) {
      const t = QUEST_TEMPLATES.find(q => q.name === name);
      assert(t, `must find ${name}`);
      const baseGold = t.rewards.gold;
      const baseXP = t.rewards.experience;
      for (let i = 0; i < 30; i++) {
        const perturbed = perturbQuest(t);
        assert(perturbed.rewards.gold >= Math.floor(baseGold * 0.9) && perturbed.rewards.gold <= Math.ceil(baseGold * 1.1),
          `${name}: perturbed gold ${perturbed.rewards.gold} outside ±10% of ${baseGold}`);
        assert(perturbed.rewards.experience >= Math.floor(baseXP * 0.9) && perturbed.rewards.experience <= Math.ceil(baseXP * 1.1),
          `${name}: perturbed xp ${perturbed.rewards.experience} outside ±10% of ${baseXP}`);
      }
    }
  });

  // Fame gating: new templates should appear in fame-gated pool

  test('getFameGatedQuestPool with fame=25 includes diff-2 new templates', () => {
    const newNames = ['Reinforce the watchtower', 'Organize the harvest festival'];
    let found = false;
    // Run 50 trials to account for randomness
    for (let i = 0; i < 50; i++) {
      const result = getFameGatedQuestPool({ fame: 25 }, 6);
      if (result.some(q => newNames.includes(q.name))) { found = true; break; }
    }
    assert(found, 'fame=25 pool should occasionally include diff-2 new templates (ran 50 trials)');
  });

  test('getFameGatedQuestPool with fame=50 includes diff-3 new templates', () => {
    const newNames = ['Hold the mountain pass', 'Establish the trade guild'];
    let found = false;
    for (let i = 0; i < 50; i++) {
      const result = getFameGatedQuestPool({ fame: 50 }, 10);
      if (result.some(q => newNames.includes(q.name))) { found = true; break; }
    }
    assert(found, 'fame=50 pool should occasionally include diff-3 new templates (ran 50 trials)');
  });

 test('getFameGatedQuestPool with fame=75 includes diff-4 new templates', () => {
    const newNames = ['Fortify the frontier settlement', 'Negotiate the regional alliance'];
    let found = false;
    for (let i = 0; i < 50; i++) {
      const result = getFameGatedQuestPool({ fame: 75 }, 15);
      if (result.some(q => newNames.includes(q.name))) { found = true; break; }
    }
    assert(found, 'fame=75 pool should occasionally include diff-4 new templates (ran 50 trials)');
  });

  test('generateQuestPool includes new templates in random selection', () => {
    const newNames = [
      'Reinforce the watchtower',
      'Hold the mountain pass',
      'Fortify the frontier settlement',
      'Organize the harvest festival',
      'Establish the trade guild',
      'Negotiate the regional alliance',
    ];
    const allNames = new Set(newNames);
    // Over 100 pool generations, all 6 new templates should appear at least once
    const found = new Set();
    for (let run = 0; run < 100; run++) {
      const pool = generateQuestPool(10);
      for (const q of pool) {
        if (allNames.has(q.name)) found.add(q.name);
      }
    }
    assert(found.size >= 4, `should find at least 4 of 6 new templates in 100 runs, found ${found.size}: [${[...found].join(', ')}]`);
  });

  // All preferredClasses are valid

  test('All new templates use valid preferredClasses', () => {
    const newNames = [
      'Reinforce the watchtower',
      'Hold the mountain pass',
      'Fortify the frontier settlement',
      'Organize the harvest festival',
      'Establish the trade guild',
      'Negotiate the regional alliance',
    ];
    for (const name of newNames) {
      const q = QUEST_TEMPLATES.find(t => t.name === name);
      assert(q, `must find ${name}`);
      for (const cls of q.requirements.preferredClasses) {
        assert(VALID_CLASSES.includes(cls), `${name}: class "${cls}" not in VALID_CLASSES`);
      }
    }
  });

  // All new templates are QuestTemplate shape

  test('All new templates have required QuestTemplate fields', () => {
    const newNames = [
      'Reinforce the watchtower',
      'Hold the mountain pass',
      'Fortify the frontier settlement',
      'Organize the harvest festival',
      'Establish the trade guild',
      'Negotiate the regional alliance',
    ];
    for (const name of newNames) {
      const t = QUEST_TEMPLATES.find(q => q.name === name);
      assert(t, `must find ${name}`);
      assert(typeof t.name === 'string', `${name} name must be string`);
      assert(VALID_DIFFICULTIES.includes(t.difficulty), `${name} difficulty ${t.difficulty} must be valid`);
      assert(typeof t.requirements === 'object', `${name} must have requirements`);
      assert(typeof t.requirements.minStats === 'object', `${name} must have minStats`);
      assert(Array.isArray(t.requirements.preferredClasses), `${name} must have preferredClasses`);
      assert(typeof t.requirements.minPartySize === 'number', `${name} must have minPartySize`);
      assert(typeof t.requirements.maxPartySize === 'number', `${name} must have maxPartySize`);
      assert(typeof t.rewards === 'object', `${name} must have rewards`);
      assert(typeof t.rewards.gold === 'number', `${name} rewards.gold must be number`);
      assert(typeof t.rewards.experience === 'number', `${name} rewards.experience must be number`);
      assert(typeof t.description === 'string', `${name} description must be string`);
    }
  });

  console.log(`\n${testsPassed}/${testsRun} tests passed`);
  if (testsPassed < testsRun) process.exit(1);
});
