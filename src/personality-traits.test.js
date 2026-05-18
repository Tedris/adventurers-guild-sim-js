// Adventurers Guild Simulator — Personality Trait Tests
// Tests for personality traits: new v1.2 traits, aptitude_bonus, and calculateAptitudes

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
    calculateAptitudes,
    VALID_PERSONALITY_TRAITS,
    PERSONALITY_TRAIT_TABLE,
    generatePersonality,
  } = module;

  // --- Tests for new traits in VALID_PERSONALITY_TRAITS ---

  test('VALID_PERSONALITY_TRAITS includes all 10 new traits', () => {
    const newTraits = [
      'Arcane Prodigy', 'Dreamwalker', 'Spirit-Talker', 'Starborn', 'Void-Watcher',
      'Iron-Willed', 'Ascetic', 'Devout', 'Stoic', 'Zealous',
    ];
    for (const trait of newTraits) {
      assert(VALID_PERSONALITY_TRAITS.includes(trait), `VALID_PERSONALITY_TRAITS must include ${trait}`);
    }
  });

  test('VALID_PERSONALITY_TRAITS has 35 total traits (25 original + 10 new)', () => {
    assert(VALID_PERSONALITY_TRAITS.length === 35, `Expected 35 traits, got ${VALID_PERSONALITY_TRAITS.length}`);
  });

  // --- Tests for new traits in PERSONALITY_TRAIT_TABLE ---

  test('PERSONALITY_TRAIT_TABLE includes all 10 new traits', () => {
    const newTraits = [
      'Arcane Prodigy', 'Dreamwalker', 'Spirit-Talker', 'Starborn', 'Void-Watcher',
      'Iron-Willed', 'Ascetic', 'Devout', 'Stoic', 'Zealous',
    ];
    for (const trait of newTraits) {
      assert(PERSONALITY_TRAIT_TABLE[trait] !== undefined, `PERSONALITY_TRAIT_TABLE must include ${trait}`);
    }
  });

  test('Mystical traits have correct morale values', () => {
    assert(PERSONALITY_TRAIT_TABLE['Arcane Prodigy'].morale === 2, 'Arcane Prodigy morale should be 2');
    assert(PERSONALITY_TRAIT_TABLE['Dreamwalker'].morale === 5, 'Dreamwalker morale should be 5');
    assert(PERSONALITY_TRAIT_TABLE['Spirit-Talker'].morale === 3, 'Spirit-Talker morale should be 3');
    assert(PERSONALITY_TRAIT_TABLE['Starborn'].morale === 4, 'Starborn morale should be 4');
    assert(PERSONALITY_TRAIT_TABLE['Void-Watcher'].morale === -2, 'Void-Watcher morale should be -2');
  });

  test('Disciplined traits have correct morale values', () => {
    assert(PERSONALITY_TRAIT_TABLE['Iron-Willed'].morale === 6, 'Iron-Willed morale should be 6');
    assert(PERSONALITY_TRAIT_TABLE['Ascetic'].morale === 4, 'Ascetic morale should be 4');
    assert(PERSONALITY_TRAIT_TABLE['Devout'].morale === 5, 'Devout morale should be 5');
    assert(PERSONALITY_TRAIT_TABLE['Stoic'].morale === 3, 'Stoic morale should be 3');
    assert(PERSONALITY_TRAIT_TABLE['Zealous'].morale === -5, 'Zealous morale should be -5');
  });

  test('Mystical traits have correct quest_success values', () => {
    assert(PERSONALITY_TRAIT_TABLE['Arcane Prodigy'].quest_success === 3, 'Arcane Prodigy quest_success should be 3');
    assert(PERSONALITY_TRAIT_TABLE['Dreamwalker'].quest_success === 1, 'Dreamwalker quest_success should be 1');
    assert(PERSONALITY_TRAIT_TABLE['Spirit-Talker'].quest_success === 2, 'Spirit-Talker quest_success should be 2');
    assert(PERSONALITY_TRAIT_TABLE['Starborn'].quest_success === 2, 'Starborn quest_success should be 2');
    assert(PERSONALITY_TRAIT_TABLE['Void-Watcher'].quest_success === 4, 'Void-Watcher quest_success should be 4');
  });

  test('Disciplined traits have correct quest_success values', () => {
    assert(PERSONALITY_TRAIT_TABLE['Iron-Willed'].quest_success === 1, 'Iron-Willed quest_success should be 1');
    assert(PERSONALITY_TRAIT_TABLE['Ascetic'].quest_success === 2, 'Ascetic quest_success should be 2');
    assert(PERSONALITY_TRAIT_TABLE['Devout'].quest_success === 2, 'Devout quest_success should be 2');
    assert(PERSONALITY_TRAIT_TABLE['Stoic'].quest_success === 1, 'Stoic quest_success should be 1');
    assert(PERSONALITY_TRAIT_TABLE['Zealous'].quest_success === 5, 'Zealous quest_success should be 5');
  });

  // --- Tests for aptitude_bonus ---

  test('Mystical traits have aptitude_bonus defined', () => {
    assert(PERSONALITY_TRAIT_TABLE['Arcane Prodigy'].aptitude_bonus !== undefined, 'Arcane Prodigy must have aptitude_bonus');
    assert(PERSONALITY_TRAIT_TABLE['Dreamwalker'].aptitude_bonus !== undefined, 'Dreamwalker must have aptitude_bonus');
    assert(PERSONALITY_TRAIT_TABLE['Spirit-Talker'].aptitude_bonus !== undefined, 'Spirit-Talker must have aptitude_bonus');
    assert(PERSONALITY_TRAIT_TABLE['Starborn'].aptitude_bonus !== undefined, 'Starborn must have aptitude_bonus');
    assert(PERSONALITY_TRAIT_TABLE['Void-Watcher'].aptitude_bonus !== undefined, 'Void-Watcher must have aptitude_bonus');
  });

  test('Disciplined traits have aptitude_bonus defined', () => {
    assert(PERSONALITY_TRAIT_TABLE['Iron-Willed'].aptitude_bonus !== undefined, 'Iron-Willed must have aptitude_bonus');
    assert(PERSONALITY_TRAIT_TABLE['Ascetic'].aptitude_bonus !== undefined, 'Ascetic must have aptitude_bonus');
    assert(PERSONALITY_TRAIT_TABLE['Devout'].aptitude_bonus !== undefined, 'Devout must have aptitude_bonus');
    assert(PERSONALITY_TRAIT_TABLE['Stoic'].aptitude_bonus !== undefined, 'Stoic must have aptitude_bonus');
    assert(PERSONALITY_TRAIT_TABLE['Zealous'].aptitude_bonus !== undefined, 'Zealous must have aptitude_bonus');
  });

  test('Mystical traits have correct aptitude_bonus values', () => {
    assert(PERSONALITY_TRAIT_TABLE['Arcane Prodigy'].aptitude_bonus.investigation === 0.03, 'Arcane Prodigy should give +0.03 investigation');
    assert(PERSONALITY_TRAIT_TABLE['Dreamwalker'].aptitude_bonus.all === 0.01, 'Dreamwalker should give +0.01 to all');
    assert(PERSONALITY_TRAIT_TABLE['Spirit-Talker'].aptitude_bonus.herb_gathering === 0.02, 'Spirit-Talker should give +0.02 herb_gathering');
    assert(PERSONALITY_TRAIT_TABLE['Starborn'].aptitude_bonus.all === 0.02, 'Starborn should give +0.02 to all');
    assert(PERSONALITY_TRAIT_TABLE['Void-Watcher'].aptitude_bonus.stealth === 0.04, 'Void-Watcher should give +0.04 stealth');
  });

  test('Disciplined traits have correct aptitude_bonus values', () => {
    assert(PERSONALITY_TRAIT_TABLE['Iron-Willed'].aptitude_bonus.defense === 0.01, 'Iron-Willed should give +0.01 defense');
    assert(PERSONALITY_TRAIT_TABLE['Ascetic'].aptitude_bonus.protection === 0.02, 'Ascetic should give +0.02 protection');
    assert(PERSONALITY_TRAIT_TABLE['Devout'].aptitude_bonus.protection === 0.02, 'Devout should give +0.02 protection');
    assert(PERSONALITY_TRAIT_TABLE['Stoic'].aptitude_bonus.defense === 0.01, 'Stoic should give +0.01 defense');
    assert(PERSONALITY_TRAIT_TABLE['Zealous'].aptitude_bonus.combat === 0.05, 'Zealous should give +0.05 combat');
  });

  // --- Tests for calculateAptitudes with new traits ---

  test('calculateAptitudes applies Arcane Prodigy investigation bonus', () => {
    const adventurer = defaultAdventurer({
      class: 'Staff',
      personality: { traits: ['Arcane Prodigy'] },
    });
    const aptitudes = calculateAptitudes(adventurer);
    assert(aptitudes.investigation !== undefined, 'Should have investigation aptitude');
    assert(aptitudes.investigation >= 0.73, `Investigation should be >= 0.73 (0.7 base + 0.03 bonus), got ${aptitudes.investigation}`);
  });

  test('calculateAptitudes applies Void-Watcher stealth bonus', () => {
    const adventurer = defaultAdventurer({
      class: 'Dagger',
      personality: { traits: ['Void-Watcher'] },
    });
    const aptitudes = calculateAptitudes(adventurer);
    assert(aptitudes.stealth !== undefined, 'Should have stealth aptitude');
    assert(aptitudes.stealth >= 0.94, `Stealth should be >= 0.94 (0.9 base + 0.04 bonus), got ${aptitudes.stealth}`);
  });

  test('calculateAptitudes applies Zealous combat bonus', () => {
    const adventurer = defaultAdventurer({
      class: 'Sword',
      personality: { traits: ['Zealous'] },
    });
    const aptitudes = calculateAptitudes(adventurer);
    assert(aptitudes.combat !== undefined, 'Should have combat aptitude');
    assert(aptitudes.combat >= 0.95, `Combat should be >= 0.95 (0.9 base + 0.05 bonus), got ${aptitudes.combat}`);
  });

  test('calculateAptitudes applies Dreamwalker all aptitudes bonus', () => {
    const adventurer = defaultAdventurer({
      class: 'Bow',
      personality: { traits: ['Dreamwalker'] },
    });
    const aptitudes = calculateAptitudes(adventurer);
    // Should apply to all base aptitudes (tracking and ranged_combat for Bow)
    assert(aptitudes.tracking >= 0.91, `Tracking should be >= 0.91 (0.9 base + 0.01), got ${aptitudes.tracking}`);
    assert(aptitudes.ranged_combat >= 0.81, `Ranged combat should be >= 0.81 (0.8 base + 0.01), got ${aptitudes.ranged_combat}`);
  });

  test('calculateAptitudes applies multiple trait bonuses correctly', () => {
    const adventurer = defaultAdventurer({
      class: 'Staff',
      personality: { traits: ['Arcane Prodigy', 'Spirit-Talker'] },
    });
    const aptitudes = calculateAptitudes(adventurer);
    // Arcane Prodigy gives +0.03 investigation, Spirit-Talker gives +0.02 herb_gathering
    assert(aptitudes.investigation >= 0.73, `Investigation should be >= 0.73 (0.7 base + 0.03), got ${aptitudes.investigation}`);
    assert(aptitudes.herb_gathering >= 0.82, `Herb gathering should be >= 0.82 (0.8 base + 0.02), got ${aptitudes.herb_gathering}`);
  });

  test('calculateAptitudes works without aptitude_bonus (backward compatibility)', () => {
    const adventurer = defaultAdventurer({
      class: 'Sword',
      personality: { traits: ['Brave'] },
    });
    const aptitudes = calculateAptitudes(adventurer);
    // Brave has no aptitude_bonus, should return base aptitudes
    assert(aptitudes.combat === 0.9, `Combat should be 0.9 (base), got ${aptitudes.combat}`);
  });

  test('Spirit-Talker applies herb_gathering bonus', () => {
    const adventurer = defaultAdventurer({
      class: 'Staff',
      personality: { traits: ['Spirit-Talker'] },
    });
    const aptitudes = calculateAptitudes(adventurer);
    assert(aptitudes.herb_gathering >= 0.82, `Herb gathering should be >= 0.82 (0.8 base + 0.02), got ${aptitudes.herb_gathering}`);
  });

  test('Iron-Willed applies defense bonus', () => {
    const adventurer = defaultAdventurer({
      class: 'Shield',
      personality: { traits: ['Iron-Willed'] },
    });
    const aptitudes = calculateAptitudes(adventurer);
    assert(aptitudes.defense >= 0.91, `Defense should be >= 0.91 (0.9 base + 0.01), got ${aptitudes.defense}`);
  });

  test('Ascetic applies protection bonus', () => {
    const adventurer = defaultAdventurer({
      class: 'Shield',
      personality: { traits: ['Ascetic'] },
    });
    const aptitudes = calculateAptitudes(adventurer);
    assert(aptitudes.protection >= 0.72, `Protection should be >= 0.72 (0.7 base + 0.02), got ${aptitudes.protection}`);
  });

  // --- Tests for trait generation with new traits ---

  test('generatePersonality can generate new traits', () => {
    const personality = generatePersonality(5);
    const allTraits = [...VALID_PERSONALITY_TRAITS];
    for (const trait of personality.traits) {
      assert(allTraits.includes(trait), `Generated trait ${trait} must be valid`);
    }
  });

  test('generatePersonality respects trait count', () => {
    const personality = generatePersonality(1);
    assert(personality.traits.length >= 1 && personality.traits.length <= 3, 'Should generate 1-3 traits');
  });

  // --- Summary ---

  console.log(`\nTests run: ${testsRun}, Passed: ${testsPassed}`);
  if (testsRun !== testsPassed) {
    console.log(`✗ ${testsRun - testsPassed} test(s) failed`);
    process.exit(1);
  }
  console.log('✓ All personality trait tests passed');
});
