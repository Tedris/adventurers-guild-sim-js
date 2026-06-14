// Adventurers Guild Simulator — Reactive State Store
// ===================================================
// Central state machine with pub/sub dispatch and validation.
// All state changes flow through this single channel.

import { validateParty, calculateSynergyScore, calculateQuestSuccessRate, calculateQuestOutcome, calculateUpgradeCost, calculateFameGain, evolveClass, evolveAdventurer, processTick, resolveEvent, generateLegacyPerk, generateRecruitmentPool, MAX_PARTY_SIZE, FAME_MILESTONE_ARRIVALS, generateMilestoneArrivals, generateId, getEvolutionStatus } from './entities/index.js';
import type { GameState, StoreAction, ActionType, EventDelta, Equipment, Stats, Quest, Adventurer, UpgradeType } from './types.js';

// ─── Handler Map Type ──────────────────────────────────

type HandlerMap = {
  GOLD: (state: GameState, payload: number) => GameState;
  MERGE_STATE: (state: GameState, payload: GameState) => GameState;
  CLEAR_NOTIFICATION: (state: GameState, payload: { notificationId: string }) => GameState;
  CLEAR_ALL_NOTIFICATIONS: (state: GameState) => GameState;
  HIRE: (state: GameState, payload: { adventurerId: string }) => GameState;
  RESTOCK: (state: GameState, payload: { count: number; adventurers?: Adventurer[] }) => GameState;
  RESTOCK_QUESTS: (state: GameState, payload: { quests: Quest[] }) => GameState;
  ASSIGN_PARTY: (state: GameState, payload: { partyId?: string; adventurerIds: string[]; quest?: Quest }) => GameState;
  REORDER_PARTY: (state: GameState, payload: { adventurerIds: string[] }) => GameState;
  UPDATE_ADVENTURER: (state: GameState, payload: { adventurerId: string; updates: Partial<Adventurer> }) => GameState;
  SEND_QUEST: (state: GameState, payload: { questId: string; partyId?: string }) => GameState;
  COMPLETE_QUEST: (state: GameState, payload: { questId: string }) => GameState;
  UPGRADE_GUILD: (state: GameState, payload: { upgradeType: UpgradeType; gold: number }) => GameState;
  RETIRE: (state: GameState, payload: { adventurerId: string }) => GameState;
  EVOLVE_CLASS: (state: GameState, payload: { adventurerId: string }) => GameState;
  CLEAR_EVOLUTION: (state: GameState) => GameState;
  TICK: (state: GameState, payload?: { tickCount?: number }) => GameState;
  EVENT_FIRED: (state: GameState, payload: { eventId: string; title: string; description: string; category: string; choices?: Array<{ label: string }> }) => GameState;
  EVENT_RESOLVED: (state: GameState, payload: { eventId: string; choiceIndex: number }) => GameState;
};

// ─── Individual Handler Functions ──────────────────────

function handleGold(state: GameState, gold: number): GameState {
  return { ...state, gold: (state.gold ?? 0) + (Number(gold) ?? 0) };
}

function handleMergeState(state: GameState, payload: GameState): GameState {
  if (payload == null) return state;
  return structuredClone(payload);
}

function handleClearNotification(state: GameState, payload: { notificationId: string }): GameState {
  const { notificationId } = payload;
  if (!notificationId) return state;
  const notifications = (state.notifications || []).filter(n => n.id !== notificationId);
  return { ...state, notifications };
}

function handleClearAllNotifications(state: GameState): GameState {
  return { ...state, notifications: [] };
}

function handleHire(state: GameState, payload: { adventurerId: string }): GameState {
  if (!payload) {
    console.warn('[Store] HIRE rejected: missing payload');
    return state;
  }
  const adventurerId = payload.adventurerId;
  const poolIndex = state.recruitmentPool.findIndex(a => a.id === adventurerId);
  if (poolIndex === -1) return state;

  const adventurer = state.recruitmentPool[poolIndex];
  const newPool = [...state.recruitmentPool];
  newPool.splice(poolIndex, 1);

  return {
    ...state,
    recruitmentPool: newPool,
    adventurers: [...state.adventurers, adventurer],
  };
}

function handleRestock(state: GameState, payload: { count: number; adventurers?: unknown[] }): GameState {
  const count = payload.count ?? 1;
  if (!Number.isInteger(count) || count <= 0) return state;

  const RESTOCK_COST = 5;
  if ((state.gold ?? 0) < RESTOCK_COST) {
    console.warn(`[Store] RESTOCK rejected: insufficient gold (need ${RESTOCK_COST}, have ${state.gold})`);
    return state;
  }

  const newPoolEntries = generateRecruitmentPool(count, state);
  return {
    ...state,
    gold: state.gold - RESTOCK_COST,
    recruitmentPool: [...state.recruitmentPool, ...newPoolEntries],
  };
}

function handleRestockQuests(state: GameState, payload: { quests: Quest[] }): GameState {
  if (!payload) {
    console.warn('[Store] RESTOCK_QUESTS rejected: missing payload');
    return state;
  }
  const newQuests = payload.quests || [];
  return {
    ...state,
    quests: newQuests,
  };
}

function handleAssignParty(state: GameState, payload: { partyId?: string; adventurerIds: string[]; quest?: Quest }): GameState {
  const { partyId, adventurerIds, quest } = payload;
  if (!Array.isArray(adventurerIds)) {
    console.warn('[Store] ASSIGN_PARTY rejected: adventurerIds is not an array');
    return state;
  }
  if (quest && quest.requirements?.minPartySize && adventurerIds.length < quest.requirements.minPartySize) {
    console.warn(`[Store] ASSIGN_PARTY rejected: Party too small: ${adventurerIds.length} < ${quest.requirements.minPartySize}`);
    return state;
  }
  if (adventurerIds.length > MAX_PARTY_SIZE) {
    console.warn(`[Store] ASSIGN_PARTY rejected: Party too large: ${adventurerIds.length} > ${MAX_PARTY_SIZE}`);
    return state;
  }

  const rosterIds = new Set((state.adventurers || []).map(a => a.id));
  for (const id of adventurerIds) {
    if (!rosterIds.has(id)) {
      console.warn(`[Store] ASSIGN_PARTY rejected: adventurer ${id} not in roster`);
      return state;
    }
  }

  if (new Set(adventurerIds).size !== adventurerIds.length) {
    console.warn('[Store] ASSIGN_PARTY rejected: duplicate adventurer IDs');
    return state;
  }

  const partyAdventurers = state.adventurers.filter(a => adventurerIds.includes(a.id));
  const { synergyScore } = calculateSynergyScore(partyAdventurers, (quest || null) as unknown as Record<string, unknown> | null);

  return {
    ...state,
    party: {
      ...state.party,
      adventurerIds,
      synergyScore,
    },
  };
}

function handleReorderParty(state: GameState, payload: { adventurerIds: string[] }): GameState {
  const { adventurerIds } = payload;

  if (!Array.isArray(adventurerIds)) {
    console.warn('[Store] REORDER_PARTY rejected: adventurerIds is not an array');
    return state;
  }
  if (adventurerIds.length < 1) {
    console.warn('[Store] REORDER_PARTY rejected: empty party');
    return state;
  }

  if (!state.party) {
    console.warn('[Store] REORDER_PARTY rejected: no party exists');
    return state;
  }
  const currentPartyIds = new Set(state.party.adventurerIds);
  for (const id of adventurerIds) {
    if (!currentPartyIds.has(id)) {
      console.warn(`[Store] REORDER_PARTY rejected: adventurer ${id} not in current party`);
      return state;
    }
  }

  if (new Set(adventurerIds).size !== adventurerIds.length) {
    console.warn('[Store] REORDER_PARTY rejected: duplicate adventurer IDs');
    return state;
  }

  const partyAdventurers = state.adventurers.filter(a => adventurerIds.includes(a.id));
  const { synergyScore } = calculateSynergyScore(partyAdventurers);

  return {
    ...state,
    party: {
      ...state.party,
      adventurerIds,
      synergyScore,
    },
  };
}

function handleUpdateAdventurer(state: GameState, payload: { adventurerId: string; updates: Partial<Adventurer> }): GameState {
  const { adventurerId, updates } = payload;

  if (!adventurerId || !updates || typeof updates !== 'object') {
    console.warn('[Store] UPDATE_ADVENTURER rejected: missing adventurerId or updates');
    return state;
  }

  const adventurer = state.adventurers.find(a => a.id === adventurerId);
  if (!adventurer) {
    console.warn(`[Store] UPDATE_ADVENTURER rejected: adventurer ${adventurerId} not found`);
    return state;
  }

  const updatedAdventurer = { ...adventurer, ...updates };

  let evolvedAdventurer = updatedAdventurer;
  let evolutionTriggered = false;
  const updatesWithEquipment = updates as { equipment?: Partial<Equipment>; weapon?: string; armor?: string; accessory?: string };
  if (updatesWithEquipment.equipment || updatesWithEquipment.weapon || updatesWithEquipment.armor || updatesWithEquipment.accessory) {
    const evolution = evolveClass(updatedAdventurer);
    if (evolution.evolved) {
      evolvedAdventurer = evolveAdventurer(updatedAdventurer);
      evolutionTriggered = true;
    }
  }

  return {
    ...state,
    adventurers: state.adventurers.map(a =>
      a.id === adventurerId ? evolvedAdventurer : a
    ),
    ...(evolutionTriggered ? { lastEvolution: { adventurerId, class: evolvedAdventurer.class } } : {}),
  };
}

function handleSendQuest(state: GameState, payload: { questId: string; partyId?: string }): GameState {
  const { questId, partyId } = payload;

  const quest = state.quests.find(q => q.id === questId);
  if (!quest) {
    console.warn(`[Store] SEND_QUEST rejected: quest ${questId} not found`);
    return state;
  }

  if (!state.party || !state.party.adventurerIds || state.party.adventurerIds.length === 0) {
    console.warn('[Store] SEND_QUEST rejected: no valid party');
    return state;
  }

  const partyAdventurers = state.adventurers.filter(a =>
    state.party.adventurerIds.includes(a.id)
  );
  const minSize = quest.requirements?.minPartySize;
  const anySingleMeetsStats = partyAdventurers.some(a => {
    const reqStats = quest.requirements?.minStats || {};
    for (const stat of ['str', 'dex', 'int', 'vit', 'lck'] as (keyof Stats)[]) {
      if ((reqStats[stat] ?? 0) > 0 && (a.stats[stat] ?? 0) < reqStats[stat]) {
        return false;
      }
    }
    return true;
  });
  const effectiveMinSize = anySingleMeetsStats ? 1 : (minSize ?? 1);
  if (effectiveMinSize && state.party.adventurerIds.length < effectiveMinSize) {
    const reason = anySingleMeetsStats
      ? `Party too small for quest (1 adventurer qualifies): ${state.party.adventurerIds.length} < ${effectiveMinSize}`
      : `Party too small for quest: ${state.party.adventurerIds.length} < ${minSize}`;
    console.warn(`[Store] SEND_QUEST rejected: ${reason}`);
    return state;
  }

  return {
    ...state,
    activeQuest: {
      questId,
      questData: quest,
      partyId: partyId || state.party.id,
      status: 'active',
      tickCount: 0,
      startTime: Date.now(),
    },
    questTickCount: 0,
    quests: state.quests.filter(q => q.id !== questId),
  };
}

function handleCompleteQuest(state: GameState, payload: { questId: string }): GameState {
  const { questId } = payload;

  if (!state.activeQuest || state.activeQuest.questId !== questId || state.activeQuest.status !== 'active') {
    console.warn('[Store] COMPLETE_QUEST rejected: no active quest found');
    return state;
  }

  const quest = state.activeQuest.questData || state.quests.find(q => q.id === questId) || { id: questId };
  const partyAdventurers = state.adventurers.filter(a =>
    (state.party?.adventurerIds || []).includes(a.id)
  );

  const successRate = calculateQuestSuccessRate(partyAdventurers, quest as unknown as Record<string, unknown>);
  const equipmentBonus = state.equipmentBonus || 0;
  const successRateWithBonus = Math.min(95, successRate + equipmentBonus * 100);
  const succeeded = Math.random() * 100 < successRateWithBonus;

  const outcome = calculateQuestOutcome(partyAdventurers, quest as unknown as Record<string, unknown>, succeeded);

  const newGold = Math.max(0, (state.gold ?? 0) + outcome.gold);

  const fameGain = calculateFameGain(state);
  const fameMultiplier = state.fameMultiplier || 1;
  const actualFameGain = Math.floor(fameGain * fameMultiplier);
  const newFame = (state.fame || 0) + actualFameGain;

  const updatedAdventurers = state.adventurers.map(a => {
    let newMorale = a.morale;
    if (!succeeded) {
      newMorale = Math.max(0, a.morale + outcome.moraleAdjustment);
    }
    return {
      ...a,
      experience: a.experience + (succeeded ? Math.floor(outcome.experience / partyAdventurers.length) : Math.floor(outcome.experience / Math.max(partyAdventurers.length, 1) * 0.1)),
      morale: newMorale,
    };
  });

  const milestonesReached = state.fameMilestonesReached || [];
  const milestoneArrivals = [];
  const newMilestones = [...milestonesReached];
  for (const milestone of FAME_MILESTONE_ARRIVALS) {
    if (newFame >= milestone.fame && !milestonesReached.includes(milestone.fame)) {
      const arrivals = generateMilestoneArrivals(state, milestone.fame);
      milestoneArrivals.push(...arrivals);
      newMilestones.push(milestone.fame);
    }
  }

  const newAdventurers = [...updatedAdventurers, ...milestoneArrivals];
  const newPartyAdventurerIds = newFame >= 10 && (state.party?.adventurerIds || []).length < 2
    ? [...(state.party?.adventurerIds || []), ...(milestoneArrivals.slice(0, 1).map(a => a.id))]
    : milestoneArrivals.length > 0 && (state.party?.adventurerIds || []).length < 2
      ? [...(state.party?.adventurerIds || []), milestoneArrivals[0].id]
      : state.party?.adventurerIds || [];

  let notifications = [...(state.notifications || [])];
  if (milestoneArrivals.length > 0) {
    const arrivalNames = milestoneArrivals.map(a => a.name).join(', ');
    notifications.push({
      id: generateId(),
      message: `A new adventurer has arrived at your guild: ${arrivalNames}!`,
      timestamp: Date.now(),
    });
  }

  return {
    ...state,
    gold: newGold,
    adventurers: newAdventurers,
    party: {
      ...state.party,
      adventurerIds: newPartyAdventurerIds,
    },
    fame: newFame,
    questCount: (state.questCount || 0) + 1,
    fameMilestonesReached: newMilestones,
    notifications,
    activeQuest: {
      ...state.activeQuest,
      status: succeeded ? 'complete' : 'failed',
      result: outcome,
    },
  };
}

function handleUpgradeGuild(state: GameState, payload: { upgradeType: UpgradeType; gold: number }): GameState {
  const { upgradeType, gold: goldPaid } = payload;
  const validTypes = ['office', 'equipment', 'job_postings'];
  if (!validTypes.includes(upgradeType)) {
    console.warn(`[Store] UPGRADE_GUILD rejected: invalid type ${upgradeType}`);
    return state;
  }

  const upgrades = state.upgrades || { office: 0, equipment: 0, job_postings: 0 };
  const currentLevel = upgrades[upgradeType] ?? 0;
  const cost = calculateUpgradeCost(upgradeType, currentLevel);

  if ((state.gold ?? 0) < cost) {
    console.warn(`[Store] UPGRADE_GUILD rejected: insufficient gold (need ${cost}, have ${(state.gold ?? 0)})`);
    return state;
  }

  const newUpgrades = { ...upgrades, [upgradeType]: currentLevel + 1 };

  return {
    ...state,
    gold: (state.gold ?? 0) - cost,
    upgrades: newUpgrades,
    ...(upgradeType === 'equipment' ? { equipmentBonus: (state.equipmentBonus || 0) + 0.1 } : {}),
    ...(upgradeType === 'office' ? {
      fameMultiplier: (state.fameMultiplier || 1) + 0.05,
      officeVisualBonus: (state.officeVisualBonus || 0) + 1,
    } : {}),
  };
}

function handleRetire(state: GameState, payload: { adventurerId: string }): GameState {
  const { adventurerId } = payload;
  const adventurer = state.adventurers.find(a => a.id === adventurerId);
  if (!adventurer) {
    console.warn(`[Store] RETIRE rejected: adventurer ${adventurerId} not found`);
    return state;
  }

  const legacyPerk = generateLegacyPerk(adventurer, state.day);
  const newPerks = [...(state.legacyPerks || []), legacyPerk];

  return {
    ...state,
    adventurers: state.adventurers.filter(a => a.id !== adventurerId),
    legacyPerks: newPerks,
    lastRetirement: { adventurerId, perk: legacyPerk },
  };
}

function handleEvolveClass(state: GameState, payload: { adventurerId: string }): GameState {
  const { adventurerId } = payload;
  const adventurer = state.adventurers.find(a => a.id === adventurerId);
  if (!adventurer) {
    console.warn(`[Store] EVOLVE_CLASS rejected: adventurer ${adventurerId} not found`);
    return state;
  }

  const evolution = evolveClass(adventurer);
  if (!evolution.evolved) {
    console.warn(`[Store] EVOLVE_CLASS rejected: no evolution available for ${adventurerId}`);
    return state;
  }

  const evolvedAdventurer = evolveAdventurer(adventurer);
  return {
    ...state,
    adventurers: state.adventurers.map(a =>
      a.id === adventurerId ? evolvedAdventurer : a
    ),
    lastEvolution: evolution.newClass ? { adventurerId, class: evolution.newClass } : null,
  };
}

function handleClearEvolution(state: GameState): GameState {
  return { ...state, lastEvolution: null };
}

function handleTick(state: GameState, payload?: { tickCount?: number }): GameState {
  const tickCount = payload?.tickCount ?? 1;
  if (!Number.isInteger(tickCount) || tickCount <= 0) {
    console.warn(`[Store] TICK rejected: invalid tickCount ${tickCount}`);
    return state;
  }

  const tickResult = processTick(state, tickCount);

  const potentialEvolutions = [];
  for (const adventurer of tickResult.adventurers) {
    if (adventurer.evolved) continue;
    const status = getEvolutionStatus(adventurer);
    if (status.canEvolve && status.matching.length > 0) {
      potentialEvolutions.push({
        adventurerId: adventurer.id,
        name: adventurer.name,
        evolutionName: status.matching[0].result,
      });
    }
  }

  const activeQuest = tickResult.activeQuest;
  if (activeQuest && activeQuest.status === 'complete') {
    const quest = activeQuest.questData || state.quests.find(q => q.id === activeQuest.questId);
    const partyAdventurers = state.adventurers.filter(a =>
      (state.party?.adventurerIds || []).includes(a.id)
    );
    const autoCompleted = activeQuest.result?.success === true;
    let succeeded: boolean;
    let outcome: ReturnType<typeof calculateQuestOutcome>;
    if (autoCompleted) {
      succeeded = true;
      outcome = calculateQuestOutcome(partyAdventurers, quest as unknown as Record<string, unknown>, true);
    } else {
      const successRate = calculateQuestSuccessRate(partyAdventurers, quest as unknown as Record<string, unknown>);
      const equipmentBonus = tickResult.equipmentBonus || 0;
      const successRateWithBonus = Math.min(95, successRate + equipmentBonus * 100);
      succeeded = Math.random() * 100 < successRateWithBonus;
      outcome = calculateQuestOutcome(partyAdventurers, quest as unknown as Record<string, unknown>, succeeded);
    }
    const newGold = Math.max(0, (tickResult.gold ?? 0) + outcome.gold);
    const fameGain = calculateFameGain(tickResult);
    const fameMultiplier = tickResult.fameMultiplier || 1;
    const actualFameGain = Math.floor(fameGain * fameMultiplier);
    const newFame = (tickResult.fame || 0) + actualFameGain;
    const milestonesReached = tickResult.fameMilestonesReached || [];
    const milestoneArrivals = [];
    const newMilestones = [...milestonesReached];
    for (const milestone of FAME_MILESTONE_ARRIVALS) {
      if (newFame >= milestone.fame && !milestonesReached.includes(milestone.fame)) {
        const arrivals = generateMilestoneArrivals(tickResult, milestone.fame);
        milestoneArrivals.push(...arrivals);
        newMilestones.push(milestone.fame);
      }
    }

    const allAdventurers = [...tickResult.adventurers, ...milestoneArrivals];
    const newPartyAdventurerIds = newFame >= 10 && tickResult.party.adventurerIds.length < 2
      ? [...tickResult.party.adventurerIds, ...(milestoneArrivals.slice(0, 1).map(a => a.id))]
      : milestoneArrivals.length > 0 && tickResult.party.adventurerIds.length < 2
        ? [...tickResult.party.adventurerIds, milestoneArrivals[0].id]
        : tickResult.party.adventurerIds;

    let tickNotifications = [...(tickResult.notifications || [])];
    if (milestoneArrivals.length > 0) {
      const arrivalNames = milestoneArrivals.map(a => a.name).join(', ');
      tickNotifications.push({
        id: generateId(),
        message: `A new adventurer has arrived at your guild: ${arrivalNames}!`,
        timestamp: Date.now(),
      });
    }

    if (potentialEvolutions.length > 0) {
      const evolveMsg = 'Evolution available: ' + potentialEvolutions.map(e => e.name + ' → ' + e.evolutionName).join(', ');
      const lastNotif = tickNotifications[tickNotifications.length - 1];
      if (!lastNotif || !lastNotif.message.includes('Evolution available')) {
        tickNotifications.push({
          id: generateId(),
          message: evolveMsg,
          timestamp: Date.now(),
        });
      }
    }

    return {
      ...state,
      ...tickResult,
      gold: newGold,
      adventurers: allAdventurers,
      party: {
        ...tickResult.party,
        adventurerIds: newPartyAdventurerIds,
      },
      fame: newFame,
      questCount: (tickResult.questCount || 0) + 1,
      fameMilestonesReached: newMilestones,
      notifications: tickNotifications,
      activeQuest: tickResult.activeQuest ? {
        ...tickResult.activeQuest,
        status: succeeded ? 'complete' : 'failed',
        result: outcome,
      } : null,
    };
  }

  if (potentialEvolutions.length > 0) {
    const evolveMsg = 'Evolution available: ' + potentialEvolutions.map(e => e.name + ' → ' + e.evolutionName).join(', ');
    const existingNotifications = tickResult.notifications || [];
    const lastNotif = existingNotifications[existingNotifications.length - 1];
    if (!lastNotif || !lastNotif.message.includes('Evolution available')) {
      return {
        ...state,
        ...tickResult,
        notifications: [...existingNotifications, {
          id: generateId(),
          message: evolveMsg,
          timestamp: Date.now(),
        }],
      };
    }
  }
  return { ...state, ...tickResult } as GameState;
}

function handleEventFired(state: GameState, payload: { eventId: string; title: string; description: string; category: string; choices?: Array<{ label: string }> }): GameState {
  const { eventId, title, description, category, choices } = payload;

  if (!eventId || !title) return state;

  const events = state.events || [];
  const newEvent = {
    eventId,
    title,
    description,
    category,
    choices: choices ? choices.map((c, i) => ({ label: c.label, index: i })) : [],
    timestamp: state.day || 0,
    resolved: false,
  };

  return {
    ...state,
    events: [...events, newEvent],
  };
}

function handleEventResolved(state: GameState, payload: { eventId: string; choiceIndex: number }): GameState {
  const { eventId, choiceIndex } = payload;

  if (!eventId) return state;

  const resolution = resolveEvent(state, eventId, choiceIndex);

  if (!resolution.delta || Object.keys(resolution.delta).length === 0) {
    return state;
  }

  let newGold = state.gold ?? 0;
  if (resolution.delta.gold) {
    newGold = Math.max(0, (state.gold ?? 0) + resolution.delta.gold);
  }

  let updatedAdventurers = state.adventurers;
  if (resolution.delta.moraleAdjustment) {
    const adj = resolution.delta.moraleAdjustment;
    updatedAdventurers = state.adventurers.map(a => ({
      ...a,
      morale: Math.max(0, Math.min(100, a.morale + (typeof adj === 'number' ? adj : 0))),
    }));
  }

  let departureCount = resolution.delta.departureCount || 0;
  if (departureCount > 0 && updatedAdventurers.length > 0) {
    const sorted = [...updatedAdventurers].sort((a, b) => a.morale - b.morale);
    for (let i = 0; i < departureCount && sorted[i]; i++) {
      const departedId = sorted[i].id;
      updatedAdventurers = updatedAdventurers.filter(a => a.id !== departedId);
    }
    departureCount -= updatedAdventurers.length < sorted.length ? Math.min(departureCount, sorted.length - updatedAdventurers.length) : 0;
  }

  if (resolution.delta.retirementTriggered) {
    const oldest = [...updatedAdventurers].sort((a, b) => b.level - a.level || b.experience - a.experience)[0];
    if (oldest) {
      const legacyPerk = generateLegacyPerk(oldest, state.day);
      const newPerks = [...(state.legacyPerks || []), legacyPerk];
      updatedAdventurers = updatedAdventurers.filter(a => a.id !== oldest.id);
      resolution.delta._retirementPerk = legacyPerk;
      resolution.delta._newPerks = newPerks;
    }
  }

  const cooldowns = { ...(state.eventCooldowns || {}) };
  cooldowns[eventId] = (state.day || 0) + 20;

  const { gold: _gold, moraleAdjustment: _morale, departureCount: _dep, retirementTriggered: _ret, trainingBonus: _train, _retirementPerk: _rp, _newPerks: _np, ...restDelta } = resolution.delta;

  return {
    ...state,
    gold: newGold,
    adventurers: updatedAdventurers,
    events: (state.events || []).filter(e => e.eventId !== eventId || e.resolved),
    eventCooldowns: cooldowns,
    ...restDelta,
    ...(_np ? { legacyPerks: _np } : {}),
    ...(resolution.delta.fameDelta ? { fame: (state.fame || 0) + resolution.delta.fameDelta } : {}),
    ...(_train ? { pendingTrainingBonus: (state.pendingTrainingBonus || 0) + _train } : {}),
  } as GameState;
}

// ─── Exhaustiveness Check ──────────────────────────────

function assertNever(x: never): never {
  throw new Error(`Unexpected action type: ${String(x)}`);
}

/**
 * Creates a reactive state store.
 * @param {GameState} initialState - Initial game state
 * @param {Record<ActionType, (state: GameState, payload: unknown) => boolean>} [validators={}] - Map of action types to validation functions
 * @returns {Object} Store API (getState, subscribe, dispatch)
 */
export function createStore(initialState: GameState, validators: Record<ActionType, (state: GameState, payload: unknown) => boolean> = Object.create(null) as Record<ActionType, (state: GameState, payload: unknown) => boolean>) {
  let state = structuredClone(initialState);
  const subscribers = new Set<(state: GameState, action: StoreAction) => void>();

  // Thin reducer — dispatches to dedicated handler functions
  const handlerMap: HandlerMap = {
    GOLD: handleGold,
    MERGE_STATE: handleMergeState,
    CLEAR_NOTIFICATION: handleClearNotification,
    CLEAR_ALL_NOTIFICATIONS: handleClearAllNotifications,
    HIRE: handleHire,
    RESTOCK: handleRestock,
    RESTOCK_QUESTS: handleRestockQuests,
    ASSIGN_PARTY: handleAssignParty,
    REORDER_PARTY: handleReorderParty,
    UPDATE_ADVENTURER: handleUpdateAdventurer,
    SEND_QUEST: handleSendQuest,
    COMPLETE_QUEST: handleCompleteQuest,
    UPGRADE_GUILD: handleUpgradeGuild,
    RETIRE: handleRetire,
    EVOLVE_CLASS: handleEvolveClass,
    CLEAR_EVOLUTION: handleClearEvolution,
    TICK: handleTick,
    EVENT_FIRED: handleEventFired,
    EVENT_RESOLVED: handleEventResolved,
  };

  function reducer(currentState: GameState, action: StoreAction): GameState {

    const handler = handlerMap[action.type];
    if (!handler) {
      return assertNever(action as never);
    }

    return handler(currentState, action.payload as never);
  }

  return {
    getState: (): GameState => structuredClone(state),

    subscribe: (fn: (state: GameState, action: StoreAction) => void) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },

    dispatch: (action: StoreAction): boolean => {
      const validator = validators[action.type];
      if (validator && !validator(state, action.payload)) {
        console.warn(`[Store] Action "${action.type}" rejected: validation failed`);
        return false;
      }

      const newState = reducer(state, action);
      if (newState === state) {
        console.warn(`[Store] Action "${action.type}" produced no change`);
        return false;
      }

      state = newState;
      subscribers.forEach((fn) => fn(state, action));
      return true;
    },
  };
}

/**
 * Creates an action factory function.
 * @param {string} type - Action type identifier
 * @param {Function|*} [payloadFn] - Function to transform payload, or value
 * @returns {Function} Action creator that returns { type, payload }
 */
export function createAction(type: ActionType, payloadFn?: (payload: unknown) => unknown) {
  return {
    [type](payload: unknown) {
      return {
        type,
        payload: typeof payloadFn === 'function' ? payloadFn(payload) : payload,
      };
    },
  }[type];
}
