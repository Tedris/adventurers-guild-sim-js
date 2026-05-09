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
    calculateWage,
    generateRecruitmentPool,
    calculateAptitudes,
    VALID_RANKS,
    RARITY_TIERS,
    DEFAULT_WAGE,
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
    calculateWageScale,
    calculateUpgradeCost,
    getAvailableUpgrades,
    calculateInflationPressure,
    calculateGoldSinkOpportunities,
    deductWages,
    checkMorale,
    checkDepartures,
    processQuestProgress,
    processTick,
    VALID_PERSONALITY_TRAITS,
    PERSONALITY_TRAIT_TABLE,
    generateName,
    generatePersonality,
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

  // --- Tests for calculateWage ---

  test('calculateWage returns correct wage for Novice rank', () => {
    const a = defaultAdventurer({ rank: 'Novice' });
    assert(calculateWage(a) === 2, `Novice wage should be 2, got ${calculateWage(a)}`);
  });

  test('calculateWage returns correct wage for Journeyman rank', () => {
    const a = defaultAdventurer({ rank: 'Journeyman' });
    assert(calculateWage(a) === 3, `Journeyman wage should be 3, got ${calculateWage(a)}`);
  });

  test('calculateWage returns correct wage for Veteran rank', () => {
    const a = defaultAdventurer({ rank: 'Veteran' });
    assert(calculateWage(a) === 4, `Veteran wage should be 4, got ${calculateWage(a)}`);
  });

  test('calculateWage returns correct wage for Champion rank', () => {
    const a = defaultAdventurer({ rank: 'Champion' });
    assert(calculateWage(a) === 5, `Champion wage should be 5, got ${calculateWage(a)}`);
  });

  test('calculateWage returns correct wage for Legend rank', () => {
    const a = defaultAdventurer({ rank: 'Legend' });
    assert(calculateWage(a) === 7, `Legend wage should be 7, got ${calculateWage(a)}`);
  });

  test('calculateWage adds rarity bonus for Rare equipment', () => {
    const a = defaultAdventurer({ rank: 'Novice', equipment: { weapon: { rarity: 'Rare' } } });
    const wage = calculateWage(a);
    assert(wage === 4, `Novice + Rare weapon should be 4g, got ${wage}`);
  });

  test('calculateWage adds rarity bonus for Epic equipment', () => {
    const a = defaultAdventurer({ rank: 'Novice', equipment: { weapon: { rarity: 'Epic' }, armor: { rarity: 'Rare' } } });
    const wage = calculateWage(a);
    assert(wage === 7, `Novice + Epic weapon + Rare armor should be 7g, got ${wage}`);
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

  test('generateRecruitmentPool sets rank=Novice and wage via calculateWage', () => {
    const pool = generateRecruitmentPool(2);
    for (const a of pool) {
      assert(a.rank === 'Novice', `rank should be Novice, got ${a.rank}`);
      assert(a.wage > 0, `wage should be > 0, got ${a.wage}`);
      assert(a.wage === calculateWage(a), `wage should match calculateWage`);
    }
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

  test('calculateWageScale at level 1 returns scaleFactor 1', () => {
    const adventurers = [defaultAdventurer({ rank: 'Novice' })];
    const result = calculateWageScale(adventurers, 1);
    assert(result.scaleFactor === 1, `scaleFactor at level 1 should be 1, got ${result.scaleFactor}`);
  });

  test('calculateWageScale at level 3 returns scaleFactor 1.2', () => {
    const adventurers = [defaultAdventurer({ rank: 'Novice' })];
    const result = calculateWageScale(adventurers, 3);
    assert(result.scaleFactor === 1.2, `scaleFactor at level 3 should be 1.2, got ${result.scaleFactor}`);
  });

  test('calculateWageScale with fame > 50 applies 10% discount', () => {
    const adventurers = [defaultAdventurer({ rank: 'Novice' })];
    const result = calculateWageScale(adventurers, 1, 60);
    assert(result.fameDiscount === 0.1, `fameDiscount should be 0.1, got ${result.fameDiscount}`);
  });

  test('calculateWageScale with fame > 100 applies 20% discount', () => {
    const adventurers = [defaultAdventurer({ rank: 'Novice' })];
    const result = calculateWageScale(adventurers, 1, 120);
    assert(result.fameDiscount === 0.2, `fameDiscount should be 0.2, got ${result.fameDiscount}`);
  });

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

  test('calculateInflationPressure low ratio returns low pressure', () => {
    const state = { gold: 10, adventurers: [{ id: 'a1' }, { id: 'a2' }] };
    const result = calculateInflationPressure(state);
    assert(result.pressure === 'low', `low ratio should give low pressure, got ${result.pressure}`);
  });

  test('calculateInflationPressure high ratio returns high pressure', () => {
    const state = { gold: 500, adventurers: [{ id: 'a1' }] };
    const result = calculateInflationPressure(state);
    assert(result.pressure === 'high', `high ratio should give high pressure, got ${result.pressure}`);
  });

  // --- Tests for tick processor ---

  test('deductWages deducts correct total from gold', () => {
    const adventurer1 = defaultAdventurer({ rank: 'Novice', wage: 2 });
    const adventurer2 = defaultAdventurer({ rank: 'Journeyman', wage: 3 });
    const state = { gold: 100, adventurers: [adventurer1, adventurer2] };
    const result = deductWages(state);
    assert(result.deducted === 5, `should deduct 5 (2+3), got ${result.deducted}`);
    assert(result.remainingGold === 95, `remaining should be 95, got ${result.remainingGold}`);
  });

  test('deductWages with insufficient gold deducts what is available', () => {
    const adventurer = defaultAdventurer({ rank: 'Veteran', wage: 4 });
    const state = { gold: 2, adventurers: [adventurer] };
    const result = deductWages(state);
    assert(result.deducted === 2, `should deduct 2 (all gold), got ${result.deducted}`);
    assert(result.unpaid === true, 'should mark as unpaid');
  });

  test('deductWages with no adventurers returns 0 deduction', () => {
    const state = { gold: 100, adventurers: [] };
    const result = deductWages(state);
    assert(result.deducted === 0, 'should deduct 0 with no adventurers');
  });

  test('checkMorale applies base decay (-1 per 10 ticks)', () => {
    const adventurer = defaultAdventurer({ morale: 50 });
    const state = { gold: 100, adventurers: [adventurer], guildLevel: 1, fame: 0 };
    const result = checkMorale(state, 20);
    assert(result.adjustedAdventurers[0].morale === 48, `morale should decay by 2 (20 ticks / 10), got ${result.adjustedAdventurers[0].morale}`);
  });

  test('checkMorale applies low gold penalty', () => {
    const adventurer = defaultAdventurer({ rank: 'Novice', morale: 50 });
    const state = { gold: 1, adventurers: [adventurer], guildLevel: 1, fame: 0 };
    const result = checkMorale(state, 5);
    assert(result.adjustedAdventurers[0].morale < 50, `morale should decrease with low gold, got ${result.adjustedAdventurers[0].morale}`);
  });

  test('checkDepartures removes adventurers with morale <= 0', () => {
    const alive = defaultAdventurer({ morale: 50 });
    const departed = defaultAdventurer({ morale: 0 });
    const state = { gold: 100, adventurers: [alive, departed] };
    const result = checkDepartures(state);
    assert(result.departed.length === 1, 'one adventurer should have departed');
    assert(result.remaining.length === 1, 'one adventurer should remain');
  });

  test('checkDepartures keeps adventurers with morale > 0', () => {
    const adventurer = defaultAdventurer({ morale: 10 });
    const state = { gold: 100, adventurers: [adventurer] };
    const result = checkDepartures(state);
    assert(result.remaining.length === 1, 'adventurer should remain with positive morale');
  });

  test('processTick advances day', () => {
    const state = { gold: 100, adventurers: [], day: 10, guildLevel: 1, fame: 0 };
    const result = processTick(state, 1);
    assert(result.day === 11, `day should advance by 1, got ${result.day}`);
  });

  // --- Tests for name generation and personality traits ---

  test('VALID_PERSONALITY_TRAITS has exactly 25 entries', () => {
    assert(VALID_PERSONALITY_TRAITS.length === 25, `expected 25 traits, got ${VALID_PERSONALITY_TRAITS.length}`);
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

  // Print summary
  console.log(`\n${testsPassed}/${testsRun} tests passed`);
  if (testsPassed < testsRun) process.exit(1);
});
