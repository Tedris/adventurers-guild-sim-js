// Adventurers Guild Simulator — Party Module
// ===========================================
// Party management: creation, validation, and synergy calculation.

import type { Adventurer, PartyEquipmentBonus, PartyOriginBonus, PartyStatBreakdown, PartyTraitBonus, PerAdventurerStatContribution, Quest, SynergyResult, ValidationResult } from '../types.js';
import { generateId } from './adventurer.js';

// ─── Constants ─────────────────────────────────────────

export const MAX_PARTY_SIZE = 3;
export const MIN_PARTY_SIZE = 2;

// ─── Party Generation ──────────────────────────────────

export function defaultParty(adventurerIds: string[] = []): {
  id: string;
  adventurerIds: string[];
  synergyScore: number;
  aptitudeBonus: number;
} {
  return {
    id: generateId(),
    adventurerIds: adventurerIds.slice(0, MAX_PARTY_SIZE),
    synergyScore: 0,
    aptitudeBonus: 0,
  };
}

// ─── Validation ─────────────────────────────────────────

export function validateParty(
  adventurerIds: string[],
  quest?: { requirements?: { minPartySize?: number } } | null
): ValidationResult {
  // Solo quest: allow party size of 1 if we have Legend rank
  if (quest && quest.requirements?.minPartySize === 1) {
    // This is a solo-eligible quest; size 1 is allowed
    if (adventurerIds.length > MAX_PARTY_SIZE) {
      return { valid: false, reason: `Party too large: ${adventurerIds.length} > ${MAX_PARTY_SIZE}` };
    }
    return { valid: true };
  }

  if (adventurerIds.length < MIN_PARTY_SIZE) {
    return { valid: false, reason: `Party too small: ${adventurerIds.length} < ${MIN_PARTY_SIZE}` };
  }
  if (adventurerIds.length > MAX_PARTY_SIZE) {
    return { valid: false, reason: `Party too large: ${adventurerIds.length} > ${MAX_PARTY_SIZE}` };
  }
  return { valid: true };
}

// ─── Synergy Calculation ───────────────────────────────

export function calculateClassDiversity(adventurers: Adventurer[]): { uniqueClasses: number; bonus: number } {
  const uniqueClasses = new Set(adventurers.map(a => a.class));
  const uniqueCount = uniqueClasses.size;
  const bonus = Math.min(uniqueCount * 0.2, 1.5);
  return { uniqueClasses: uniqueCount, bonus };
}

export function calculateAptitudeBonus(
  adventurers: Adventurer[],
  preferredClasses: string[]
): number {
  let bonus = 0;
  for (const adventurer of adventurers) {
    const aptitudes = adventurer.aptitudes || {};
    for (const preferredClass of preferredClasses) {
      // Check if the adventurer has an aptitude matching this preferred class type
      for (const [aptitudeKey, aptitudeValue] of Object.entries(aptitudes)) {
        if (preferredClass.toLowerCase().includes(aptitudeKey.split('_')[0]) ||
            aptitudeKey.toLowerCase().includes(preferredClass.split(' ')[0].toLowerCase())) {
          bonus += aptitudeValue * 0.15;
        }
      }
      // Also check direct class match
      if (adventurer.class.toLowerCase() === preferredClass.toLowerCase()) {
        bonus += 0.15;
      }
    }
  }
  return bonus;
}

export function calculateSynergyScore(
  adventurers: Adventurer[],
  quest?: Quest | null
): SynergyResult {
  const { bonus: diversityBonus } = calculateClassDiversity(adventurers);

  let aptitudeBonus = 0;
  if (quest && typeof quest.requirements === 'object' && quest.requirements !== null) {
    const req = quest.requirements;
    if (Array.isArray(req.preferredClasses)) {
      aptitudeBonus = calculateAptitudeBonus(adventurers, req.preferredClasses);
    }
  }

  const synergyScore = diversityBonus + aptitudeBonus;
  return { synergyScore, diversityBonus, aptitudeBonus };
}

// ─── Solo Eligibility ──────────────────────────────────

const VALID_RANKS = ['Novice', 'Journeyman', 'Veteran', 'Champion', 'Legend'] as const;

export function getSoloEligible(adventurers: Adventurer[]): boolean {
  return adventurers.some(a => a.rank === 'Legend');
}

// ─── Stat Calculation ──────────────────────────────────

const EQUIPMENT_BONUS: Record<string, number> = {
  Common: 1,
  Uncommon: 2,
  Rare: 3,
  Epic: 5,
};

export function calculateStatContribution(
  adventurers: Adventurer[],
  statName: string
): number {
  let total = 0;
  for (const adventurer of adventurers) {
    total += adventurer.stats?.[statName as keyof typeof adventurer.stats] ?? 0;

    // Add equipment bonus if equipped
    const equipment = adventurer.equipment || {};
    for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const item = equipment[slot];
      if (item && item.rarity && EQUIPMENT_BONUS[item.rarity]) {
        total += EQUIPMENT_BONUS[item.rarity];
      }
    }
  }
  return total;
}

export function calculatePartyEffectiveStat(
  adventurers: Adventurer[],
  quest: Quest,
  statName: string
): number {
  let effective = calculateStatContribution(adventurers, statName);

  // Solo penalty
  if (adventurers.length === 1) {
    effective *= 0.85;
  }

  // Apply synergy bonus from party
  const { synergyScore } = calculateSynergyScore(adventurers, quest);
  effective *= (1 + synergyScore * 0.1);

  return Math.floor(effective);
}

export function computePartyStatBreakdown(
  adventurers: Adventurer[],
  quest: Quest | null,
  statName: string
): PartyStatBreakdown {
  const baseTotal = adventurers.reduce((sum, a) => sum + (a.stats?.[statName as keyof Stats] ?? 0), 0);

  const equipmentBonuses: PartyEquipmentBonus[] = [];
  for (const adventurer of adventurers) {
    const equipment = adventurer.equipment || {};
    for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const item = equipment[slot];
      if (item && item.rarity && EQUIPMENT_BONUS[item.rarity]) {
        equipmentBonuses.push({
          adventurerName: adventurer.name,
          equipmentName: item.name,
          equipmentSlot: slot,
          rarity: item.rarity,
          stat: statName as keyof Stats,
          value: EQUIPMENT_BONUS[item.rarity],
        });
      }
    }
  }

  const equipmentBonusSum = equipmentBonuses.reduce((sum, eb) => sum + eb.value, 0);

  const { synergyScore } = calculateSynergyScore(adventurers, quest);
  const synergyBonus = Math.floor((baseTotal + equipmentBonusSum) * synergyScore * 0.1);

  const soloPenalty = adventurers.length === 1 ? -Math.floor((baseTotal + equipmentBonusSum) * 0.15) : 0;

  const total = Math.floor(
    (baseTotal + equipmentBonusSum + synergyBonus) * (adventurers.length === 1 ? 0.85 : 1)
  );

  return {
    stat: statName as keyof Stats,
    baseTotal,
    traitBonuses: [],
    originBonuses: [],
    equipmentBonuses,
    synergyBonus,
    soloPenalty,
    total,
  };
}

export function computePerAdventurerStatContribution(
  adventurers: Adventurer[],
  quest: Quest | null,
  statName: string
): PerAdventurerStatContribution[] {
  const req = quest?.requirements?.minStats?.[statName as keyof Stats] ?? 0;
  const results: PerAdventurerStatContribution[] = [];

  for (const adventurer of adventurers) {
    const baseStat = adventurer.stats?.[statName as keyof Stats] ?? 0;
    let equipmentBonus = 0;

    const equipment = adventurer.equipment || {};
    for (const slot of ['weapon', 'armor', 'accessory'] as const) {
      const item = equipment[slot];
      if (item && item.rarity && EQUIPMENT_BONUS[item.rarity]) {
        equipmentBonus += EQUIPMENT_BONUS[item.rarity];
      }
    }

    const effectiveStat = baseStat + equipmentBonus;

    results.push({
      adventurerId: adventurer.id,
      adventurerName: adventurer.name,
      stat: statName as keyof Stats,
      baseStat,
      equipmentBonus,
      effectiveStat,
      meetsRequirement: effectiveStat >= req,
    });
  }

  return results;
}

// ─── Quest Success ─────────────────────────────────────

export function calculateQuestSuccessRate(
  adventurers: Adventurer[],
  quest: Quest
): number {
  const req = quest.requirements;
  const minStats = req?.minStats || {};
  const minStatsRecord = minStats as Record<string, number>;
  const statNames = Object.keys(minStatsRecord);

  if (statNames.length === 0) return 50; // No requirements = 50% chance

  let product = 1;
  let statsWithRequirements = 0;
  for (const statName of statNames) {
    const required = minStatsRecord[statName];
    if (required === 0) continue; // Skip stats with no requirement
    statsWithRequirements++;
    const effective = calculatePartyEffectiveStat(adventurers, quest, statName);
    const ratio = effective / required;

    // Cap at 1.5 (diminishing returns)
    const cappedRatio = Math.min(ratio, 1.5);
    product *= cappedRatio;
  }

  // If all requirements are zero, return neutral 50%
  if (statsWithRequirements === 0) return 50;

  // Normalize to 0-100%
  const normalized = (product / Math.pow(1.5, statsWithRequirements)) * 100;

  // Clamp to 10-95%
  return Math.max(10, Math.min(95, Math.round(normalized)));
}

export function calculateQuestOutcome(
  adventurers: Adventurer[],
  quest: Quest,
  success: boolean
): { success: boolean; gold: number; experience: number; moraleAdjustment: number } {
  const rewards = quest.rewards || { gold: 0, experience: 0 };
  if (success) {
    const successRate = calculateQuestSuccessRate(adventurers, quest);
    const performanceMultiplier = 1 + (successRate / 100) * 0.5;
    const finalGold = Math.floor(rewards.gold * performanceMultiplier);
    const finalXP = Math.floor(rewards.experience * performanceMultiplier);
    return { success: true, gold: finalGold, experience: finalXP, moraleAdjustment: 0 };
  } else {
    // Failure: partial rewards
    const partialGold = Math.floor(rewards.gold * 0.2);
    const partialXP = Math.floor(rewards.experience * 0.1);
    return { success: false, gold: partialGold, experience: partialXP, moraleAdjustment: -5 };
  }
}
