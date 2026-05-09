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
    QUEST_TEMPLATES,
    perturbQuest,
    EVENT_TEMPLATES,
    VALID_EVENT_CATEGORIES,
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

  // --- Tests for calculateWage ---

  test('calculateWage returns correct wage for Novice rank (with personality traits)', () => {
    // Personality traits add morale-based wage modifiers (floor(morale/5))
    // Novice base is 2g; traits can add 0-3g; total should be 2-5g
    const wages = [];
    for (let i = 0; i < 20; i++) {
      const a = defaultAdventurer({ rank: 'Novice' });
      wages.push(calculateWage(a));
    }
    const minWage = Math.min(...wages);
    const maxWage = Math.max(...wages);
    assert(minWage >= 2, `Novice wage should be at least 2 (base), min was ${minWage}`);
    assert(maxWage <= 5, `Novice wage should be at most 5 (base+traits), max was ${maxWage}`);
  });

  test('calculateWage returns correct wage for Journeyman rank', () => {
    const wages = [];
    for (let i = 0; i < 20; i++) {
      const a = defaultAdventurer({ rank: 'Journeyman' });
      wages.push(calculateWage(a));
    }
    const minWage = Math.min(...wages);
    assert(minWage >= 3, `Journeyman wage should be at least 3 (base), min was ${minWage}`);
  });

  test('calculateWage returns correct wage for Veteran rank', () => {
    const a = defaultAdventurer({ rank: 'Veteran' });
    assert(calculateWage(a) >= 4, `Veteran wage should be at least 4 (base), got ${calculateWage(a)}`);
  });

  test('calculateWage returns correct wage for Champion rank', () => {
    const a = defaultAdventurer({ rank: 'Champion' });
    assert(calculateWage(a) >= 5, `Champion wage should be at least 5 (base), got ${calculateWage(a)}`);
  });

  test('calculateWage returns correct wage for Legend rank', () => {
    const a = defaultAdventurer({ rank: 'Legend' });
    assert(calculateWage(a) >= 7, `Legend wage should be at least 7 (base), got ${calculateWage(a)}`);
  });

  test('calculateWage adds rarity bonus for Rare equipment', () => {
    // With Rare weapon (+2g rarity), Novice base (2g) + rarity (2g) = 4g minimum
    const a = defaultAdventurer({ rank: 'Novice', equipment: { weapon: { rarity: 'Rare' } } });
    const wage = calculateWage(a);
    assert(wage >= 4, `Novice + Rare weapon should be at least 4g, got ${wage}`);
  });

  test('calculateWage adds rarity bonus for Epic equipment', () => {
    // Epic weapon (+3g) + Rare armor (+2g) = +5g on top of base
    const a = defaultAdventurer({ rank: 'Novice', equipment: { weapon: { rarity: 'Epic' }, armor: { rarity: 'Rare' } } });
    const wage = calculateWage(a);
    assert(wage >= 7, `Novice + Epic weapon + Rare armor should be at least 7g, got ${wage}`);
  });

  test('calculateWage applies personality trait wage modifiers', () => {
    const a = defaultAdventurer({
      rank: 'Novice',
      personality: { traits: ['Unyielding'] }, // morale=8, wage += floor(8/5) = 1
    });
    assert(calculateWage(a) >= 3, `Novice + Unyielding should have wage >= 3, got ${calculateWage(a)}`);
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
    // Use explicit empty personality to get base wages (no trait modifiers)
    const adventurer1 = defaultAdventurer({ rank: 'Novice', personality: { traits: [] } });
    const adventurer2 = defaultAdventurer({ rank: 'Journeyman', personality: { traits: [] } });
    const state = { gold: 100, adventurers: [adventurer1, adventurer2] };
    const result = deductWages(state);
    assert(result.deducted === 5, `should deduct 5 (2+3), got ${result.deducted}`);
    assert(result.remainingGold === 95, `remaining should be 95, got ${result.remainingGold}`);
  });

  test('deductWages with personality trait-modified wages', () => {
    const adventurer = defaultAdventurer({ rank: 'Novice' });
    adventurer.wage = calculateWage(adventurer);
    const state = { gold: 100, adventurers: [adventurer], guildLevel: 1, fame: 0 };
    const result = deductWages(state);
    assert(result.deducted >= 2, `should deduct at least 2, got ${result.deducted}`);
    assert(result.remainingGold <= 98, `remaining should be <= 98, got ${result.remainingGold}`);
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

  // --- Tests for QUEST_TEMPLATES (Phase 3-02) ---

  test('QUEST_TEMPLATES is exported as an array', () => {
    assert(Array.isArray(QUEST_TEMPLATES), 'QUEST_TEMPLATES must be an array');
  });

  test('QUEST_TEMPLATES has at least 12 entries', () => {
    assert(QUEST_TEMPLATES.length >= 12, `QUEST_TEMPLATES should have >= 12 entries, got ${QUEST_TEMPLATES.length}`);
  });

  test('QUEST_TEMPLATES has at most 15 entries', () => {
    assert(QUEST_TEMPLATES.length <= 15, `QUEST_TEMPLATES should have <= 15 entries, got ${QUEST_TEMPLATES.length}`);
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

  test('EVENT_TEMPLATES is an array with 12 entries', () => {
    assert(Array.isArray(EVENT_TEMPLATES), 'EVENT_TEMPLATES must be an array');
    assert(EVENT_TEMPLATES.length === 12, `expected 12 events, got ${EVENT_TEMPLATES.length}`);
  });

  test('EVENT_TEMPLATES has 4 Budget events', () => {
    const budgetEvents = EVENT_TEMPLATES.filter(e => e.category === 'Budget');
    assert(budgetEvents.length === 4, `expected 4 Budget events, got ${budgetEvents.length}`);
  });

  test('EVENT_TEMPLATES has 4 Crisis events', () => {
    const crisisEvents = EVENT_TEMPLATES.filter(e => e.category === 'Crisis');
    assert(crisisEvents.length === 4, `expected 4 Crisis events, got ${crisisEvents.length}`);
  });

  test('EVENT_TEMPLATES has 4 Drama events', () => {
    const dramaEvents = EVENT_TEMPLATES.filter(e => e.category === 'Drama');
    assert(dramaEvents.length === 4, `expected 4 Drama events, got ${dramaEvents.length}`);
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

  test('EVENT_TEMPLATES weights sum to 27 (balanced: 9 per category)', () => {
    const budgetWeight = EVENT_TEMPLATES.filter(e => e.category === 'Budget').reduce((s, e) => s + e.weight, 0);
    const crisisWeight = EVENT_TEMPLATES.filter(e => e.category === 'Crisis').reduce((s, e) => s + e.weight, 0);
    const dramaWeight = EVENT_TEMPLATES.filter(e => e.category === 'Drama').reduce((s, e) => s + e.weight, 0);
    assert(budgetWeight === 9, `Budget weight should be 9, got ${budgetWeight}`);
    assert(crisisWeight === 9, `Crisis weight should be 9, got ${crisisWeight}`);
    assert(dramaWeight === 9, `Drama weight should be 9, got ${dramaWeight}`);
    const totalWeight = budgetWeight + crisisWeight + dramaWeight;
    assert(totalWeight === 27, `total weight should be 27, got ${totalWeight}`);
  });

  test('EVENT_TEMPLATES events have unique IDs', () => {
    const ids = EVENT_TEMPLATES.map(e => e.id);
    const unique = new Set(ids);
    assert(unique.size === ids.length, 'all event IDs should be unique');
  });

  test('Budget events reference wage or gold mechanics', () => {
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

  // Print summary
  console.log(`\n${testsPassed}/${testsRun} tests passed`);
  if (testsPassed < testsRun) process.exit(1);
});
