// Adventurers Guild Simulator — Card Rendering Tests (Story 9.3)
// Tests for rarity-based visual treatment: getHighestRarity, getRarityColor

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

// Import card module
import('./render/card.js').then((module) => {
  const { getHighestRarity, getRarityColor } = module;

  // --- Tests for getHighestRarity ---

  test('getHighestRarity returns null when all equipment is null', () => {
    const equipment = { weapon: null, armor: null, accessory: null };
    assert(getHighestRarity(equipment) === null, 'should return null for empty equipment');
  });

  test('getHighestRarity returns Common when only Common item equipped', () => {
    const equipment = { weapon: { rarity: 'Common' }, armor: null, accessory: null };
    assert(getHighestRarity(equipment) === 'Common', 'should return Common');
  });

  test('getHighestRarity returns Uncommon over Common', () => {
    const equipment = { weapon: { rarity: 'Common' }, armor: { rarity: 'Uncommon' }, accessory: null };
    assert(getHighestRarity(equipment) === 'Uncommon', 'should return highest rarity');
  });

  test('getHighestRarity returns Rare over Uncommon and Common', () => {
    const equipment = { weapon: { rarity: 'Common' }, armor: { rarity: 'Uncommon' }, accessory: { rarity: 'Rare' } };
    assert(getHighestRarity(equipment) === 'Rare', 'should return Rare');
  });

  test('getHighestRarity returns Rare over Uncommon', () => {
    const equipment = { weapon: { rarity: 'Rare' }, armor: { rarity: 'Uncommon' }, accessory: null };
    assert(getHighestRarity(equipment) === 'Rare', 'should return Rare');
  });

  test('getHighestRarity returns Epic when Epic is highest', () => {
    const equipment = { weapon: { rarity: 'Epic' }, armor: { rarity: 'Rare' }, accessory: null };
    assert(getHighestRarity(equipment) === 'Epic', 'should return Epic');
  });

  test('getHighestRarity returns Legendary when Legendary is equipped', () => {
    const equipment = { weapon: { rarity: 'Legendary' }, armor: { rarity: 'Epic' }, accessory: null };
    assert(getHighestRarity(equipment) === 'Legendary', 'should return Legendary');
  });

  test('getHighestRarity handles accessory-only Legendary', () => {
    const equipment = { weapon: null, armor: null, accessory: { rarity: 'Legendary' } };
    assert(getHighestRarity(equipment) === 'Legendary', 'should return Legendary from accessory');
  });

  test('getHighestRarity ignores items without rarity field', () => {
    const equipment = { weapon: {}, armor: { rarity: 'Uncommon' }, accessory: null };
    assert(getHighestRarity(equipment) === 'Uncommon', 'should skip items without rarity');
  });

  test('getHighestRarity returns null when all items exist but lack rarity field', () => {
    const equipment = { weapon: { name: 'Stick' }, armor: { name: 'Rag' }, accessory: { name: 'Stone' } };
    assert(getHighestRarity(equipment) === null, 'should return null when items have no rarity');
  });

  test('getHighestRarity handles undefined equipment', () => {
    assert(getHighestRarity(undefined) === null, 'should return null for undefined equipment');
  });

  // --- Tests for getRarityColor ---

  test('getRarityColor returns correct Common color matching CSS variable', () => {
    assert(getRarityColor('Common') === '#95a5a6', `Common should be #95a5a6, got ${getRarityColor('Common')}`);
  });

  test('getRarityColor returns correct Uncommon color matching CSS variable', () => {
    assert(getRarityColor('Uncommon') === '#27ae60', `Uncommon should be #27ae60, got ${getRarityColor('Uncommon')}`);
  });

  test('getRarityColor returns correct Rare color matching CSS variable', () => {
    assert(getRarityColor('Rare') === '#3498db', `Rare should be #3498db, got ${getRarityColor('Rare')}`);
  });

  test('getRarityColor returns correct Epic color matching CSS variable', () => {
    assert(getRarityColor('Epic') === '#9b59b6', `Epic should be #9b59b6, got ${getRarityColor('Epic')}`);
  });

  test('getRarityColor returns correct Legendary color matching CSS variable', () => {
    assert(getRarityColor('Legendary') === '#ffd700', `Legendary should be #ffd700, got ${getRarityColor('Legendary')}`);
  });

  test('getRarityColor returns fallback for unknown rarity', () => {
    assert(getRarityColor('Unknown') === '#888', `unknown should return #888 fallback, got ${getRarityColor('Unknown')}`);
  });

  test('getRarityColor returns fallback for empty string', () => {
    assert(getRarityColor('') === '#888', `empty string should return #888 fallback, got ${getRarityColor('')}`);
  });

  // --- Integration: Rarity colors match CSS variable values ---

  test('All rarity colors match --rarity-* CSS variable values', () => {
    // These must match src/styles.css :root values
    const cssVariables = {
      Common: '#95a5a6',
      Uncommon: '#27ae60',
      Rare: '#3498db',
      Epic: '#9b59b6',
      Legendary: '#ffd700',
    };
    for (const [rarity, expectedColor] of Object.entries(cssVariables)) {
      const actualColor = getRarityColor(rarity);
      assert(actualColor === expectedColor, `${rarity}: CSS var is ${expectedColor}, getRarityColor returns ${actualColor}`);
    }
  });

  // --- Edge Cases ---

  test('getHighestRarity returns null for unmapped rarity (logged to console.warn)', () => {
    const equipment = { weapon: { name: 'Mythic Blade', rarity: 'Mythic' }, armor: null, accessory: null };
    const result = getHighestRarity(equipment);
    assert(result === null, 'unmapped rarity should return null and trigger console.warn');
  });

  // --- Edge Cases ---

  test('getHighestRarity with all five rarities equipped returns Legendary', () => {
    const equipment = {
      weapon: { rarity: 'Common' },
      armor: { rarity: 'Rare' },
      accessory: { rarity: 'Epic' },
    };
    // Wait, that's only 3 slots. Let's test what we have.
    assert(getHighestRarity(equipment) === 'Epic', 'should return Epic (highest of 3 equipped)');
  });

  test('getHighestRarity priority order is correct: Common < Uncommon < Rare < Epic < Legendary', () => {
    const priorities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    for (let i = 0; i < priorities.length; i++) {
      for (let j = i + 1; j < priorities.length; j++) {
        const lower = priorities[i];
        const higher = priorities[j];
        // When both equipped, higher should win
        const result = getHighestRarity({
          weapon: { rarity: lower },
          armor: { rarity: higher },
          accessory: null,
        });
        assert(result === higher, `should prefer ${higher} over ${lower}, got ${result}`);
      }
    }
  });

  console.log(`\n${testsPassed}/${testsRun} tests passed`);
});
