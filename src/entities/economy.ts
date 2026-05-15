// Adventurers Guild Simulator — Economy Module
// ==============================================
// Upgrade system, fame engine, and office level management.

import type {
  UpgradeDef,
  UpgradeEffects,
  OfficeLevelResult,
  FameLevelResult,
  Adventurer,
  Quest,
  MoraleResult,
  DepartureResult,
  QuestProgressResult,
} from '../types.js';

import { calculateQuestSuccessRate, calculateQuestOutcome } from './party.js';

// ─── Upgrade System ────────────────────────────────────

const UPGRADE_BASE_COSTS: Record<string, number> = {
  office: 50,
  equipment: 30,
  job_postings: 15,
};

const UPGRADE_NAMES: Record<string, string> = {
  office: 'Guild Office',
  equipment: 'Equipment Stock',
  job_postings: 'Job Postings',
};

const UPGRADE_DESCRIPTIONS: Record<string, string> = {
  office: 'Upgrade guild office — attracts better adventurers and increases fame gain.',
  equipment: 'Improve equipment stock — grants +10% quest success rate.',
  job_postings: 'Post job listings — improves recruitment pool quality.',
};

export const UPGRADE_EFFECTS: Record<string, UpgradeEffects> = {
  office: {
    perLevel: { fameMultiplier: 0.05, officeVisualBonus: 1 },
    description: 'Increases fame gain and office visual level progression.',
  },
  equipment: {
    perLevel: { questSuccessBonus: 0.10 },
    description: 'Improves quest success rate by 10% per level.',
  },
  job_postings: {
    perLevel: { recruitQualityBonus: 1 },
    description: 'Improves recruitment pool quality, generating higher-stat adventurers.',
  },
};

export function getUpgradeEffect(
  upgradeType: string,
  level: number
): Record<string, number> {
  const effect = UPGRADE_EFFECTS[upgradeType];
  if (!effect) return {};
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(effect.perLevel)) {
    result[key] = value * (level || 0);
  }
  return result;
}

export function calculateUpgradeCost(
  upgradeType: string,
  currentLevel: number
): number {
  const baseCost = UPGRADE_BASE_COSTS[upgradeType] ?? 30;
  return Math.floor(baseCost * Math.pow(1.5, currentLevel || 0));
}

export function getAvailableUpgrades(state: {
  gold?: number;
  upgrades?: Record<string, number>;
}): UpgradeDef[] {
  const upgrades = state.upgrades || { office: 0, equipment: 0, job_postings: 0 };
  const gold = state.gold ?? 0;

  const results: UpgradeDef[] = [];
  for (const type of ['office', 'equipment', 'job_postings'] as const) {
    const cost = calculateUpgradeCost(type, upgrades[type] ?? 0);
    if (type === 'equipment' && gold < 20) continue;
    if (type === 'job_postings' && gold < 10) continue;

    results.push({
      type,
      name: UPGRADE_NAMES[type],
      currentLevel: upgrades[type] ?? 0,
      nextCost: cost,
      description: UPGRADE_DESCRIPTIONS[type],
    });
  }
  return results;
}

// ─── Tick Processor ────────────────────────────────────

export function checkMorale(
  state: { adventurers?: Adventurer[]; day?: number },
  tickCount: number
): MoraleResult {
  const adventurers = state.adventurers || [];

  const adjusted: Adventurer[] = adventurers.map(a => {
    let morale = a.morale;

    // Base morale decay: -1 per 10 ticks
    const baseDecay = Math.floor(tickCount / 10);
    morale -= baseDecay;

    return { ...a, morale: Math.max(0, Math.min(100, morale)) };
  });

  const events: string[] = [];

  return { adjustedAdventurers: adjusted, moraleEvents: events };
}

export function checkDepartures(
  state: { adventurers?: Adventurer[] }
): DepartureResult {
  const adventurers = state.adventurers || [];
  const departed: Adventurer[] = [];
  const remaining: Adventurer[] = [];

  for (const adventurer of adventurers) {
    if (adventurer.morale <= 0) {
      departed.push(adventurer);
    } else {
      remaining.push(adventurer);
    }
  }

  return { departed, remaining };
}

export function processQuestProgress(
  state: {
    activeQuest?: Record<string, unknown> | null;
    quests?: Quest[];
    questTickCount?: number;
  },
  tickCount: number
): QuestProgressResult {
  const activeQuest = state.activeQuest;
  const quests = state.quests || [];

  if (!activeQuest || (activeQuest as Record<string, unknown>).status !== 'active') {
    return { updatedQuests: quests, completedQuests: [], failedQuests: [] };
  }

  // Use quest data from activeQuest
  const quest = (activeQuest as Record<string, unknown>).questData as Quest | undefined
    || quests.find(q => q.id === (activeQuest as Record<string, unknown>).questId as string);
  if (!quest) {
    return { updatedQuests: quests, completedQuests: [], failedQuests: [] };
  }

  // Auto-complete when enough ticks have accumulated
  const ticksNeeded = (quest.difficulty ?? 1) * 10;
  const completed = ((state.questTickCount ?? 0)) >= ticksNeeded;

  return {
    updatedQuests: quests,
    completedQuests: completed ? [quest] : [],
    failedQuests: [],
  };
}

export function processTick(
  state: Record<string, unknown>,
  tickCount: number = 1
): Record<string, unknown> {
  let newState: Record<string, unknown> = {
    ...state,
    day: (state.day as number) + tickCount,
  };

  // Check morale
  const morale = checkMorale(newState as { adventurers?: Adventurer[] }, tickCount);
  newState = { ...newState, adventurers: morale.adjustedAdventurers };

  // Check departures
  const departures = checkDepartures(newState as { adventurers?: Adventurer[] });
  newState = { ...newState, adventurers: departures.remaining };

  // Process quest progress
  const quests = processQuestProgress(newState as {
    activeQuest?: Record<string, unknown> | null;
    quests?: Quest[];
    questTickCount?: number;
  }, tickCount);
  newState = {
    ...newState,
    questTickCount: ((newState.questTickCount as number) ?? 0) + tickCount,
    activeQuest: quests.completedQuests.length > 0
      ? { ...(newState.activeQuest as Record<string, unknown>), status: 'complete', result: { success: true } }
      : newState.activeQuest,
  };

  return newState;
}
