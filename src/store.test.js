// Adventurers Guild Simulator — Store Tests (RED)
// Tests for reactive state store behavior

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

// Import store module
import('./store.js').then((module) => {
  const { createStore, createAction } = module;

  // --- Tests for createStore ---

  test('createStore returns an object with dispatch, subscribe, getState', () => {
    const store = createStore({ gold: 10 });
    assert(typeof store.dispatch === 'function', 'dispatch should be a function');
    assert(typeof store.subscribe === 'function', 'subscribe should be a function');
    assert(typeof store.getState === 'function', 'getState should be a function');
  });

  test('dispatch with valid action updates state correctly', () => {
    const store = createStore({ gold: 10 });
    const action = { type: 'GOLD', payload: 5 };
    const result = store.dispatch(action);
    assert(result === true, 'dispatch should return true for valid action');
    const state = store.getState();
    assert(state.gold === 15, `state should be updated: expected gold=15, got ${state.gold}`);
  });

  test('dispatch with invalid action does NOT update state', () => {
    const store = createStore({ gold: 10 }, {
      GOLD: (state, payload) => payload > 0,
    });
    const result = store.dispatch({ type: 'GOLD', payload: -5 });
    assert(result === false, 'dispatch should return false for invalid action');
    const state = store.getState();
    assert(state.gold === 10, `state should not change: expected gold=10, got ${state.gold}`);
  });

  test('subscribe callback is called after valid dispatch', () => {
    const store = createStore({ gold: 10 });
    let receivedState = null;
    const unsub = store.subscribe((state) => { receivedState = state; });
    store.dispatch({ type: 'GOLD', payload: 5 });
    unsub();
    assert(receivedState !== null, 'subscriber should have received state');
    assert(receivedState.gold === 15, `subscriber should see updated state: expected gold=15, got ${receivedState?.gold}`);
  });

  test('subscribe callback is NOT called for invalid dispatch', () => {
    const store = createStore({ gold: 10 }, {
      GOLD: (state, payload) => payload > 0,
    });
    let callCount = 0;
    const unsub = store.subscribe(() => { callCount++; });
    store.dispatch({ type: 'GOLD', payload: -5 });
    unsub();
    assert(callCount === 0, `subscriber should NOT be called for invalid action: callCount=${callCount}`);
  });

  test('getState returns current state snapshot', () => {
    const store = createStore({ gold: 10, level: 1 });
    const state1 = store.getState();
    assert(state1.gold === 10, 'initial gold should be 10');
    assert(state1.level === 1, 'initial level should be 1');
  });

  test('multiple subscribers all receive updates', () => {
    const store = createStore({ gold: 0 });
    let countA = 0, countB = 0;
    const unsubA = store.subscribe(() => { countA++; });
    const unsubB = store.subscribe(() => { countB++; });
    store.dispatch({ type: 'GOLD', payload: 5 });
    unsubA();
    unsubB();
    assert(countA === 1, `subscriber A should have been called once: ${countA}`);
    assert(countB === 1, `subscriber B should have been called once: ${countB}`);
  });

  test('unsubscribe removes a subscriber', () => {
    const store = createStore({ gold: 0 });
    let callCount = 0;
    const unsub = store.subscribe(() => { callCount++; });
    store.dispatch({ type: 'GOLD', payload: 5 });
    unsub();
    store.dispatch({ type: 'GOLD', payload: 5 });
    assert(callCount === 1, `after unsubscribe, callCount should be 1: ${callCount}`);
  });

  // --- Tests for createAction ---

  test('createAction returns a factory function', () => {
    const incGold = createAction('GOLD', (p) => p);
    assert(typeof incGold === 'function', 'createAction should return a function');
  });

  test('createAction produces correct action shape', () => {
    const incGold = createAction('GOLD', (p) => p);
    const action = incGold(10);
    assert(action.type === 'GOLD', `action type should be 'GOLD', got '${action.type}'`);
    assert(action.payload === 10, `action payload should be 10, got ${action.payload}`);
  });

  // --- Tests for state immutability ---

  test('getState returns a deep clone, not the internal state', () => {
    const store = createStore({ gold: 10, inventory: { sword: true } });
    const state1 = store.getState();
    state1.gold = 999;
    state1.inventory.potion = true;
    const state2 = store.getState();
    assert(state2.gold === 10, 'state should not be affected by external mutation');
    assert(state2.inventory.potion !== true, 'nested state should not be affected by external mutation');
  });

  // --- Tests for HIRE action ---

  test('HIRE: dispatches and adds adventurer to roster', () => {
    const poolAdventurer = { id: 'pool-1', name: 'Pool Hero', class: 'Sword', stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: {}, wage: 2 };
    const store = createStore({ gold: 100, adventurers: [], recruitmentPool: [poolAdventurer] });
    store.dispatch({ type: 'HIRE', payload: { adventurerId: 'pool-1' } });
    const state = store.getState();
    assert(state.adventurers.length === 1, `roster should have 1 adventurer, got ${state.adventurers.length}`);
    assert(state.adventurers[0].id === 'pool-1', 'hired adventurer should be in roster');
  });

  test('HIRE: removes adventurer from recruitmentPool', () => {
    const poolAdventurer = { id: 'pool-2', name: 'Pool Hero 2', class: 'Bow', stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: {}, wage: 2 };
    const store = createStore({ gold: 100, adventurers: [], recruitmentPool: [poolAdventurer] });
    store.dispatch({ type: 'HIRE', payload: { adventurerId: 'pool-2' } });
    const state = store.getState();
    assert(state.recruitmentPool.length === 0, `recruitmentPool should be empty, got ${state.recruitmentPool.length}`);
  });

  test('HIRE: validates adventurer exists in pool (rejects non-existent)', () => {
    const store = createStore({ gold: 100, adventurers: [], recruitmentPool: [] });
    const result = store.dispatch({ type: 'HIRE', payload: { adventurerId: 'nonexistent' } });
    assert(result === false, 'HIRE should return false for non-existent adventurer');
  });

  // --- Tests for RESTOCK action ---

  test('RESTOCK: generates specified number of adventurers', () => {
    const store = createStore({ gold: 100, adventurers: [], recruitmentPool: [] });
    const newAdventurers = [
      { id: 'new-1', name: 'New 1', class: 'Sword', stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: {}, wage: 2 },
      { id: 'new-2', name: 'New 2', class: 'Bow', stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: {}, wage: 2 },
    ];
    store.dispatch({ type: 'RESTOCK', payload: { adventurers: newAdventurers } });
    const state = store.getState();
    assert(state.recruitmentPool.length === 2, `recruitmentPool should have 2, got ${state.recruitmentPool.length}`);
  });

  test('RESTOCK: appends to existing recruitmentPool', () => {
    const existing = { id: 'existing-1', name: 'Existing', class: 'Sword', stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: {}, wage: 2 };
    const store = createStore({ gold: 100, adventurers: [], recruitmentPool: [existing], party: { id: 'p1', adventurerIds: [], synergyScore: 0, aptitudeBonus: 0 } });
    const newAdventurers = [{ id: 'new-1', name: 'New', class: 'Bow', stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: {}, wage: 2 }];
    store.dispatch({ type: 'RESTOCK', payload: { adventurers: newAdventurers } });
    const state = store.getState();
    assert(state.recruitmentPool.length === 2, `recruitmentPool should have 2 (1 existing + 1 new), got ${state.recruitmentPool.length}`);
    assert(state.recruitmentPool[0].id === 'existing-1', 'existing adventurer should still be in pool');
    assert(state.recruitmentPool[1].id === 'new-1', 'new adventurer should be appended');
  });

  // --- Tests for ASSIGN_PARTY ---

  test('ASSIGN_PARTY validates party size', () => {
    const hero1 = { id: 'hero-1', name: 'Hero 1', class: 'Sword', stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: {}, wage: 2 };
    const store = createStore({ gold: 100, adventurers: [hero1], recruitmentPool: [], party: { id: 'p1', adventurerIds: [], synergyScore: 0, aptitudeBonus: 0 } });
    // Party of 1 without solo quest should fail
    const result = store.dispatch({ type: 'ASSIGN_PARTY', payload: { partyId: 'p1', adventurerIds: ['hero-1'] } });
    assert(result === false, 'ASSIGN_PARTY should fail for party of 1 without solo quest');
  });

  test('ASSIGN_PARTY calculates synergy score correctly', () => {
    const hero1 = { id: 'hero-1', name: 'Hero 1', class: 'Sword', stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: { tracking: 0.8 }, wage: 2 };
    const hero2 = { id: 'hero-2', name: 'Hero 2', class: 'Bow', stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: { tracking: 0.9 }, wage: 2 };
    const store = createStore({ gold: 100, adventurers: [hero1, hero2], recruitmentPool: [], party: { id: 'p1', adventurerIds: [], synergyScore: 0, aptitudeBonus: 0 } });
    store.dispatch({ type: 'ASSIGN_PARTY', payload: { partyId: 'p1', adventurerIds: ['hero-1', 'hero-2'] } });
    const state = store.getState();
    assert(state.party.synergyScore > 0, `synergyScore should be positive, got ${state.party.synergyScore}`);
    assert(state.party.adventurerIds.length === 2, `party should have 2 adventurers, got ${state.party.adventurerIds.length}`);
  });

  test('ASSIGN_PARTY rejects duplicate adventurer IDs', () => {
    const hero1 = { id: 'hero-1', name: 'Hero 1', class: 'Sword', stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: {}, wage: 2 };
    const store = createStore({ gold: 100, adventurers: [hero1], recruitmentPool: [], party: { id: 'p1', adventurerIds: [], synergyScore: 0, aptitudeBonus: 0 } });
    const result = store.dispatch({ type: 'ASSIGN_PARTY', payload: { partyId: 'p1', adventurerIds: ['hero-1', 'hero-1'] } });
    assert(result === false, 'ASSIGN_PARTY should reject duplicate IDs');
  });

  // --- Tests for REORDER_PARTY ---

  test('REORDER_PARTY maintains party integrity', () => {
    const hero1 = { id: 'hero-1', name: 'Hero 1', class: 'Sword', stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: {}, wage: 2 };
    const hero2 = { id: 'hero-2', name: 'Hero 2', class: 'Bow', stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: {}, wage: 2 };
    const store = createStore({ gold: 100, adventurers: [hero1, hero2], recruitmentPool: [], party: { id: 'p1', adventurerIds: ['hero-1', 'hero-2'], synergyScore: 0, aptitudeBonus: 0 } });
    store.dispatch({ type: 'REORDER_PARTY', payload: { adventurerIds: ['hero-2', 'hero-1'] } });
    const state = store.getState();
    assert(state.party.adventurerIds[0] === 'hero-2', 'first should now be hero-2');
    assert(state.party.adventurerIds[1] === 'hero-1', 'second should now be hero-1');
  });

  test('REORDER_PARTY recalculates synergy on reorder', () => {
    const hero1 = { id: 'hero-1', name: 'Hero 1', class: 'Sword', stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: { combat: 0.9 }, wage: 2 };
    const hero2 = { id: 'hero-2', name: 'Hero 2', class: 'Bow', stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: { ranged_combat: 0.8 }, wage: 2 };
    const store = createStore({ gold: 100, adventurers: [hero1, hero2], recruitmentPool: [], party: { id: 'p1', adventurerIds: ['hero-1', 'hero-2'], synergyScore: 0, aptitudeBonus: 0 }, quests: [] });
    store.dispatch({ type: 'REORDER_PARTY', payload: { adventurerIds: ['hero-2', 'hero-1'] } });
    const state = store.getState();
    assert(state.party.synergyScore > 0, `synergyScore should be recalculated, got ${state.party.synergyScore}`);
  });

  // --- Tests for SEND_QUEST ---

  test('SEND_QUEST sets activeQuest correctly', () => {
    const hero1 = { id: 'hero-1', name: 'Hero 1', class: 'Sword', stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: {}, wage: 2 };
    const hero2 = { id: 'hero-2', name: 'Hero 2', class: 'Bow', stats: { str: 10, dex: 10, int: 10, vit: 10, lck: 10 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: {}, wage: 2 };
    const quest = { id: 'q1', name: 'Test Quest', difficulty: 2, requirements: { minStats: { str: 5, dex: 5, int: 5, vit: 5, lck: 5 }, preferredClasses: [], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 30, experience: 40 }, description: 'A test quest.' };
    const store = createStore({ gold: 100, adventurers: [hero1, hero2], recruitmentPool: [], party: { id: 'p1', adventurerIds: ['hero-1', 'hero-2'], synergyScore: 0, aptitudeBonus: 0 }, quests: [quest], activeQuest: null });
    store.dispatch({ type: 'SEND_QUEST', payload: { questId: 'q1', partyId: 'p1' } });
    const state = store.getState();
    assert(state.activeQuest !== null, 'activeQuest should be set');
    assert(state.activeQuest.questId === 'q1', 'questId should match');
    assert(state.activeQuest.status === 'active', 'status should be active');
    assert(state.quests.length === 0, 'quest should be removed from quests array');
  });

  test('SEND_QUEST rejects non-existent quest', () => {
    const store = createStore({ gold: 100, adventurers: [], recruitmentPool: [], party: { id: 'p1', adventurerIds: [], synergyScore: 0, aptitudeBonus: 0 }, quests: [], activeQuest: null });
    const result = store.dispatch({ type: 'SEND_QUEST', payload: { questId: 'nonexistent', partyId: 'p1' } });
    assert(result === false, 'SEND_QUEST should fail for non-existent quest');
  });

  // --- Tests for COMPLETE_QUEST ---

  test('COMPLETE_QUEST applies gold reward on success', () => {
    const hero1 = { id: 'hero-1', name: 'Hero 1', class: 'Sword', stats: { str: 20, dex: 20, int: 20, vit: 20, lck: 20 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: {}, wage: 2 };
    const hero2 = { id: 'hero-2', name: 'Hero 2', class: 'Bow', stats: { str: 20, dex: 20, int: 20, vit: 20, lck: 20 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: {}, wage: 2 };
    const quest = { id: 'q1', name: 'Easy Quest', difficulty: 1, requirements: { minStats: { str: 3, dex: 3, int: 3, vit: 3, lck: 3 }, preferredClasses: [], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 50, experience: 60 }, description: 'An easy quest.' };
    const store = createStore({ gold: 100, adventurers: [hero1, hero2], recruitmentPool: [], party: { id: 'p1', adventurerIds: ['hero-1', 'hero-2'], synergyScore: 0, aptitudeBonus: 0 }, quests: [quest], activeQuest: { questId: 'q1', partyId: 'p1', status: 'active', startTime: Date.now() } });
    store.dispatch({ type: 'COMPLETE_QUEST', payload: { questId: 'q1' } });
    const state = store.getState();
    assert(state.gold >= 100, `gold should increase on success, got ${state.gold}`);
    assert(state.activeQuest.status === 'complete' || state.activeQuest.status === 'failed', 'quest should be completed');
  });

  test('COMPLETE_QUEST updates adventurer experience', () => {
    const hero1 = { id: 'hero-1', name: 'Hero 1', class: 'Sword', stats: { str: 15, dex: 15, int: 15, vit: 15, lck: 15 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: {}, wage: 2 };
    const hero2 = { id: 'hero-2', name: 'Hero 2', class: 'Bow', stats: { str: 15, dex: 15, int: 15, vit: 15, lck: 15 }, equipment: { weapon: null, armor: null, accessory: null }, morale: 70, origin: 'Town-born', personality: { traits: [] }, level: 1, experience: 0, rank: 'Novice', aptitudes: {}, wage: 2 };
    const quest = { id: 'q2', name: 'Medium Quest', difficulty: 3, requirements: { minStats: { str: 8, dex: 8, int: 8, vit: 8, lck: 8 }, preferredClasses: [], minPartySize: 2, maxPartySize: 3 }, rewards: { gold: 40, experience: 80 }, description: 'A medium quest.' };
    const store = createStore({ gold: 100, adventurers: [hero1, hero2], recruitmentPool: [], party: { id: 'p1', adventurerIds: ['hero-1', 'hero-2'], synergyScore: 0, aptitudeBonus: 0 }, quests: [quest], activeQuest: { questId: 'q2', partyId: 'p1', status: 'active', startTime: Date.now() } });
    store.dispatch({ type: 'COMPLETE_QUEST', payload: { questId: 'q2' } });
    const state = store.getState();
    const updatedHero = state.adventurers.find(a => a.id === 'hero-1');
    assert(updatedHero.experience > 0, `adventurer should gain XP, got ${updatedHero.experience}`);
  });

  // Print summary
  console.log(`\n${testsPassed}/${testsRun} tests passed`);
  if (testsPassed < testsRun) process.exit(1);
});
