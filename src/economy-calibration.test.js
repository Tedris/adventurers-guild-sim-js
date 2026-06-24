// Adventurers Guild Simulator — Economy Calibration Tests (Story 8.6)
// Tests for economy balance: upgrade costs, gold income, quest rewards, progression

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
    calculateUpgradeCost,
    UPGRADE_EFFECTS,
    QUEST_TEMPLATES,
  } = module;

  const ECONOMY_TARGETS = {
    1: { gold: [10, 15], xp: [20, 25] },
    2: { gold: [20, 35], xp: [30, 40] },
    3: { gold: [40, 50], xp: [50, 55] },
    4: { gold: [55, 70], xp: [60, 80] },
    5: { gold: [90, 100], xp: [110, 120] },
  };

  // ═══ AC 1: Upgrade Cost Curve Validation ═══

  test('calculateUpgradeCost uses documented base costs (office=50, equipment=30, job_postings=15)', () => {
    assert(calculateUpgradeCost('office', 0) === 50, `office L0 should be 50, got ${calculateUpgradeCost('office', 0)}`);
    assert(calculateUpgradeCost('equipment', 0) === 30, `equipment L0 should be 30, got ${calculateUpgradeCost('equipment', 0)}`);
    assert(calculateUpgradeCost('job_postings', 0) === 15, `job_postings L0 should be 15, got ${calculateUpgradeCost('job_postings', 0)}`);
  });

  test('UPGRADE_EFFECTS has all 3 upgrade types', () => {
    assert(UPGRADE_EFFECTS.office, 'office must have effects');
    assert(UPGRADE_EFFECTS.equipment, 'equipment must have effects');
    assert(UPGRADE_EFFECTS.job_postings, 'job_postings must have effects');
  });

  test('calculateUpgradeCost follows formula for office', () => {
    for (let level = 0; level <= 10; level++) {
      const expected = Math.floor(50 * Math.pow(1.5, level));
      const actual = calculateUpgradeCost('office', level);
      assert(actual === expected, `office L${level}: expected ${expected}, got ${actual}`);
    }
  });

  test('calculateUpgradeCost follows formula for equipment', () => {
    for (let level = 0; level <= 10; level++) {
      const expected = Math.floor(30 * Math.pow(1.5, level));
      const actual = calculateUpgradeCost('equipment', level);
      assert(actual === expected, `equipment L${level}: expected ${expected}, got ${actual}`);
    }
  });

  test('calculateUpgradeCost follows formula for job_postings', () => {
    for (let level = 0; level <= 10; level++) {
      const expected = Math.floor(15 * Math.pow(1.5, level));
      const actual = calculateUpgradeCost('job_postings', level);
      assert(actual === expected, `job_postings L${level}: expected ${expected}, got ${actual}`);
    }
  });

  test('calculateUpgradeCost uses default base cost of 30 for unknown upgrade types', () => {
    const actual = calculateUpgradeCost('unknown_type', 1);
    const expected = Math.floor(30 * Math.pow(1.5, 1));
    assert(actual === expected, `unknown type L1: expected ${expected}, got ${actual}`);
  });

  test('calculateUpgradeCost with level 0 returns base cost', () => {
    assert(calculateUpgradeCost('office', 0) === 50, 'office L0 should be 50');
    assert(calculateUpgradeCost('equipment', 0) === 30, 'equipment L0 should be 30');
    assert(calculateUpgradeCost('job_postings', 0) === 15, 'job_postings L0 should be 15');
  });

  test('calculateUpgradeCost with undefined/zero level returns base cost', () => {
    assert(calculateUpgradeCost('office', undefined) === 50, 'office undefined level should return base');
    assert(calculateUpgradeCost('office', 0) === 50, 'office zero level should return base');
  });

  test('Cost scaling is consistent: 1.5x per level for all upgrade types', () => {
    const types = ['office', 'equipment', 'job_postings'];
    for (const type of types) {
      for (let level = 1; level <= 9; level++) {
        const cost = calculateUpgradeCost(type, level);
        const prevCost = calculateUpgradeCost(type, level - 1);
        const ratio = cost / prevCost;
        assert(ratio >= 1.45 && ratio <= 1.55, `${type} L${level-1}->L${level}: ratio ${ratio.toFixed(3)} should be ~1.5`);
      }
    }
  });

  test('No cost exceeds reasonable maximum at level 10', () => {
    const officeL10 = calculateUpgradeCost('office', 10);
    const equipmentL10 = calculateUpgradeCost('equipment', 10);
    const job_postingsL10 = calculateUpgradeCost('job_postings', 10);
    assert(officeL10 === Math.floor(50 * Math.pow(1.5, 10)), `office L10: ${officeL10} should equal ${Math.floor(50 * Math.pow(1.5, 10))}`);
    assert(equipmentL10 === Math.floor(30 * Math.pow(1.5, 10)), `equipment L10: ${equipmentL10} should equal ${Math.floor(30 * Math.pow(1.5, 10))}`);
    assert(job_postingsL10 === Math.floor(15 * Math.pow(1.5, 10)), `job_postings L10: ${job_postingsL10} should equal ${Math.floor(15 * Math.pow(1.5, 10))}`);
    assert(officeL10 <= 5000, `office L10 cost ${officeL10} exceeds reasonable max 5000`);
    assert(equipmentL10 <= 5000, `equipment L10 cost ${equipmentL10} exceeds reasonable max 5000`);
    assert(job_postingsL10 <= 5000, `job_postings L10 cost ${job_postingsL10} exceeds reasonable max 5000`);
  });

  // ═══ AC 2: Gold Income vs Cost Ratio Validation ═══

  test('Gold income scales proportionally with quest difficulty', () => {
    const difficultyGoldMap = {};
    for (const q of QUEST_TEMPLATES) {
      const diff = q.difficulty;
      if (!difficultyGoldMap[diff]) {
        difficultyGoldMap[diff] = { total: 0, count: 0 };
      }
      difficultyGoldMap[diff].total += q.rewards.gold;
      difficultyGoldMap[diff].count++;
    }
    for (let diff = 1; diff < 5; diff++) {
      const avgCurrent = difficultyGoldMap[diff] ? difficultyGoldMap[diff].total / difficultyGoldMap[diff].count : 0;
      const avgNext = difficultyGoldMap[diff + 1] ? difficultyGoldMap[diff + 1].total / difficultyGoldMap[diff + 1].count : 0;
      assert(avgNext > avgCurrent, `avg gold at diff ${diff + 1} (${avgNext}) should be > diff ${diff} (${avgCurrent})`);
    }
  });

  test('Higher difficulty quests provide better gold-to-time ratios', () => {
    const difficultyRatioMap = {};
    for (const q of QUEST_TEMPLATES) {
      const diff = q.difficulty;
      const ticks = diff * 10;
      const ratio = q.rewards.gold / ticks;
      if (!difficultyRatioMap[diff]) {
        difficultyRatioMap[diff] = [];
      }
      difficultyRatioMap[diff].push(ratio);
    }
    const averages = {};
    for (const [diff, ratios] of Object.entries(difficultyRatioMap)) {
      averages[diff] = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    }
    for (let diff = 1; diff < 5; diff++) {
      const ratioCurrent = averages[diff] || 0;
      const ratioNext = averages[diff + 1] || 0;
      assert(ratioNext >= ratioCurrent, `gold/tick at diff ${diff + 1} (${ratioNext.toFixed(2)}) should be >= diff ${diff} (${ratioCurrent.toFixed(2)})`);
    }
  });

  test('Restock cost (5 gold) is reasonable relative to income', () => {
    const restockCost = 5;
    const minGoldReward = Math.min(...QUEST_TEMPLATES.map(q => q.rewards.gold));
    assert(restockCost <= minGoldReward * 0.5, `restock cost ${restockCost} should be <= 50% of min reward ${minGoldReward}`);
    const avgGold = QUEST_TEMPLATES.reduce((sum, q) => sum + q.rewards.gold, 0) / QUEST_TEMPLATES.length;
    assert(restockCost < avgGold * 0.2, `restock cost ${restockCost} should be < 20% of avg reward ${avgGold.toFixed(1)}`);
  });

  test('Lowest gold quest (difficulty 1) still provides more than restock cost', () => {
    const minReward = Math.min(...QUEST_TEMPLATES.map(q => q.rewards.gold));
    assert(minReward >= 10, `minimum quest reward ${minReward} should be at least 10 gold`);
    assert(minReward > 5, `minimum quest reward ${minReward} should exceed restock cost of 5`);
  });

  // ═══ AC 3: Quest Reward Fairness ═══

  test('ECONOMY_TARGETS defined for all 5 difficulties', () => {
    for (let diff = 1; diff <= 5; diff++) {
      assert(ECONOMY_TARGETS[diff], `ECONOMY_TARGETS[${diff}] should be defined`);
      assert(ECONOMY_TARGETS[diff].gold, `ECONOMY_TARGETS[${diff}].gold should be defined`);
      assert(ECONOMY_TARGETS[diff].xp, `ECONOMY_TARGETS[${diff}].xp should be defined`);
      assert(Array.isArray(ECONOMY_TARGETS[diff].gold), `ECONOMY_TARGETS[${diff}].gold should be [min, max] array`);
      assert(Array.isArray(ECONOMY_TARGETS[diff].xp), `ECONOMY_TARGETS[${diff}].xp should be [min, max] array`);
    }
  });

  test('All 21 QUEST_TEMPLATES gold rewards fall within ECONOMY_TARGETS per difficulty', () => {
    for (const q of QUEST_TEMPLATES) {
      const target = ECONOMY_TARGETS[q.difficulty];
      assert(target, `no economy target for difficulty ${q.difficulty}`);
      assert(
        q.rewards.gold >= target.gold[0] && q.rewards.gold <= target.gold[1],
        `${q.name} (diff ${q.difficulty}): gold ${q.rewards.gold} outside [${target.gold[0]}, ${target.gold[1]}]`
      );
    }
  });

  test('All 21 QUEST_TEMPLATES experience rewards fall within ECONOMY_TARGETS per difficulty', () => {
    for (const q of QUEST_TEMPLATES) {
      const target = ECONOMY_TARGETS[q.difficulty];
      assert(target, `no economy target for difficulty ${q.difficulty}`);
      assert(
        q.rewards.experience >= target.xp[0] && q.rewards.experience <= target.xp[1],
        `${q.name} (diff ${q.difficulty}): xp ${q.rewards.experience} outside [${target.xp[0]}, ${target.xp[1]}]`
      );
    }
  });

  test('Rewards are proportional to difficulty stars (higher diff = more rewards)', () => {
    const difficultyRewardMap = {};
    for (const q of QUEST_TEMPLATES) {
      if (!difficultyRewardMap[q.difficulty]) {
        difficultyRewardMap[q.difficulty] = { gold: [], xp: [] };
      }
      difficultyRewardMap[q.difficulty].gold.push(q.rewards.gold);
      difficultyRewardMap[q.difficulty].xp.push(q.rewards.experience);
    }
    for (let diff = 1; diff < 5; diff++) {
      const minCurr = Math.min(...difficultyRewardMap[diff].gold);
      const minNext = Math.min(...difficultyRewardMap[diff + 1].gold);
      assert(minNext >= minCurr, `min gold at diff ${diff + 1} (${minNext}) should be >= diff ${diff} (${minCurr})`);
    }
  });

  test('QUEST_TEMPLATES has exactly 21 entries', () => {
    assert(QUEST_TEMPLATES.length === 21, `expected 21 quest templates, got ${QUEST_TEMPLATES.length}`);
  });

  console.log(`\n${testsPassed}/${testsRun} tests passed`);
  if (testsPassed < testsRun) process.exit(1);
});
