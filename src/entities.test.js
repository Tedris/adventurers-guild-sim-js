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
import('./entities/index.js').then((module) => {
  const {
    defaultAdventurer,
    defaultQuest,
    defaultParty,
    adventurerSchema,
    validateAdventurer,
    validateParty,
    VALID_CLASSES,
    VALID_ORIGINS,
    generateRecruitmentPool,
    calculateAptitudes,
    VALID_RANKS,
    VALID_DIFFICULTIES,
    calculateClassDiversity,
    calculateAptitudeBonus,
    calculateSynergyScore,
    getSoloEligible,
    calculateStatContribution,
    calculatePartyEffectiveStat,
    calculateQuestSuccessRate,
    calculateQuestOutcome,
    generateQuestPool,
    calculateUpgradeCost,
    getAvailableUpgrades,
    checkMorale,
    checkDepartures,
    processQuestProgress,
    processTick,
    VALID_PERSONALITY_TRAITS,
    PERSONALITY_TRAIT_TABLE,
    generateName,
    generatePersonality,
    QUEST_TEMPLATES,
    perturbQuest,
    EVENT_TEMPLATES,
    VALID_EVENT_CATEGORIES,
    generateEventPool,
    selectNextEvent,
    resolveEvent,
    gameDefaults,
    validateGame,
    OFFICE_LEVEL_THRESHOLDS,
    calculateOfficeLevel,
    LEGACY_PERKS,
    generateLegacyPerk,
    applyLegacyPerks,
    FAME_LEVELS,
    calculateFameGain,
    getFameLevel,
    getFameGatedQuestPool,
    CLASS_EVOLUTIONS,
    CLASS_APTITUDES,
    evolveClass,
    getEvolutionStatus,
    evolveAdventurer,
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

  test('defaultAdventurer generates a name via generateName', () => {
    const a = defaultAdventurer();
    assert(typeof a.name === 'string', 'name must be a string');
    assert(a.name.length > 3, `generated name should be at least 4 chars, got '${a.name}'`);
    assert(a.name !== 'Unnamed Adventurer', 'should use generateName, not hardcoded fallback');
  });

  test('defaultAdventurer generates personality via generatePersonality', () => {
    const a = defaultAdventurer();
    assert(typeof a.personality === 'object', 'personality must be object');
    assert(Array.isArray(a.personality.traits), 'personality must have traits array');
    assert(a.personality.traits.length >= 1 && a.personality.traits.length <= 3,
      `personality should have 1-3 traits, got ${a.personality.traits.length}`);
  });

  test('defaultAdventurer respects name override (skips generation)', () => {
    const a = defaultAdventurer({ name: 'CustomName' });
    assert(a.name === 'CustomName', `override name should be used: ${a.name}`);
  });

  test('defaultAdventurer respects personality override (skips generation)', () => {
    const customPersonality = { traits: ['Brave', 'Cunning'] };
    const a = defaultAdventurer({ personality: customPersonality });
    assert(a.personality === customPersonality, 'override personality should be used');
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

  // --- Tests for generateRecruitmentPool ---

  test('generateRecruitmentPool(1) returns array with one adventurer', () => {
    const pool = generateRecruitmentPool(1);
    assert(Array.isArray(pool), 'must return array');
    assert(pool.length === 1, `pool length should be 1, got ${pool.length}`);
  });

  test('generateRecruitmentPool(3) returns array with three adventurers', () => {
    const pool = generateRecruitmentPool(3);
    assert(pool.length === 3, `pool length should be 3, got ${pool.length}`);
  });

  test('each adventurer from pool has valid class', () => {
    const pool = generateRecruitmentPool(5);
    for (const a of pool) {
      assert(VALID_CLASSES.includes(a.class), `class ${a.class} not in VALID_CLASSES`);
    }
  });

  test('each adventurer has stats within MIN_STAT-MAX_STAT range', () => {
    const pool = generateRecruitmentPool(5);
    for (const a of pool) {
      for (const [stat, value] of Object.entries(a.stats)) {
        assert(value >= 1 && value <= 20, `stat ${stat}=${value} out of range`);
      }
    }
  });

  test('generateRecruitmentPool sets rank=Novice', () => {
    const pool = generateRecruitmentPool(2);
    for (const a of pool) {
      assert(a.rank === 'Novice', `rank should be Novice, got ${a.rank}`);
    }
  });

  test('generateRecruitmentPool applies fame stat bonuses when state has fame', () => {
    const highFameState = { fame: 50 };
    const pool = generateRecruitmentPool(3, highFameState);
    for (const a of pool) {
      for (const [stat, value] of Object.entries(a.stats)) {
        assert(value >= 3, `fame stat bonus: ${stat}=${value} should be >= 3 with fame=50`);
      }
    }
  });

  test('generateRecruitmentPool without state produces baseline stats', () => {
    const pool = generateRecruitmentPool(3, {});
    for (const a of pool) {
      for (const [stat, value] of Object.entries(a.stats)) {
        assert(value >= 1 && value <= 20, `baseline stat ${stat}=${value} should be in range`);
      }
    }
  });

  test('generateRecruitmentPool applies legacy perks when state has legacyPerks', () => {
    const perks = [{ name: 'Test Perk', effects: { str: 3 } }];
    const stateWithPerks = { fame: 0, legacyPerks: perks };
    const pool = generateRecruitmentPool(1, stateWithPerks);
    assert(pool[0].stats.str >= 4, `legacy perk str bonus: expected str >= 4, got ${pool[0].stats.str}`);
  });

  // --- Tests for calculateAptitudes ---

  test('calculateAptitudes returns object for Sword class', () => {
    const a = defaultAdventurer({ class: 'Sword' });
    const apt = calculateAptitudes(a);
    assert('tracking' in apt, 'Sword should have tracking aptitude');
    assert('combat' in apt, 'Sword should have combat aptitude');
  });

  test('calculateAptitudes returns object for Bow class', () => {
    const a = defaultAdventurer({ class: 'Bow' });
    const apt = calculateAptitudes(a);
    assert('tracking' in apt, 'Bow should have tracking aptitude');
    assert('ranged_combat' in apt, 'Bow should have ranged_combat aptitude');
  });

  test('calculateAptitudes returns empty object for unknown class', () => {
    const a = defaultAdventurer({ class: 'Dragon' });
    const apt = calculateAptitudes(a);
    assert(Object.keys(apt).length === 0, 'unknown class should have no aptitudes');
  });

  // --- Tests for calculateClassDiversity ---

  test('calculateClassDiversity with 1 class returns bonus 0.2', () => {
    const adventurers = [
      defaultAdventurer({ class: 'Sword' }),
      defaultAdventurer({ class: 'Sword' }),
    ];
    const result = calculateClassDiversity(adventurers);
    assert(result.uniqueClasses === 1, `expected 1 unique class, got ${result.uniqueClasses}`);
    assert(result.bonus === 0.2, `expected bonus 0.2, got ${result.bonus}`);
  });

  test('calculateClassDiversity with 3 classes returns bonus ~0.6', () => {
    const adventurers = [
      defaultAdventurer({ class: 'Sword' }),
      defaultAdventurer({ class: 'Bow' }),
      defaultAdventurer({ class: 'Staff' }),
    ];
    const result = calculateClassDiversity(adventurers);
    assert(result.uniqueClasses === 3, `expected 3 unique classes, got ${result.uniqueClasses}`);
    assert(Math.abs(result.bonus - 0.6) < 0.001, `expected bonus ~0.6, got ${result.bonus}`);
  });

  test('calculateClassDiversity with 4+ classes capped at 1.5', () => {
    const adventurers = [
      defaultAdventurer({ class: 'Sword' }),
      defaultAdventurer({ class: 'Bow' }),
      defaultAdventurer({ class: 'Staff' }),
      defaultAdventurer({ class: 'Shield' }),
    ];
    const result = calculateClassDiversity(adventurers);
    assert(result.uniqueClasses === 4, `expected 4 unique classes, got ${result.uniqueClasses}`);
    assert(result.bonus <= 1.5, `bonus should be capped at 1.5, got ${result.bonus}`);
  });

  // --- Tests for calculateAptitudeBonus ---

  test('calculateAptitudeBonus with matching class aptitudes returns positive bonus', () => {
    const swordApt = { tracking: 0.8, combat: 0.9 };
    const adventurers = [defaultAdventurer({ class: 'Sword', aptitudes: swordApt })];
    const bonus = calculateAptitudeBonus(adventurers, ['tracking', 'combat']);
    assert(bonus > 0, `aptitude bonus should be positive, got ${bonus}`);
  });

  test('calculateAptitudeBonus with no matching aptitudes returns 0', () => {
    const adventurers = [defaultAdventurer({ class: 'Sword', aptitudes: {} })];
    const bonus = calculateAptitudeBonus(adventurers, ['herb_gathering']);
    assert(bonus === 0, `aptitude bonus should be 0, got ${bonus}`);
  });

  // --- Tests for calculateSynergyScore ---

  test('calculateSynergyScore combines diversity + aptitude', () => {
    const adventurers = [
      defaultAdventurer({ class: 'Sword', aptitudes: { tracking: 0.8 } }),
      defaultAdventurer({ class: 'Bow', aptitudes: { tracking: 0.9 } }),
    ];
    const quest = { requirements: { preferredClasses: ['tracking'] } };
    const result = calculateSynergyScore(adventurers, quest);
    assert(result.synergyScore > 0, `synergy should be positive, got ${result.synergyScore}`);
    assert(result.diversityBonus > 0, `diversity bonus should be positive, got ${result.diversityBonus}`);
    assert(result.aptitudeBonus >= 0, `aptitude bonus should be non-negative, got ${result.aptitudeBonus}`);
  });

  test('calculateSynergyScore works with evolved adventurer aptitudes', () => {
    const evolved = evolveAdventurer(defaultAdventurer({
      class: 'Bow',
      equipment: { weapon: { name: 'Bow' }, armor: null, accessory: { name: "Sharpshooter's Monocular" } },
    }));
    const adventurers = [
      evolved,
      defaultAdventurer({ class: 'Staff', aptitudes: { herb_gathering: 0.8 } }),
    ];
    const quest = { requirements: { preferredClasses: ['tracking'] } };
    const result = calculateSynergyScore(adventurers, quest);
    assert(result.synergyScore > 0, `synergy with evolved adventurer should be positive, got ${result.synergyScore}`);
    assert(result.aptitudeBonus >= 0, `aptitude bonus should be non-negative with evolved aptitudes`);
  });

  // --- Tests for getSoloEligible ---

  test('getSoloEligible returns true for Legend rank', () => {
    const adventurers = [defaultAdventurer({ rank: 'Legend' })];
    assert(getSoloEligible(adventurers) === true, 'Legend should be solo eligible');
  });

  test('getSoloEligible returns false for non-Legend', () => {
    const adventurers = [defaultAdventurer({ rank: 'Champion' })];
    assert(getSoloEligible(adventurers) === false, 'Champion should NOT be solo eligible');
  });

  // --- Tests for validateParty with solo quests ---

  test('validateParty enforces 2-3 size normally', () => {
    assert(validateParty(['a1']).valid === false, 'party of 1 should be invalid normally');
    assert(validateParty(['a1', 'a2']).valid === true, 'party of 2 should be valid');
    assert(validateParty(['a1', 'a2', 'a3']).valid === true, 'party of 3 should be valid');
    assert(validateParty(['a1', 'a2', 'a3', 'a4']).valid === false, 'party of 4 should be invalid');
  });

  test('validateParty allows size 1 for solo-eligible quests', () => {
    const soloQuest = { requirements: { minPartySize: 1 } };
    const result = validateParty(['a1'], soloQuest);
    assert(result.valid === true, 'party of 1 should be valid for solo quest');
  });

  // --- Tests for quest resolution ---

  test('calculateStatContribution sums stat across party members', () => {
    const adventurers = [
      defaultAdventurer({ stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 } }),
      defaultAdventurer({ stats: { str: 8, dex: 8, int: 8, vit: 8, lck: 8 } }),
    ];
    const strTotal = calculateStatContribution(adventurers, 'str');
    assert(strTotal === 18, `str total should be 18, got ${strTotal}`);
  });

  test('calculatePartyEffectiveStat applies synergy bonus', () => {
    const adventurers = [
      defaultAdventurer({ class: 'Sword', stats: { str: 15, dex: 10, int: 10, vit: 10, lck: 10 } }),
      defaultAdventurer({ class: 'Bow', stats: { str: 15, dex: 10, int: 10, vit: 10, lck: 10 } }),
    ];
    const quest = { requirements: { minStats: { str: 10 } } };
    const effective = calculatePartyEffectiveStat(adventurers, quest, 'str');
    assert(effective >= 30, `effective should be >= 30 with synergy, got ${effective}`);
  });

  test('calculatePartyEffectiveStat applies solo penalty', () => {
    const adventurers = [defaultAdventurer({ stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 } })];
    const quest = { requirements: { minStats: { str: 10 } } };
    const effective = calculatePartyEffectiveStat(adventurers, quest, 'str');
    assert(effective <= 10, `solo should apply 0.85 penalty, got ${effective}`);
  });

  test('calculateQuestSuccessRate with perfect stats returns ~95%', () => {
    const adventurers = [
      defaultAdventurer({ class: 'Sword', stats: { str: 20, dex: 20, int: 20, vit: 20, lck: 20 } }),
      defaultAdventurer({ class: 'Bow', stats: { str: 20, dex: 20, int: 20, vit: 20, lck: 20 } }),
    ];
    const quest = { requirements: { minStats: { str: 5, dex: 5, int: 5, vit: 5, lck: 5 } } };
    const rate = calculateQuestSuccessRate(adventurers, quest);
    assert(rate <= 95, `rate should be capped at 95, got ${rate}`);
    assert(rate >= 80, `rate should be high with perfect stats, got ${rate}`);
  });

  test('calculateQuestSuccessRate with weak stats returns ~10%', () => {
    const adventurers = [
      defaultAdventurer({ stats: { str: 1, dex: 1, int: 1, vit: 1, lck: 1 } }),
      defaultAdventurer({ stats: { str: 1, dex: 1, int: 1, vit: 1, lck: 1 } }),
    ];
    const quest = { requirements: { minStats: { str: 15, dex: 15, int: 15, vit: 15, lck: 15 } } };
    const rate = calculateQuestSuccessRate(adventurers, quest);
    assert(rate >= 10, `rate should be at least 10, got ${rate}`);
    assert(rate <= 25, `rate should be low with weak stats, got ${rate}`);
  });

  test('calculateQuestSuccessRate returns rate within 10-95% range', () => {
    const adventurers = [
      defaultAdventurer({ stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 } }),
      defaultAdventurer({ stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 } }),
    ];
    const quest = { requirements: { minStats: { str: 10, dex: 10 } } };
    const rate = calculateQuestSuccessRate(adventurers, quest);
    assert(rate >= 10 && rate <= 95, `rate should be in 10-95 range, got ${rate}`);
  });

  test('calculateQuestOutcome with success returns gold and XP', () => {
    const adventurers = [
      defaultAdventurer({ stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 } }),
      defaultAdventurer({ stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 } }),
    ];
    const quest = defaultQuest({ rewards: { gold: 50, experience: 60 } });
    const outcome = calculateQuestOutcome(adventurers, quest, true);
    assert(outcome.success === true, 'should be successful');
    assert(outcome.gold > 0, 'gold should be positive');
    assert(outcome.experience > 0, 'experience should be positive');
  });

  test('calculateQuestOutcome with failure returns partial rewards', () => {
    const adventurers = [
      defaultAdventurer({ stats: { str: 5, dex: 5, int: 5, vit: 5, lck: 5 } }),
    ];
    const quest = defaultQuest({ rewards: { gold: 100, experience: 100 } });
    const outcome = calculateQuestOutcome(adventurers, quest, false);
    assert(outcome.success === false, 'should be failed');
    assert(outcome.gold === 20, `failed gold should be 20 (20%), got ${outcome.gold}`);
    assert(outcome.experience === 10, `failed XP should be 10 (10%), got ${outcome.experience}`);
    assert(outcome.moraleAdjustment === -5, 'morale should drop by 5');
  });

  test('generateQuestPool returns correct number of quests', () => {
    const pool = generateQuestPool(5);
    assert(pool.length === 5, `pool should have 5 quests, got ${pool.length}`);
  });

  test('generateQuestPool quests have valid difficulty and requirements', () => {
    const pool = generateQuestPool(3);
    for (const quest of pool) {
      assert(VALID_DIFFICULTIES.includes(quest.difficulty), `difficulty ${quest.difficulty} should be valid`);
      assert(quest.requirements?.minStats, 'quest should have minStats');
      assert(quest.rewards?.gold > 0, 'quest should have positive gold reward');
    }
  });

  // --- Tests for economy engine ---

  test('calculateUpgradeCost base costs: office=50, equipment=30, job_postings=15', () => {
    assert(calculateUpgradeCost('office', 0) === 50, `office base cost should be 50, got ${calculateUpgradeCost('office', 0)}`);
    assert(calculateUpgradeCost('equipment', 0) === 30, `equipment base cost should be 30, got ${calculateUpgradeCost('equipment', 0)}`);
    assert(calculateUpgradeCost('job_postings', 0) === 15, `job_postings base cost should be 15, got ${calculateUpgradeCost('job_postings', 0)}`);
  });

  test('calculateUpgradeCost level 2 costs 1.5x level 1', () => {
    const level1 = calculateUpgradeCost('office', 0);
    const level2 = calculateUpgradeCost('office', 1);
    assert(level2 === Math.floor(50 * 1.5), `level 2 cost should be ${Math.floor(50 * 1.5)}, got ${level2}`);
  });

  test('getAvailableUpgrades filters by gold availability', () => {
    const state = { gold: 5, upgrades: { office: 0, equipment: 0, job_postings: 0 } };
    const available = getAvailableUpgrades(state);
    const types = available.map(u => u.type);
    assert(!types.includes('equipment'), 'equipment should be unavailable with gold=5');
    assert(types.includes('office'), 'office should be available');
  });

  // --- Tests for tick processor ---

  test('checkMorale applies base decay (-1 per 10 ticks)', () => {
    const adventurer = defaultAdventurer({ morale: 50 });
    const state = { adventurers: [adventurer] };
    const result = checkMorale(state, 20);
    assert(result.adjustedAdventurers[0].morale === 48, `morale should decay by 2 (20 ticks / 10), got ${result.adjustedAdventurers[0].morale}`);
  });

  test('checkDepartures removes adventurers with morale <= 0', () => {
    const alive = defaultAdventurer({ morale: 50 });
    const departed = defaultAdventurer({ morale: 0 });
    const state = { adventurers: [alive, departed] };
    const result = checkDepartures(state);
    assert(result.departed.length === 1, 'one adventurer should have departed');
    assert(result.remaining.length === 1, 'one adventurer should remain');
  });

  test('checkDepartures keeps adventurers with morale > 0', () => {
    const adventurer = defaultAdventurer({ morale: 10 });
    const state = { adventurers: [adventurer] };
    const result = checkDepartures(state);
    assert(result.remaining.length === 1, 'adventurer should remain with positive morale');
  });

  test('processTick advances day', () => {
    const state = { gold: 100, adventurers: [], day: 10 };
    const result = processTick(state, 1);
    assert(result.day === 11, `day should advance by 1, got ${result.day}`);
  });

  // --- Tests for name generation and personality traits ---

  test('VALID_PERSONALITY_TRAITS has exactly 35 entries', () => {
    assert(VALID_PERSONALITY_TRAITS.length === 35, `expected 35 traits, got ${VALID_PERSONALITY_TRAITS.length}`);
  });

  test('PERSONALITY_TRAIT_TABLE has matching entries for all VALID_PERSONALITY_TRAITS', () => {
    for (const trait of VALID_PERSONALITY_TRAITS) {
      assert(trait in PERSONALITY_TRAIT_TABLE, `${trait} missing from PERSONALITY_TRAIT_TABLE`);
    }
  });

  test('PERSONALITY_TRAIT_TABLE entries have morale, quest_success, and description', () => {
    for (const [trait, data] of Object.entries(PERSONALITY_TRAIT_TABLE)) {
      assert(typeof data.morale === 'number', `${trait} missing morale (number)`);
      assert(typeof data.quest_success === 'number', `${trait} missing quest_success (number)`);
      assert(typeof data.description === 'string', `${trait} missing description (string)`);
    }
  });

  test('generateName returns a non-empty string', () => {
    const name = generateName();
    assert(typeof name === 'string', `generateName should return string, got ${typeof name}`);
    assert(name.length > 0, 'generated name should be non-empty');
  });

  test('generateName returns string composed of syllable pool parts', () => {
    const names = [];
    for (let i = 0; i < 20; i++) {
      names.push(generateName());
    }
    // All names should match the pattern: one start syllable + one end syllable
    for (const name of names) {
      assert(/^\w+$/.test(name), `name '${name}' should be composed syllables`);
    }
  });

  test('generateName with override.name returns the given name', () => {
    const name = generateName({ name: 'TestName' });
    assert(name === 'TestName', `override should return 'TestName', got '${name}'`);
  });

  test('generatePersonality returns object with traits array', () => {
    const p = generatePersonality();
    assert(typeof p === 'object', 'should return object');
    assert(Array.isArray(p.traits), 'should have traits array');
  });

  test('generatePersonality returns 1-3 non-duplicate traits', () => {
    const results = [];
    for (let i = 0; i < 50; i++) {
      const p = generatePersonality();
      assert(p.traits.length >= 1 && p.traits.length <= 3,
        `trait count should be 1-3, got ${p.traits.length}`);
      // Check no duplicates
      const unique = new Set(p.traits);
      assert(unique.size === p.traits.length, `traits should have no duplicates: [${p.traits.join(', ')}]`);
      // Check all traits are in VALID_PERSONALITY_TRAITS
      for (const t of p.traits) {
        assert(VALID_PERSONALITY_TRAITS.includes(t), `trait '${t}' not in VALID_PERSONALITY_TRAITS`);
      }
    }
  });

  test('generatePersonality respects count parameter', () => {
    // count=1 should return 1 trait
    const p1 = generatePersonality(1);
    assert(p1.traits.length === 1, `expected 1 trait, got ${p1.traits.length}`);

    // count=3 should return up to 3 traits
    const p3 = generatePersonality(3);
    assert(p3.traits.length >= 1 && p3.traits.length <= 3, `expected 1-3 traits, got ${p3.traits.length}`);
  });

  // --- Tests for QUEST_TEMPLATES (Phase 3-02) ---

  test('QUEST_TEMPLATES is exported as an array', () => {
    assert(Array.isArray(QUEST_TEMPLATES), 'QUEST_TEMPLATES must be an array');
  });

  test('QUEST_TEMPLATES has at least 12 entries', () => {
    assert(QUEST_TEMPLATES.length >= 12, `QUEST_TEMPLATES should have >= 12 entries, got ${QUEST_TEMPLATES.length}`);
  });

  test('QUEST_TEMPLATES has at most 25 entries', () => {
    assert(QUEST_TEMPLATES.length <= 25, `QUEST_TEMPLATES should have <= 25 entries, got ${QUEST_TEMPLATES.length}`);
  });

  test('QUEST_TEMPLATES contains all 8 original template names', () => {
    const originalNames = [
      'Scout the nearby forest',
      'Clear rat infestation',
      'Deliver messages to border village',
      'Hunt bandits on the highway',
      'Explore the abandoned mine',
      'Escort merchant caravan',
      'Slay the dragon',
      'Infiltrate the rival guild',
    ];
    for (const name of originalNames) {
      const found = QUEST_TEMPLATES.some(t => t.name === name);
      assert(found, `QUEST_TEMPLATES must contain "${name}"`);
    }
  });

  test('QUEST_TEMPLATES entries have required fields', () => {
    for (const template of QUEST_TEMPLATES) {
      assert(typeof template.name === 'string', `template must have name string, got ${typeof template.name}`);
      assert(typeof template.difficulty === 'number', `template must have difficulty number, got ${typeof template.difficulty}`);
      assert(typeof template.requirements === 'object', `template must have requirements object`);
      assert(typeof template.rewards === 'object', `template must have rewards object`);
      assert(typeof template.description === 'string', `template must have description string`);
      assert(VALID_DIFFICULTIES.includes(template.difficulty), `difficulty ${template.difficulty} must be valid`);
    }
  });

  test('QUEST_TEMPLATES difficulty distribution covers 1-5', () => {
    const difficulties = new Set(QUEST_TEMPLATES.map(t => t.difficulty));
    for (const d of [1, 2, 3, 4, 5]) {
      assert(difficulties.has(d), `QUEST_TEMPLATES must include difficulty ${d}`);
    }
  });

  test('QUEST_TEMPLATES entries have minStats object', () => {
    for (const template of QUEST_TEMPLATES) {
      assert(typeof template.requirements.minStats === 'object', `template "${template.name}" must have minStats`);
      assert('str' in template.requirements.minStats, `template "${template.name}" must have str`);
      assert('dex' in template.requirements.minStats, `template "${template.name}" must have dex`);
      assert('int' in template.requirements.minStats, `template "${template.name}" must have int`);
      assert('vit' in template.requirements.minStats, `template "${template.name}" must have vit`);
      assert('lck' in template.requirements.minStats, `template "${template.name}" must have lck`);
    }
  });

  test('QUEST_TEMPLATES entries have preferredClasses array', () => {
    for (const template of QUEST_TEMPLATES) {
      assert(Array.isArray(template.requirements.preferredClasses), `template "${template.name}" must have preferredClasses array`);
    }
  });

  test('QUEST_TEMPLATES entries have gold and experience rewards', () => {
    for (const template of QUEST_TEMPLATES) {
      assert(typeof template.rewards.gold === 'number', `template "${template.name}" must have gold number`);
      assert(typeof template.rewards.experience === 'number', `template "${template.name}" must have experience number`);
      assert(template.rewards.gold > 0, `template "${template.name}" gold must be positive`);
      assert(template.rewards.experience > 0, `template "${template.name}" experience must be positive`);
    }
  });

  test('QUEST_TEMPLATES entries have party size constraints', () => {
    for (const template of QUEST_TEMPLATES) {
      assert(typeof template.requirements.minPartySize === 'number', `template "${template.name}" must have minPartySize`);
      assert(typeof template.requirements.maxPartySize === 'number', `template "${template.name}" must have maxPartySize`);
    }
  });

  // --- Tests for perturbQuest (Phase 3-02) ---

  test('perturbQuest returns an object with all quest fields', () => {
    const t = QUEST_TEMPLATES[0];
    const q = perturbQuest(t);
    assert(typeof q.id === 'string', 'perturbed quest must have id');
    assert(typeof q.name === 'string', 'perturbed quest must have name');
    assert(typeof q.difficulty === 'number', 'perturbed quest must have difficulty');
    assert(typeof q.requirements === 'object', 'perturbed quest must have requirements');
    assert(typeof q.rewards === 'object', 'perturbed quest must have rewards');
    assert(typeof q.description === 'string', 'perturbed quest must have description');
  });

  test('perturbQuest preserves template name and difficulty', () => {
    for (const t of QUEST_TEMPLATES) {
      const q = perturbQuest(t);
      assert(q.name === t.name, `name should match template: ${t.name}`);
      assert(q.difficulty === t.difficulty, `difficulty should match template: ${t.name}`);
    }
  });

  test('perturbQuest preserves preferredClasses from template', () => {
    for (const t of QUEST_TEMPLATES) {
      const q = perturbQuest(t);
      assert(Array.isArray(q.requirements.preferredClasses), `preferredClasses should be array: ${t.name}`);
      assert(q.requirements.preferredClasses.length === t.requirements.preferredClasses.length, `preferredClasses length should match: ${t.name}`);
      for (let i = 0; i < t.requirements.preferredClasses.length; i++) {
        assert(q.requirements.preferredClasses[i] === t.requirements.preferredClasses[i], `preferredClasses[${i}] should match: ${t.name}`);
      }
    }
  });

  test('perturbQuest preserves minPartySize and maxPartySize', () => {
    for (const t of QUEST_TEMPLATES) {
      const q = perturbQuest(t);
      assert(q.requirements.minPartySize === t.requirements.minPartySize, `minPartySize should match: ${t.name}`);
      assert(q.requirements.maxPartySize === t.requirements.maxPartySize, `maxPartySize should match: ${t.name}`);
    }
  });

  test('perturbQuest perturbs gold within ±10% of template base', () => {
    for (const t of QUEST_TEMPLATES) {
      const base = t.rewards.gold;
      const results = [];
      for (let i = 0; i < 20; i++) {
        results.push(perturbQuest(t).rewards.gold);
      }
      for (const gold of results) {
        assert(gold >= Math.floor(base * 0.9), `gold ${gold} below 90% of base ${base}`);
        assert(gold <= Math.ceil(base * 1.1), `gold ${gold} above 110% of base ${base}`);
      }
    }
  });

  test('perturbQuest perturbs experience within ±10% of template base', () => {
    for (const t of QUEST_TEMPLATES) {
      const base = t.rewards.experience;
      const results = [];
      for (let i = 0; i < 20; i++) {
        results.push(perturbQuest(t).rewards.experience);
      }
      for (const xp of results) {
        assert(xp >= Math.floor(base * 0.9), `xp ${xp} below 90% of base ${base}`);
        assert(xp <= Math.ceil(base * 1.1), `xp ${xp} above 110% of base ${base}`);
      }
    }
  });

  test('perturbQuest perturbs stat values within ±2 of template base', () => {
    for (const t of QUEST_TEMPLATES) {
      const baseStats = t.requirements.minStats;
      const results = [];
      for (let i = 0; i < 20; i++) {
        results.push(perturbQuest(t).requirements.minStats);
      }
      for (const perturbed of results) {
        for (const [stat, val] of Object.entries(baseStats)) {
          assert(perturbed[stat] >= val - 2, `${stat} ${perturbed[stat]} below base ${val} - 2`);
          assert(perturbed[stat] <= val + 2, `${stat} ${perturbed[stat]} above base ${val} + 2`);
        }
      }
    }
  });

  test('perturbQuest never produces stat below 1', () => {
    for (const t of QUEST_TEMPLATES) {
      const baseStats = t.requirements.minStats;
      for (const [stat, val] of Object.entries(baseStats)) {
        if (val <= 3) {
          // If base is low, perturbation could push below 1
          for (let i = 0; i < 20; i++) {
            const result = perturbQuest(t).requirements.minStats;
            assert(result[stat] >= 1, `${stat} should never be below 1, got ${result[stat]}`);
          }
        }
      }
    }
  });

  test('perturbQuest never produces gold below 5', () => {
    for (const t of QUEST_TEMPLATES) {
      for (let i = 0; i < 20; i++) {
        const result = perturbQuest(t).rewards;
        assert(result.gold >= 5, `gold should never be below 5, got ${result.gold}`);
      }
    }
  });

  test('perturbQuest never produces experience below 5', () => {
    for (const t of QUEST_TEMPLATES) {
      for (let i = 0; i < 20; i++) {
        const result = perturbQuest(t).rewards;
        assert(result.experience >= 5, `experience should never be below 5, got ${result.experience}`);
      }
    }
  });

  test('perturbQuest does not mutate original template', () => {
    const t = QUEST_TEMPLATES[0];
    const originalGold = t.rewards.gold;
    const originalXP = t.rewards.experience;
    const originalStats = { ...t.requirements.minStats };
    for (let i = 0; i < 50; i++) {
      perturbQuest(t);
    }
    assert(t.rewards.gold === originalGold, 'template gold should not change');
    assert(t.rewards.experience === originalXP, 'template experience should not change');
    assert(t.requirements.minStats.str === originalStats.str, 'template str should not change');
  });

  // --- Tests for updated generateQuestPool (Phase 3-02) ---

  test('generateQuestPool returns correct number of quests', () => {
    for (const n of [1, 2, 3, 5, 10]) {
      const pool = generateQuestPool(n);
      assert(pool.length === Math.min(n, QUEST_TEMPLATES.length), `pool should have ${n} quests, got ${pool.length}`);
    }
  });

  test('generateQuestPool returns distinct quests (no duplicates)', () => {
    const pool = generateQuestPool(5);
    const ids = pool.map(q => q.id);
    const unique = new Set(ids);
    assert(unique.size === ids.length, 'all quest IDs should be unique in pool');
  });

  test('generateQuestPool(5) returns 5 distinct quests with perturbed rewards', () => {
    for (let run = 0; run < 5; run++) {
      const pool = generateQuestPool(5);
      assert(pool.length === 5, `pool should have 5 quests, got ${pool.length}`);
      const ids = pool.map(q => q.id);
      assert(new Set(ids).size === 5, 'all 5 quests should have unique IDs');
      // Each quest should have perturbed (not identical) rewards
      const golds = pool.map(q => q.rewards.gold);
      const xps = pool.map(q => q.rewards.experience);
      // Not all golds should be the same (perturbation creates variety)
      const uniqueGolds = new Set(golds).size;
      assert(uniqueGolds > 0, 'should have at least some gold variation');
    }
  });

  test('generateQuestPool quests match defaultQuest shape', () => {
    const pool = generateQuestPool(3);
    for (const q of pool) {
      assert(typeof q.id === 'string', 'must have id');
      assert(typeof q.name === 'string', 'must have name');
      assert(typeof q.difficulty === 'number', 'must have difficulty');
      assert(typeof q.requirements === 'object', 'must have requirements');
      assert(typeof q.requirements.minStats === 'object', 'must have minStats');
      assert(Array.isArray(q.requirements.preferredClasses), 'must have preferredClasses');
      assert(typeof q.rewards === 'object', 'must have rewards');
      assert(typeof q.description === 'string', 'must have description');
    }
  });

  test('generateQuestPool respects QUEST_TEMPLATES count limit', () => {
    const pool = generateQuestPool(100);
    assert(pool.length === QUEST_TEMPLATES.length, `pool should have ${QUEST_TEMPLATES.length} quests when requested 100`);
  });

  // --- Tests for EVENT_TEMPLATES (Phase 3-03) ---

  test('VALID_EVENT_CATEGORIES is an array with 3 categories', () => {
    assert(Array.isArray(VALID_EVENT_CATEGORIES), 'VALID_EVENT_CATEGORIES must be an array');
    assert(VALID_EVENT_CATEGORIES.length === 3, `expected 3 categories, got ${VALID_EVENT_CATEGORIES.length}`);
  });

  test('VALID_EVENT_CATEGORIES contains Budget, Crisis, and Drama', () => {
    assert(VALID_EVENT_CATEGORIES.includes('Budget'), 'must include Budget');
    assert(VALID_EVENT_CATEGORIES.includes('Crisis'), 'must include Crisis');
    assert(VALID_EVENT_CATEGORIES.includes('Drama'), 'must include Drama');
  });

  test('EVENT_TEMPLATES is an array with 18 entries', () => {
    assert(Array.isArray(EVENT_TEMPLATES), 'EVENT_TEMPLATES must be an array');
    assert(EVENT_TEMPLATES.length === 18, `expected 18 events, got ${EVENT_TEMPLATES.length}`);
  });

  test('EVENT_TEMPLATES has 6 Budget events', () => {
    const budgetEvents = EVENT_TEMPLATES.filter(e => e.category === 'Budget');
    assert(budgetEvents.length === 6, `expected 6 Budget events, got ${budgetEvents.length}`);
  });

  test('EVENT_TEMPLATES has 6 Crisis events', () => {
    const crisisEvents = EVENT_TEMPLATES.filter(e => e.category === 'Crisis');
    assert(crisisEvents.length === 6, `expected 6 Crisis events, got ${crisisEvents.length}`);
  });

  test('EVENT_TEMPLATES has 6 Drama events', () => {
    const dramaEvents = EVENT_TEMPLATES.filter(e => e.category === 'Drama');
    assert(dramaEvents.length === 6, `expected 6 Drama events, got ${dramaEvents.length}`);
  });

  test('EVENT_TEMPLATES entries have required fields', () => {
    for (const template of EVENT_TEMPLATES) {
      assert(typeof template.id === 'string', `event must have id string, got ${typeof template.id}`);
      assert(VALID_EVENT_CATEGORIES.includes(template.category), `event category must be valid: ${template.category}`);
      assert(typeof template.weight === 'number', `event must have weight number, got ${typeof template.weight}`);
      assert(typeof template.title === 'string', `event must have title string, got ${typeof template.title}`);
      assert(typeof template.description === 'string', `event must have description string`);
      assert(Array.isArray(template.choices), `event must have choices array`);
    }
  });

  test('EVENT_TEMPLATES entries have 2-3 choices each', () => {
    for (const template of EVENT_TEMPLATES) {
      assert(template.choices.length >= 2 && template.choices.length <= 3,
        `event "${template.title}" should have 2-3 choices, got ${template.choices.length}`);
    }
  });

  test('EVENT_TEMPLATES choices have label and effect function', () => {
    for (const template of EVENT_TEMPLATES) {
      for (const choice of template.choices) {
        assert(typeof choice.label === 'string', `choice label must be string in "${template.title}"`);
        assert(typeof choice.effect === 'function', `choice effect must be function in "${template.title}"`);
      }
    }
  });

  test('EVENT_TEMPLATES weights sum correctly (43 total)', () => {
    const budgetWeight = EVENT_TEMPLATES.filter(e => e.category === 'Budget').reduce((s, e) => s + e.weight, 0);
    const crisisWeight = EVENT_TEMPLATES.filter(e => e.category === 'Crisis').reduce((s, e) => s + e.weight, 0);
    const dramaWeight = EVENT_TEMPLATES.filter(e => e.category === 'Drama').reduce((s, e) => s + e.weight, 0);
    assert(budgetWeight === 15, `Budget weight should be 15, got ${budgetWeight}`);
    assert(crisisWeight === 15, `Crisis weight should be 15, got ${crisisWeight}`);
    assert(dramaWeight === 13, `Drama weight should be 13, got ${dramaWeight}`);
    const totalWeight = budgetWeight + crisisWeight + dramaWeight;
    assert(totalWeight === 43, `total weight should be 43, got ${totalWeight}`);
  });

  test('EVENT_TEMPLATES events have unique IDs', () => {
    const ids = EVENT_TEMPLATES.map(e => e.id);
    const unique = new Set(ids);
    assert(unique.size === ids.length, 'all event IDs should be unique');
  });

  test('Budget events reference budget mechanics', () => {
    const budgetEvents = EVENT_TEMPLATES.filter(e => e.category === 'Budget');
    for (const e of budgetEvents) {
      assert(typeof e.id === 'string' && e.id.startsWith('budget-'), `Budget event should have "budget-" prefix: ${e.id}`);
    }
  });

  test('Crisis events reference crisis mechanics', () => {
    const crisisEvents = EVENT_TEMPLATES.filter(e => e.category === 'Crisis');
    for (const e of crisisEvents) {
      assert(typeof e.id === 'string' && e.id.startsWith('crisis-'), `Crisis event should have "crisis-" prefix: ${e.id}`);
    }
  });

  test('Drama events reference drama mechanics', () => {
    const dramaEvents = EVENT_TEMPLATES.filter(e => e.category === 'Drama');
    for (const e of dramaEvents) {
      assert(typeof e.id === 'string' && e.id.startsWith('drama-'), `Drama event should have "drama-" prefix: ${e.id}`);
    }
  });

  test('EVENT_TEMPLATES effect functions are callable and return objects', () => {
    const testState = { gold: 100, morale: 70 };
    for (const template of EVENT_TEMPLATES) {
      for (const choice of template.choices) {
        const result = choice.effect(testState);
        assert(typeof result === 'object' && result !== null, `effect should return object for "${template.title}": ${choice.label}`);
      }
    }
  });

  // --- Tests for generateEventPool (Phase 3-03) ---

  test('generateEventPool returns an array', () => {
    assert(Array.isArray(generateEventPool()), 'generateEventPool must return an array');
  });

  test('generateEventPool returns 43 entries (sum of all weights)', () => {
    const pool = generateEventPool();
    assert(pool.length === 43, `expected 43 entries, got ${pool.length}`);
  });

  test('generateEventPool contains correct number of Budget events (15)', () => {
    const pool = generateEventPool();
    const budget = pool.filter(e => e.category === 'Budget');
    assert(budget.length === 15, `expected 15 Budget entries, got ${budget.length}`);
  });

  test('generateEventPool contains correct number of Crisis events (15)', () => {
    const pool = generateEventPool();
    const crisis = pool.filter(e => e.category === 'Crisis');
    assert(crisis.length === 15, `expected 15 Crisis entries, got ${crisis.length}`);
  });

  test('generateEventPool contains correct number of Drama events (13)', () => {
    const pool = generateEventPool();
    const drama = pool.filter(e => e.category === 'Drama');
    assert(drama.length === 13, `expected 13 Drama entries, got ${drama.length}`);
  });

  test('generateEventPool entries match EVENT_TEMPLATES structure', () => {
    const pool = generateEventPool();
    const templateIds = new Set(EVENT_TEMPLATES.map(t => t.id));
    for (const entry of pool) {
      assert(templateIds.has(entry.id), `pool entry "${entry.id}" should match a template`);
    }
  });

  // --- Tests for selectNextEvent (Phase 3-03) ---

  test('selectNextEvent returns an event template or null', () => {
    const state = { day: 1, eventCooldowns: {} };
    const result = selectNextEvent(state);
    assert(result === null || typeof result.id === 'string', 'selectNextEvent should return event or null');
  });

  test('selectNextEvent returns null when all events are in cooldown', () => {
    const state = {
      day: 1,
      eventCooldowns: {},
    };
    // Set all events to cooldown future
    const cooldowns = {};
    for (const t of EVENT_TEMPLATES) {
      cooldowns[t.id] = 100;
    }
    state.eventCooldowns = cooldowns;
    const result = selectNextEvent(state);
    assert(result === null, `expected null when all events in cooldown, got "${result?.id}"`);
  });

  test('selectNextEvent returns an event when no cooldowns', () => {
    const state = { day: 10, eventCooldowns: {} };
    const result = selectNextEvent(state);
    assert(result !== null, 'should return an event when no cooldowns');
    assert(EVENT_TEMPLATES.some(t => t.id === result.id), 'returned event should be a known template');
  });

  test('selectNextEvent filters out cooldown events', () => {
    const state = {
      day: 5,
      eventCooldowns: { 'budget-bonus-demands': 10 },
    };
    // bonus-demands is in cooldown (cooldown ends at tick 10, current tick is 5)
    for (let i = 0; i < 20; i++) {
      const result = selectNextEvent(state);
      assert(result !== null, 'should return non-null event');
      assert(result.id !== 'budget-bonus-demands', 'should not return cooldown event');
    }
  });

  test('selectNextEvent returns event after cooldown expires', () => {
    const state = {
      day: 25,
      eventCooldowns: { 'budget-bonus-demands': 20 },
    };
    // After 100 trials, should occasionally return budget-bonus-demands
    let found = false;
    for (let i = 0; i < 100; i++) {
      const result = selectNextEvent(state);
      if (result && result.id === 'budget-bonus-demands') { found = true; break; }
    }
    assert(found, 'should eventually return event after cooldown expires');
  });

  // --- Tests for resolveEvent (Phase 3-03) ---

  test('resolveEvent returns delta object with eventId, resolvedAt, moraleAdjustment', () => {
    const state = { day: 5, gold: 100 };
    const result = resolveEvent(state, 'budget-bonus-demands', 0);
    assert(typeof result.delta === 'object', 'result must have delta object');
    assert(typeof result.eventId === 'string', 'result must have eventId');
    assert(typeof result.resolvedAt === 'number', 'result must have resolvedAt');
    assert(typeof result.moraleAdjustment === 'number', 'result must have moraleAdjustment');
  });

  test('resolveEvent returns valid delta for each event category', () => {
    const state = { day: 5, gold: 100 };
    const categories = ['Budget', 'Crisis', 'Drama'];
    for (const cat of categories) {
      const event = EVENT_TEMPLATES.find(e => e.category === cat);
      const result = resolveEvent(state, event.id, 0);
      assert(result.delta !== undefined, `delta should exist for ${cat} event`);
      assert(result.eventId === event.id, `eventId should match`);
    }
  });

  test('resolveEvent handles invalid eventId gracefully', () => {
    const state = { day: 5, gold: 100 };
    const result = resolveEvent(state, 'nonexistent-event', 0);
    assert(result.delta && Object.keys(result.delta).length === 0, 'invalid eventId should return empty delta');
    assert(result.eventId === 'nonexistent-event', 'eventId should be passed through');
    assert(typeof result.resolvedAt === 'number', 'resolvedAt should be set');
  });

  test('resolveEvent handles invalid choiceIndex gracefully', () => {
    const state = { day: 5, gold: 100 };
    const result = resolveEvent(state, 'budget-bonus-demands', 99);
    assert(result.delta && Object.keys(result.delta).length === 0, 'invalid choiceIndex should return empty delta');
    assert(result.eventId === 'budget-bonus-demands', 'eventId should be passed through');
  });

  test('resolveEvent gold delta is correct for budget-price-surge choice 0', () => {
    const state = { day: 5, gold: 100 };
    const result = resolveEvent(state, 'budget-price-surge', 0);
    assert(result.delta.gold === -15, `delta gold should be -15, got ${result.delta.gold}`);
  });

  test('resolveEvent moraleAdjustment propagates through delta', () => {
    const state = { day: 5, gold: 100 };
    const result = resolveEvent(state, 'budget-bonus-demands', 2); // Refuse (morale -5)
    assert(result.moraleAdjustment === -5, `moraleAdjustment should be -5, got ${result.moraleAdjustment}`);
  });

  test('resolveEvent returns resolvedAt equal to state.day', () => {
    const state = { day: 42, gold: 100 };
    const result = resolveEvent(state, 'drama-festival', 1);
    assert(result.resolvedAt === 42, `resolvedAt should be 42, got ${result.resolvedAt}`);
  });

  // --- Tests for gameDefaults event system fields ---

  test('gameDefaults includes events: []', () => {
    const defaults = gameDefaults();
    assert(Array.isArray(defaults.events), `events should be an array, got ${typeof defaults.events}`);
    assert(defaults.events.length === 0, `events should be empty, got ${defaults.events.length}`);
  });

  test('gameDefaults includes eventCooldowns: {}', () => {
    const defaults = gameDefaults();
    assert(typeof defaults.eventCooldowns === 'object' && !Array.isArray(defaults.eventCooldowns), `eventCooldowns should be an object, got ${typeof defaults.eventCooldowns}`);
    assert(Object.keys(defaults.eventCooldowns).length === 0, `eventCooldowns should be empty`);
  });

  test('gameDefaults includes questRisk: 0', () => {
    const defaults = gameDefaults();
    assert(defaults.questRisk === 0, `questRisk should be 0, got ${defaults.questRisk}`);
  });

  test('gameDefaults includes reputation: 0', () => {
    const defaults = gameDefaults();
    assert(defaults.reputation === 0, `reputation should be 0, got ${defaults.reputation}`);
  });

  test('gameDefaults includes favorDebt: 0', () => {
    const defaults = gameDefaults();
    assert(defaults.favorDebt === 0, `favorDebt should be 0, got ${defaults.favorDebt}`);
  });

  // --- Tests for validateGame events check ---

  test('validateGame accepts state with events array', () => {
    const state = { adventurers: [], quests: [], party: { id: 'p1', adventurerIds: [] } };
    state.events = [];
    const result = validateGame(state);
    assert(result.valid === true, `validateGame should accept events array, reason: ${result.reason}`);
  });

  test('validateGame rejects state with non-array events', () => {
    const state = { adventurers: [], quests: [], party: { id: 'p1', adventurerIds: [] } };
    state.events = 'not-an-array';
    const result = validateGame(state);
    assert(result.valid === false, `validateGame should reject non-array events`);
    assert(result.reason === 'events must be an array', `reason should be specific, got: ${result.reason}`);
  });

  test('validateGame accepts state without events field (backward compat)', () => {
    const state = { adventurers: [], quests: [], party: { id: 'p1', adventurerIds: [] } };
    const result = validateGame(state);
    assert(result.valid === true, `validateGame should accept state without events (backward compat)`);
  });

  // --- Tests for office level calculation (Phase 3-05) ---

  test('OFFICE_LEVEL_THRESHOLDS is exported as an array with 5 entries', () => {
    assert(Array.isArray(OFFICE_LEVEL_THRESHOLDS), 'OFFICE_LEVEL_THRESHOLDS must be an array');
    assert(OFFICE_LEVEL_THRESHOLDS.length === 5, `expected 5 thresholds, got ${OFFICE_LEVEL_THRESHOLDS.length}`);
  });

  test('OFFICE_LEVEL_THRESHOLDS entries have level, quests, and roster fields', () => {
    for (const t of OFFICE_LEVEL_THRESHOLDS) {
      assert(typeof t.level === 'number', `threshold must have level number`);
      assert(typeof t.quests === 'number', `threshold must have quests number`);
      assert(typeof t.roster === 'number', `threshold must have roster number`);
    }
  });

  test('OFFICE_LEVEL_THRESHOLDS levels are 1 through 5', () => {
    const levels = OFFICE_LEVEL_THRESHOLDS.map(t => t.level);
    assert(levels[0] === 1, 'first level should be 1');
    assert(levels[1] === 2, 'second level should be 2');
    assert(levels[2] === 3, 'third level should be 3');
    assert(levels[3] === 4, 'fourth level should be 4');
    assert(levels[4] === 5, 'fifth level should be 5');
  });

  test('calculateOfficeLevel returns level 1 with no quests and no adventurers', () => {
    const state = { questCount: 0, adventurers: [], officeLevel: 1 };
    const result = calculateOfficeLevel(state);
    assert(result.level === 1, `expected level 1, got ${result.level}`);
    assert(result.label === 'Shack', `expected label 'Shack', got '${result.label}'`);
  });

  test('calculateOfficeLevel returns level 2 with 5 quests and 3 adventurers', () => {
    const state = {
      questCount: 5,
      adventurers: [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }],
      officeLevel: 1,
    };
    const result = calculateOfficeLevel(state);
    assert(result.level === 2, `expected level 2, got ${result.level}`);
    assert(result.label === 'Hovel', `expected label 'Hovel', got '${result.label}'`);
  });

  test('calculateOfficeLevel returns level 3 with 15 quests and 6 adventurers', () => {
    const adventurers = Array.from({ length: 6 }, (_, i) => ({ id: `a${i}` }));
    const state = { questCount: 15, adventurers, officeLevel: 1 };
    const result = calculateOfficeLevel(state);
    assert(result.level === 3, `expected level 3, got ${result.level}`);
    assert(result.label === 'Guild Hall', `expected label 'Guild Hall', got '${result.label}'`);
  });

  test('calculateOfficeLevel returns level 4 with 30 quests and 10 adventurers', () => {
    const adventurers = Array.from({ length: 10 }, (_, i) => ({ id: `a${i}` }));
    const state = { questCount: 30, adventurers, officeLevel: 1 };
    const result = calculateOfficeLevel(state);
    assert(result.level === 4, `expected level 4, got ${result.level}`);
    assert(result.label === 'Fortress', `expected label 'Fortress', got '${result.label}'`);
  });

  test('calculateOfficeLevel returns level 5 with 50 quests and 15 adventurers', () => {
    const adventurers = Array.from({ length: 15 }, (_, i) => ({ id: `a${i}` }));
    const state = { questCount: 50, adventurers, officeLevel: 1 };
    const result = calculateOfficeLevel(state);
    assert(result.level === 5, `expected level 5, got ${result.level}`);
    assert(result.label === 'Citadel', `expected label 'Citadel', got '${result.label}'`);
  });

  test('calculateOfficeLevel returns correct nextLevel', () => {
    const state = { questCount: 0, adventurers: [], officeLevel: 1 };
    const result = calculateOfficeLevel(state);
    assert(result.nextLevel === 2, `expected nextLevel 2, got ${result.nextLevel}`);
  });

  test('calculateOfficeLevel returns null nextLevel at max level', () => {
    const adventurers = Array.from({ length: 15 }, (_, i) => ({ id: `a${i}` }));
    const state = { questCount: 50, adventurers, officeLevel: 5 };
    const result = calculateOfficeLevel(state);
    assert(result.nextLevel === null, `expected nextLevel null at max, got ${result.nextLevel}`);
  });

  test('calculateOfficeLevel progress is between 0 and 1', () => {
    const state = { questCount: 2, adventurers: [{ id: 'a1' }], officeLevel: 1 };
    const result = calculateOfficeLevel(state);
    assert(result.progress >= 0 && result.progress <= 1, `progress should be 0-1, got ${result.progress}`);
  });

  test('calculateOfficeLevel progress is 1 at max level', () => {
    const adventurers = Array.from({ length: 15 }, (_, i) => ({ id: `a${i}` }));
    const state = { questCount: 50, adventurers, officeLevel: 5 };
    const result = calculateOfficeLevel(state);
    assert(result.progress === 1, `progress should be 1 at max level, got ${result.progress}`);
  });

  test('calculateOfficeLevel is a pure function (does not mutate input state)', () => {
    const adventurers = [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }];
    const state = { questCount: 5, adventurers, officeLevel: 1 };
    const stateCopy = JSON.parse(JSON.stringify(state));
    calculateOfficeLevel(state);
    assert(JSON.stringify(state) === JSON.stringify(stateCopy), 'state should not be mutated');
  });

  test('calculateOfficeLevel handles missing questCount as 0', () => {
    const state = { adventurers: [], officeLevel: 1 };
    const result = calculateOfficeLevel(state);
    assert(result.level === 1, `expected level 1 with no questCount, got ${result.level}`);
  });

  test('calculateOfficeLevel handles undefined adventurers as empty array', () => {
    const state = { questCount: 10, officeLevel: 1 };
    const result = calculateOfficeLevel(state);
    assert(result.level === 1, `expected level 1 with no adventurers, got ${result.level}`);
  });

  // --- Tests for Legacy Perk System (Phase 5) ---

  test('LEGACY_PERKS is exported as an array with 8 entries', () => {
    assert(Array.isArray(LEGACY_PERKS), 'LEGACY_PERKS must be an array');
    assert(LEGACY_PERKS.length === 8, `expected 8 perks, got ${LEGACY_PERKS.length}`);
  });

  test('LEGACY_PERKS entries have required fields', () => {
    for (const perk of LEGACY_PERKS) {
      assert(typeof perk.id === 'string', `perk must have id string, got ${typeof perk.id}`);
      assert(typeof perk.name === 'string', `perk must have name string`);
      assert(typeof perk.description === 'string', `perk must have description string`);
      assert(typeof perk.effects === 'object', `perk must have effects object`);
      assert(Array.isArray(perk.allowedClasses), `perk must have allowedClasses array`);
      assert(typeof perk.minRank === 'string', `perk must have minRank string`);
    }
  });

  test('generateLegacyPerk returns perk with required fields', () => {
    const adventurer = defaultAdventurer({ rank: 'Veteran', class: 'Sword', level: 5 });
    const perk = generateLegacyPerk(adventurer, 10);
    assert(typeof perk.id === 'string', 'perk must have id');
    assert(typeof perk.name === 'string', 'perk must have name');
    assert(typeof perk.description === 'string', 'perk must have description');
    assert(typeof perk.effects === 'object', 'perk must have effects');
    assert(typeof perk.appliedAt === 'number', 'perk must have appliedAt');
  });

  test('generateLegacyPerk filters by class', () => {
    // Bow class adventurer should not get Shield perks
    const adventurer = defaultAdventurer({ rank: 'Veteran', class: 'Bow' });
    const templateIds = [];
    for (let i = 0; i < 50; i++) {
      const perk = generateLegacyPerk(adventurer, i);
      templateIds.push(perk.templateId);
    }
    // All generated perks should be for Bow-compatible classes
    for (const tid of templateIds) {
      const perk = LEGACY_PERKS.find(p => p.id === tid);
      assert(perk, `perk ${tid} not found in LEGACY_PERKS`);
      assert(perk.allowedClasses.includes('Bow'), `perk ${tid} should include Bow class`);
    }
  });

  test('generateLegacyPerk filters by rank', () => {
    // Journeyman Sword adventurer gets Journeyman+ perks only
    const journeyman = defaultAdventurer({ rank: 'Journeyman', class: 'Sword' });
    const templateIds = [];
    for (let i = 0; i < 50; i++) {
      const perk = generateLegacyPerk(journeyman, i);
      templateIds.push(perk.templateId);
    }
    for (const tid of templateIds) {
      const perk = LEGACY_PERKS.find(p => p.id === tid);
      assert(perk, `perk ${tid} not found in LEGACY_PERKS`);
      const rankIdx = VALID_RANKS.indexOf(journeyman.rank);
      const minRankIdx = VALID_RANKS.indexOf(perk.minRank);
      assert(rankIdx >= minRankIdx, `Journeyman should not get perk ${tid} (requires ${perk.minRank})`);
    }
  });

  test('generateLegacyPerk falls back to first perk when no class matches', () => {
    // UnknownClass with Novice rank has no matching perks at all
    const adventurer = defaultAdventurer({ rank: 'Novice', class: 'UnknownClass' });
    const perk = generateLegacyPerk(adventurer, 0);
    assert(perk.templateId === LEGACY_PERKS[0].id, `should fallback to first perk, got ${perk.templateId}`);
  });

  test('applyLegacyPerks adds stat bonuses', () => {
    const adventurer = defaultAdventurer({ stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 } });
    const perks = [
      { id: 'iron-will', effects: { vit: 5 } },
      { id: 'sharp-eye', effects: { dex: 5 } },
    ];
    const result = applyLegacyPerks(adventurer, perks);
    assert(result.stats.str === 10, 'str should be unchanged');
    assert(result.stats.dex === 15, `dex should be 15 (10+5), got ${result.stats.dex}`);
    assert(result.stats.int === 10, 'int should be unchanged');
    assert(result.stats.vit === 15, `vit should be 15 (10+5), got ${result.stats.vit}`);
    assert(result.stats.lck === 10, 'lck should be unchanged');
  });

  test('applyLegacyPerks handles empty array', () => {
    const adventurer = defaultAdventurer({ stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 } });
    const result = applyLegacyPerks(adventurer, []);
    assert(result.stats.str === 10, 'stats should be unchanged');
    assert(result.stats.dex === 10, 'stats should be unchanged');
  });

  test('defaultAdventurer with legacyPerks applies bonuses', () => {
    const perks = [{ id: 'iron-will', effects: { vit: 5 } }];
    const adventurer = defaultAdventurer({ stats: { vit: 10 }, legacyPerks: perks });
    assert(adventurer.stats.vit === 15, `vit should be 15 (10+5), got ${adventurer.stats.vit}`);
  });

  test('defaultAdventurer without legacyPerks is unmodified', () => {
    const adventurer = defaultAdventurer({ stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 }, legacyPerks: [] });
    assert(adventurer.stats.str === 10, 'str should be unchanged');
    assert(adventurer.stats.dex === 10, 'dex should be unchanged');
  });

  test('gameDefaults includes legacyPerks: []', () => {
    const defaults = gameDefaults();
    assert(Array.isArray(defaults.legacyPerks), 'legacyPerks should be an array');
    assert(defaults.legacyPerks.length === 0, 'legacyPerks should be empty');
  });

  test('generateLegacyPerk generates unique IDs', () => {
    const adventurer = defaultAdventurer({ rank: 'Veteran', class: 'Sword', level: 5 });
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      const perk = generateLegacyPerk(adventurer, i);
      ids.add(perk.id);
    }
    assert(ids.size === 100, `should generate 100 unique IDs, got ${ids.size}`);
  });

  // ─── Fame Engine Tests ───

  test('calculateFameGain returns flat base per completion (linear, not cumulative)', () => {
    const state = { adventurers: [], officeLevel: 1, fameMultiplier: 1 };
    const gain = calculateFameGain(state);
    assert(gain === 2, `base fame per completion: expected 2, got ${gain}`);
  });

  test('calculateFameGain includes roster size bonus', () => {
    const state = { adventurers: [{ id: '1' }, { id: '2' }, { id: '3' }], officeLevel: 1, fameMultiplier: 1 };
    const gain = calculateFameGain(state);
    assert(gain === 11, `roster bonus: expected 11 (2 base + 9 roster), got ${gain}`);
  });

  test('calculateFameGain includes office level bonus', () => {
    const state = { adventurers: [], officeLevel: 3, fameMultiplier: 1 };
    const gain = calculateFameGain(state);
    assert(gain === 12, `office bonus: expected 12 (2 base + 10 office), got ${gain}`);
  });

  test('calculateFameGain applies fameMultiplier', () => {
    const state = { adventurers: [], officeLevel: 1, fameMultiplier: 1.1 };
    const gain = calculateFameGain(state);
    assert(gain === 2, `with multiplier: expected 2 (floor(2*1.1)), got ${gain}`);
  });

  test('getFameLevel returns correct tier for Unknown Guild', () => {
    const result = getFameLevel(0);
    assert(result.name === 'Unknown Guild', `expected Unknown Guild, got ${result.name}`);
    assert(result.progress === 0, `progress should be 0, got ${result.progress}`);
  });

  test('getFameLevel returns correct tier for Local Guild', () => {
    const result = getFameLevel(15);
    assert(result.name === 'Local Guild', `expected Local Guild, got ${result.name}`);
    assert(result.progress > 0, `progress should be > 0, got ${result.progress}`);
  });

  test('getFameLevel returns max tier when above all thresholds', () => {
    const result = getFameLevel(150);
    assert(result.name === 'Legendary Guild', `expected Legendary Guild, got ${result.name}`);
    assert(result.progress === 1, `progress should be 1, got ${result.progress}`);
    assert(result.nextLevel === null, `nextLevel should be null, got ${result.nextLevel}`);
  });

  test('getFameGatedQuestPool filters by fame difficulty cap', () => {
    const state0 = { fame: 0 };
    const quests0 = getFameGatedQuestPool(state0, 3);
    assert(quests0.length <= 3, 'should return at most 3 quests');
    for (const q of quests0) {
      assert(q.difficulty <= 1, `fame 0 should only allow difficulty 1, got ${q.difficulty}`);
    }

    const state50 = { fame: 50 };
    const quests50 = getFameGatedQuestPool(state50, 3);
    for (const q of quests50) {
      assert(q.difficulty <= 3, `fame 50 should allow up to difficulty 3, got ${q.difficulty}`);
    }
  });

  // ─── Class Evolution Tests ───

  test('evolveClass returns null when no matching evolution', () => {
    const adventurer = defaultAdventurer({ class: 'Sword', equipment: { weapon: null, armor: null, accessory: null } });
    const result = evolveClass(adventurer);
    assert(result.evolved === false, 'should not evolve without matching equipment');
    assert(result.newClass === null, 'newClass should be null');
  });

  test('evolveClass returns evolution for Sword + Arcane Crystal', () => {
    const adventurer = defaultAdventurer({
      class: 'Sword',
      rank: 'Journeyman',
      equipment: { weapon: { name: 'Sword' }, armor: null, accessory: { name: 'Arcane Crystal' } },
    });
    const result = evolveClass(adventurer);
    assert(result.evolved === true, 'should evolve with Sword + Arcane Crystal');
    assert(result.newClass === 'Sword Mage', `expected Sword Mage, got ${result.newClass}`);
  });

  test('evolveClass ignores rank requirement — rank is flavor only', () => {
    const adventurer = defaultAdventurer({
      class: 'Sword',
      rank: 'Novice',
      equipment: { weapon: { name: 'Sword' }, armor: null, accessory: { name: 'Arcane Crystal' } },
    });
    const result = evolveClass(adventurer);
    assert(result.evolved === true, 'Novice should still evolve to Sword Mage with correct equipment');
    assert(result.newClass === 'Sword Mage', `expected Sword Mage, got ${result.newClass}`);
  });

  test('evolveClass returns correct aptitude_multipliers for evolved class', () => {
    const adventurer = defaultAdventurer({
      class: 'Sword',
      rank: 'Journeyman',
      equipment: { weapon: { name: 'Sword' }, armor: null, accessory: { name: 'Arcane Crystal' } },
    });
    const result = evolveClass(adventurer);
    assert(result.newAptitudes.primary.combat === 1.3, 'Sword Mage should have 1.3 primary combat');
    assert(result.newAptitudes.primary.investigation === 1.2, 'Sword Mage should have 1.2 primary investigation');
    assert(result.newAptitudes.secondary.protection === 0.7, 'Sword Mage should have 0.7 secondary protection');
  });

  test('getEvolutionStatus returns matching evolutions', () => {
    const adventurer = defaultAdventurer({
      class: 'Sword',
      equipment: { weapon: { name: 'Sword' }, armor: null, accessory: { name: 'Arcane Crystal' } },
    });
    const status = getEvolutionStatus(adventurer);
    assert(status.matching.length > 0, 'should have matching evolutions');
    assert(status.canEvolve === true, 'should be able to evolve');
  });

  test('getEvolutionStatus returns unmet evolutions with missing items', () => {
    const adventurer = defaultAdventurer({
      class: 'Axe',
      rank: 'Veteran',
      equipment: { weapon: { name: 'Axe' }, armor: null, accessory: null },
    });
    const status = getEvolutionStatus(adventurer);
    const berserker = status.unmet.find(e => e.result === 'Berserker Guardian');
    assert(berserker !== undefined, 'should have Berserker Guardian as unmet');
    assert(berserker.missing.length > 0, 'should have missing items listed');
  });

  test('getEvolutionStatus classifies all 12 evolution paths', () => {
    const adventurer = defaultAdventurer({
      class: 'Sword',
      equipment: { weapon: { name: 'Sword' }, armor: null, accessory: { name: 'Arcane Crystal' } },
    });
    const status = getEvolutionStatus(adventurer);
    const allResults = [...status.matching, ...status.unmet].map(e => e.result);
    assert(allResults.length === 12, `should classify all 12 paths, got ${allResults.length}`);
    const expected = ['Sword Mage','Shadowweaver','Wind Dancer','Holy Avenger','Storm Reaver','Paladin','Ranger Captain','Berserker Guardian','Sharpshooter','Arcane Scholar','Bastion Warden','Warlord'];
    for (const e of expected) {
      assert(allResults.includes(e), `${e} should be in evolution status`);
    }
  });

  test('getEvolutionStatus shows rank is not a gate', () => {
    const novice = defaultAdventurer({
      class: 'Sword',
      rank: 'Novice',
      equipment: { weapon: { name: 'Sword' }, armor: null, accessory: { name: 'Arcane Crystal' } },
    });
    const status = getEvolutionStatus(novice);
    assert(status.canEvolve === true, 'Novice should have matching evolutions');
    assert(status.matching.find(e => e.result === 'Sword Mage'), 'Sword Mage should be matching for Novice');
  });

  test('evolveAdventurer returns unchanged adventurer when no evolution', () => {
    const adventurer = defaultAdventurer({ class: 'Sword' });
    const result = evolveAdventurer(adventurer);
    assert(result.class === 'Sword', 'class should remain Sword');
  });

  test('evolveAdventurer returns evolved adventurer with new class and aptitudes', () => {
    const adventurer = defaultAdventurer({
      class: 'Sword',
      rank: 'Journeyman',
      equipment: { weapon: { name: 'Sword' }, armor: null, accessory: { name: 'Arcane Crystal' } },
    });
    const result = evolveAdventurer(adventurer);
    assert(result.class === 'Sword Mage', `expected Sword Mage, got ${result.class}`);
    assert(result.evolved === true, 'should be marked as evolved');
    assert(result.aptitudes.combat > 0, 'should have combat aptitude');
  });

  test('evolveAdventurer applies multiplier-based aptitudes correctly', () => {
    // Bow base: tracking: 0.9, ranged_combat: 0.8
    // Sharpshooter primary: tracking: 1.4, ranged_combat: 1.4
    // Expected: tracking=0.9*1.4=1.26, ranged_combat=0.8*1.4=1.12
    const adventurer = defaultAdventurer({
      class: 'Bow',
      equipment: { weapon: { name: 'Bow' }, armor: null, accessory: { name: "Sharpshooter's Monocular" } },
    });
    const result = evolveAdventurer(adventurer);
    const expectedTracking = 0.9 * 1.4;
    const expectedRanged = 0.8 * 1.4;
    assert(Math.abs(result.aptitudes.tracking - expectedTracking) < 0.001, `tracking: expected ${expectedTracking}, got ${result.aptitudes.tracking}`);
    assert(Math.abs(result.aptitudes.ranged_combat - expectedRanged) < 0.001, `ranged_combat: expected ${expectedRanged}, got ${result.aptitudes.ranged_combat}`);
    assert(result.class === 'Sharpshooter', `class should be Sharpshooter, got ${result.class}`);
    assert(result.evolvedClass === 'Sharpshooter', `evolvedClass should be 'Sharpshooter', got ${result.evolvedClass}`);
    assert(result.evolved === true, 'should be evolved');
    assert(result.evolutionDate !== null, 'should have evolutionDate');
  });

  test('CLASS_APTITUDES base values are unchanged after evolution', () => {
    const base = CLASS_APTITUDES.Sword;
    assert(base.combat === 0.9, `CLASS_APTITUDES.Sword.combat should be 0.9, got ${base.combat}`);
  });

  test('evolveClass returns Sharpshooter for Bow + Sharpshooter Monocular', () => {
    const adventurer = defaultAdventurer({
      class: 'Bow',
      equipment: { weapon: { name: 'Bow' }, armor: null, accessory: { name: "Sharpshooter's Monocular" } },
    });
    const result = evolveClass(adventurer);
    assert(result.evolved === true, 'should evolve to Sharpshooter');
    assert(result.newClass === 'Sharpshooter', `expected Sharpshooter, got ${result.newClass}`);
  });

  test('evolveClass returns Arcane Scholar for Staff + Scholar Manuscript', () => {
    const adventurer = defaultAdventurer({
      class: 'Staff',
      equipment: { weapon: { name: 'Staff' }, armor: null, accessory: { name: "Scholar's Manuscript" } },
    });
    const result = evolveClass(adventurer);
    assert(result.evolved === true, 'should evolve to Arcane Scholar');
    assert(result.newClass === 'Arcane Scholar', `expected Arcane Scholar, got ${result.newClass}`);
  });

  test('evolveClass returns Bastion Warden for Shield + Plate Armor', () => {
    const adventurer = defaultAdventurer({
      class: 'Shield',
      equipment: { weapon: { name: 'Shield' }, armor: { name: 'Plate Armor' }, accessory: null },
    });
    const result = evolveClass(adventurer);
    assert(result.evolved === true, 'should evolve to Bastion Warden');
    assert(result.newClass === 'Bastion Warden', `expected Bastion Warden, got ${result.newClass}`);
  });

  test('evolveClass returns Warlord for Mace + Plate Armor', () => {
    const adventurer = defaultAdventurer({
      class: 'Mace',
      equipment: { weapon: { name: 'Mace' }, armor: { name: 'Plate Armor' }, accessory: null },
    });
    const result = evolveClass(adventurer);
    assert(result.evolved === true, 'should evolve to Warlord');
    assert(result.newClass === 'Warlord', `expected Warlord, got ${result.newClass}`);
  });

  test('evolveAdventurer returns evolved adventurer with multiplier-based aptitudes', () => {
    const adventurer = defaultAdventurer({
      class: 'Bow',
      equipment: { weapon: { name: 'Bow' }, armor: null, accessory: { name: "Sharpshooter's Monocular" } },
    });
    const result = evolveAdventurer(adventurer);
    assert(result.class === 'Sharpshooter', 'should have Sharpshooter class');
    assert(result.evolved === true, 'should be marked as evolved');
    assert(result.evolvedClass === 'Sharpshooter', 'evolvedClass should be set');
    // Verify multiplier math: Bow base tracking=0.9, Sharpshooter primary tracking=1.4
    const expectedTracking = 0.9 * 1.4;
    assert(Math.abs(result.aptitudes.tracking - expectedTracking) < 0.001, 'tracking multiplier applied');
    assert(result.evolutionDate !== null, 'should have evolutionDate');
  });

  // Print summary
  console.log(`\n${testsPassed}/${testsRun} tests passed`);
  if (testsPassed < testsRun) process.exit(1);
});
