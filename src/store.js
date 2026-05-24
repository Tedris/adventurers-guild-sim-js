// Adventurers Guild Simulator — Reactive State Store
// ===================================================
// Central state machine with pub/sub dispatch and validation.
// All state changes flow through this single channel.

import { validateParty, calculateSynergyScore, calculateQuestSuccessRate, calculateQuestOutcome, calculateUpgradeCost, calculateFameGain, evolveClass, evolveAdventurer, processTick, resolveEvent, generateLegacyPerk, generateRecruitmentPool, MAX_PARTY_SIZE, FAME_MILESTONE_ARRIVALS, generateMilestoneArrivals, generateId, getEvolutionStatus } from './entities/index.js';

/**
 * Creates a reactive state store.
 * @param {Object} initialState - Initial game state
 * @param {Object} [validators={}] - Map of action types to validation functions
 * @returns {Object} Store API (getState, subscribe, dispatch)
 */
export function createStore(initialState, validators = {}) {
  let state = structuredClone(initialState);
  const subscribers = new Set();

  // Pure reducer — state transitions are immutable
  function reducer(currentState, action) {
    switch (action.type) {
      case 'GOLD':
        return { ...currentState, gold: (currentState.gold ?? 0) + action.payload };
      case 'MERGE_STATE':
        return structuredClone(action.payload);
      case 'CLEAR_NOTIFICATION': {
        const { notificationId } = action.payload;
        if (!notificationId) return currentState;
        const notifications = (currentState.notifications || []).filter(n => n.id !== notificationId);
        return { ...currentState, notifications };
      }
      case 'CLEAR_ALL_NOTIFICATIONS':
        return { ...currentState, notifications: [] };
      case 'HIRE': {
        const adventurerId = action.payload.adventurerId;
        const poolIndex = currentState.recruitmentPool.findIndex(a => a.id === adventurerId);
        if (poolIndex === -1) return currentState; // adventurer not in pool

        const adventurer = currentState.recruitmentPool[poolIndex];
        const newPool = [...currentState.recruitmentPool];
        newPool.splice(poolIndex, 1);

        return {
          ...currentState,
          recruitmentPool: newPool,
          adventurers: [...currentState.adventurers, adventurer],
        };
      }
      case 'RESTOCK': {
        const count = action.payload.count ?? 1;
        if (!Number.isInteger(count) || count <= 0) return currentState;

        const newPoolEntries = generateRecruitmentPool(count, currentState);
        return {
          ...currentState,
          recruitmentPool: [...currentState.recruitmentPool, ...newPoolEntries],
        };
      }
      case 'RESTOCK_QUESTS': {
        const newQuests = action.payload.quests || [];
        return {
          ...currentState,
          quests: newQuests,
        };
      }
      case 'ASSIGN_PARTY': {
        const { partyId, adventurerIds, quest } = action.payload;
        // Validate party size (minimum only enforced when a quest is specified)
        if (quest && quest.requirements?.minPartySize && adventurerIds.length < quest.requirements.minPartySize) {
          console.warn(`[Store] ASSIGN_PARTY rejected: Party too small: ${adventurerIds.length} < ${quest.requirements.minPartySize}`);
          return currentState;
        }
        if (adventurerIds.length > MAX_PARTY_SIZE) {
          console.warn(`[Store] ASSIGN_PARTY rejected: Party too large: ${adventurerIds.length} > ${MAX_PARTY_SIZE}`);
          return currentState;
        }

        // Validate all adventurers exist in roster
        const rosterIds = new Set(currentState.adventurers.map(a => a.id));
        for (const id of adventurerIds) {
          if (!rosterIds.has(id)) {
            console.warn(`[Store] ASSIGN_PARTY rejected: adventurer ${id} not in roster`);
            return currentState;
          }
        }

        // Check for duplicates
        if (new Set(adventurerIds).size !== adventurerIds.length) {
          console.warn('[Store] ASSIGN_PARTY rejected: duplicate adventurer IDs');
          return currentState;
        }

        // Calculate synergy score
        const partyAdventurers = currentState.adventurers.filter(a => adventurerIds.includes(a.id));
        const { synergyScore } = calculateSynergyScore(partyAdventurers, quest || null);

        return {
          ...currentState,
          party: {
            ...currentState.party,
            adventurerIds,
            synergyScore,
          },
        };
      }
      case 'REORDER_PARTY': {
        const { adventurerIds } = action.payload;

        // Validate party size (allow 1+ for reordering)
        if (adventurerIds.length < 1) {
          console.warn('[Store] REORDER_PARTY rejected: empty party');
          return currentState;
        }

        // Validate all adventurers exist in party
        const currentPartyIds = new Set(currentState.party.adventurerIds);
        for (const id of adventurerIds) {
          if (!currentPartyIds.has(id)) {
            console.warn(`[Store] REORDER_PARTY rejected: adventurer ${id} not in current party`);
            return currentState;
          }
        }

        // Check for duplicates
        if (new Set(adventurerIds).size !== adventurerIds.length) {
          console.warn('[Store] REORDER_PARTY rejected: duplicate adventurer IDs');
          return currentState;
        }

        // Recalculate synergy
        const partyAdventurers = currentState.adventurers.filter(a => adventurerIds.includes(a.id));
        const { synergyScore } = calculateSynergyScore(partyAdventurers);

        return {
          ...currentState,
          party: {
            ...currentState.party,
            adventurerIds,
            synergyScore,
          },
        };
      }
      case 'UPDATE_ADVENTURER': {
          const { adventurerId, updates } = action.payload;

          if (!adventurerId || !updates || typeof updates !== 'object') {
           console.warn('[Store] UPDATE_ADVENTURER rejected: missing adventurerId or updates');
           return currentState;
         }

         const adventurer = currentState.adventurers.find(a => a.id === adventurerId);
         if (!adventurer) {
           console.warn(`[Store] UPDATE_ADVENTURER rejected: adventurer ${adventurerId} not found`);
           return currentState;
         }

         const updatedAdventurer = { ...adventurer, ...updates };

         // Check for class evolution after equipment changes
         let evolvedAdventurer = updatedAdventurer;
         let evolutionTriggered = false;
         if (updates.equipment || updates.weapon || updates.armor || updates.accessory) {
           const evolution = evolveClass(updatedAdventurer);
           if (evolution.evolved) {
             evolvedAdventurer = evolveAdventurer(updatedAdventurer);
             evolutionTriggered = true;
           }
         }

         return {
           ...currentState,
           adventurers: currentState.adventurers.map(a =>
             a.id === adventurerId ? evolvedAdventurer : a
           ),
           // Signal evolution for UI notification
           ...(evolutionTriggered ? { lastEvolution: { adventurerId, class: evolvedAdventurer.class } } : {}),
         };
       }
      case 'SEND_QUEST': {
        const { questId, partyId } = action.payload;

        // Validate quest exists
        const quest = currentState.quests.find(q => q.id === questId);
        if (!quest) {
          console.warn(`[Store] SEND_QUEST rejected: quest ${questId} not found`);
          return currentState;
        }

        // Validate party exists and meets quest requirements
        if (!currentState.party || !currentState.party.adventurerIds || currentState.party.adventurerIds.length === 0) {
          console.warn('[Store] SEND_QUEST rejected: no valid party');
          return currentState;
        }

        const partyAdventurers = currentState.adventurers.filter(a =>
          currentState.party.adventurerIds.includes(a.id)
        );
        const minSize = quest.requirements?.minPartySize;
        const anySingleMeetsStats = partyAdventurers.some(a => {
          const reqStats = quest.requirements?.minStats || {};
          for (const stat of ['str', 'dex', 'int', 'vit', 'lck']) {
            if ((reqStats[stat] ?? 0) > 0 && (a[stat] ?? 0) < reqStats[stat]) {
              return false;
            }
          }
          return true;
        });
        const effectiveMinSize = anySingleMeetsStats ? 1 : (minSize ?? 1);
        if (effectiveMinSize && currentState.party.adventurerIds.length < effectiveMinSize) {
          const reason = anySingleMeetsStats
            ? `Party too small for quest (1 adventurer qualifies): ${currentState.party.adventurerIds.length} < ${effectiveMinSize}`
            : `Party too small for quest: ${currentState.party.adventurerIds.length} < ${minSize}`;
          console.warn(`[Store] SEND_QUEST rejected: ${reason}`);
          return currentState;
        }

        return {
          ...currentState,
          activeQuest: {
            questId,
            questData: quest,
            partyId: partyId || currentState.party.id,
            status: 'active',
            tickCount: 0,
            startTime: Date.now(),
          },
          questTickCount: 0,
          quests: currentState.quests.filter(q => q.id !== questId),
        };
      }
      case 'COMPLETE_QUEST': {
        const { questId } = action.payload;

        // Validate active quest exists
        if (!currentState.activeQuest || currentState.activeQuest.questId !== questId || currentState.activeQuest.status !== 'active') {
          console.warn('[Store] COMPLETE_QUEST rejected: no active quest found');
          return currentState;
        }

        // Use stored quest data from activeQuest, fallback to quests array
        const quest = currentState.activeQuest.questData || currentState.quests.find(q => q.id === questId) || { id: questId };
        const partyAdventurers = currentState.adventurers.filter(a =>
          (currentState.party?.adventurerIds || []).includes(a.id)
        );

        // Calculate success with equipment bonus from upgrades
        const successRate = calculateQuestSuccessRate(partyAdventurers, quest);
        const equipmentBonus = currentState.equipmentBonus || 0;
        const successRateWithBonus = Math.min(95, successRate + equipmentBonus * 100);
        const succeeded = Math.random() * 100 < successRateWithBonus;

        // Calculate outcome
        const outcome = calculateQuestOutcome(partyAdventurers, quest, succeeded);

        // Apply results
        const newGold = Math.max(0, (currentState.gold ?? 0) + outcome.gold);

        // Calculate fame gain with office upgrade multiplier
        const fameGain = calculateFameGain(currentState);
        const fameMultiplier = currentState.fameMultiplier || 1;
        const actualFameGain = Math.floor(fameGain * fameMultiplier);
        const newFame = (currentState.fame || 0) + actualFameGain;

        const updatedAdventurers = currentState.adventurers.map(a => {
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

        // Check for fame milestone arrivals
        const milestonesReached = currentState.fameMilestonesReached || [];
        const milestoneArrivals = [];
        const newMilestones = [...milestonesReached];
        for (const milestone of FAME_MILESTONE_ARRIVALS) {
          if (newFame >= milestone.fame && !milestonesReached.includes(milestone.fame)) {
            const arrivals = generateMilestoneArrivals(currentState, milestone.fame);
            milestoneArrivals.push(...arrivals);
            newMilestones.push(milestone.fame);
          }
        }

        const newAdventurers = [...updatedAdventurers, ...milestoneArrivals];
        const newPartyAdventurerIds = newFame >= 10 && currentState.party.adventurerIds.length < 2
          ? [...currentState.party.adventurerIds, ...(milestoneArrivals.slice(0, 1).map(a => a.id))]
          : milestoneArrivals.length > 0 && currentState.party.adventurerIds.length < 2
            ? [...currentState.party.adventurerIds, milestoneArrivals[0].id]
            : currentState.party.adventurerIds;

        // Build notification for milestone arrivals
        let notifications = [...(currentState.notifications || [])];
        if (milestoneArrivals.length > 0) {
          const arrivalNames = milestoneArrivals.map(a => a.name).join(', ');
          notifications.push({
            id: generateId(),
            message: `A new adventurer has arrived at your guild: ${arrivalNames}!`,
            timestamp: Date.now(),
          });
        }

        return {
          ...currentState,
          gold: newGold,
          adventurers: newAdventurers,
          party: {
            ...currentState.party,
            adventurerIds: newPartyAdventurerIds,
          },
          fame: newFame,
          questCount: (currentState.questCount || 0) + 1,
          fameMilestonesReached: newMilestones,
          notifications,
          activeQuest: {
            ...currentState.activeQuest,
            status: succeeded ? 'complete' : 'failed',
            result: outcome,
          },
        };
      }
      case 'UPGRADE_GUILD': {
        const { upgradeType, gold: goldPaid } = action.payload;
        const validTypes = ['office', 'equipment', 'job_postings'];
        if (!validTypes.includes(upgradeType)) {
          console.warn(`[Store] UPGRADE_GUILD rejected: invalid type ${upgradeType}`);
          return currentState;
        }

        const upgrades = currentState.upgrades || { office: 0, equipment: 0, job_postings: 0 };
        const cost = calculateUpgradeCost(upgradeType, upgrades[upgradeType]);

        if (goldPaid < cost) {
          console.warn(`[Store] UPGRADE_GUILD rejected: insufficient gold (need ${cost}, have ${goldPaid})`);
          return currentState;
        }

        const newUpgrades = { ...upgrades, [upgradeType]: upgrades[upgradeType] + 1 };

        return {
          ...currentState,
          gold: currentState.gold - cost,
          upgrades: newUpgrades,
          // Apply upgrade effects
          ...(upgradeType === 'equipment' ? { equipmentBonus: (currentState.equipmentBonus || 0) + 0.1 } : {}),
          ...(upgradeType === 'office' ? {
            fameMultiplier: (currentState.fameMultiplier || 1) + 0.05,
            officeVisualBonus: (currentState.officeVisualBonus || 0) + 1,
          } : {}),
        };
      }
      case 'RETIRE': {
        const { adventurerId } = action.payload;
        const adventurer = currentState.adventurers.find(a => a.id === adventurerId);
        if (!adventurer) {
          console.warn(`[Store] RETIRE rejected: adventurer ${adventurerId} not found`);
          return currentState;
        }

        const legacyPerk = generateLegacyPerk(adventurer, currentState.day);
        const newPerks = [...(currentState.legacyPerks || []), legacyPerk];

        return {
          ...currentState,
          adventurers: currentState.adventurers.filter(a => a.id !== adventurerId),
          legacyPerks: newPerks,
          lastRetirement: { adventurerId, perk: legacyPerk },
        };
      }
      case 'EVOLVE_CLASS': {
        const { adventurerId } = action.payload;
        const adventurer = currentState.adventurers.find(a => a.id === adventurerId);
        if (!adventurer) {
          console.warn(`[Store] EVOLVE_CLASS rejected: adventurer ${adventurerId} not found`);
          return currentState;
        }

        const evolution = evolveClass(adventurer);
        if (!evolution.evolved) {
          console.warn(`[Store] EVOLVE_CLASS rejected: no evolution available for ${adventurerId}`);
          return currentState;
        }

        const evolvedAdventurer = evolveAdventurer(adventurer);
        return {
          ...currentState,
          adventurers: currentState.adventurers.map(a =>
            a.id === adventurerId ? evolvedAdventurer : a
          ),
          lastEvolution: { adventurerId, class: evolution.newClass },
        };
      }
      case 'CLEAR_EVOLUTION':
        return { ...currentState, lastEvolution: null };
      case 'TICK': {
        const tickCount = action.payload?.tickCount ?? 1;
        if (!Number.isInteger(tickCount) || tickCount <= 0) {
          console.warn(`[Store] TICK rejected: invalid tickCount ${tickCount}`);
          return currentState;
        }

        const tickResult = processTick(currentState, tickCount);

        // Check for evolution eligibility (D-25)
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

        // Check if active quest completed and calculate rewards
        const activeQuest = tickResult.activeQuest;
        if (activeQuest && activeQuest.status === 'complete') {
          const quest = activeQuest.questData || currentState.quests.find(q => q.id === activeQuest.questId);
          const partyAdventurers = currentState.adventurers.filter(a =>
            (currentState.party?.adventurerIds || []).includes(a.id)
          );
          const successRate = calculateQuestSuccessRate(partyAdventurers, quest);
          const equipmentBonus = tickResult.equipmentBonus || 0;
          const successRateWithBonus = Math.min(95, successRate + equipmentBonus * 100);
          const succeeded = Math.random() * 100 < successRateWithBonus;
          const outcome = calculateQuestOutcome(partyAdventurers, quest, succeeded);
          const newGold = Math.max(0, (tickResult.gold ?? 0) + outcome.gold);
          const fameGain = calculateFameGain(tickResult);
          const fameMultiplier = tickResult.fameMultiplier || 1;
          const actualFameGain = Math.floor(fameGain * fameMultiplier);
          const newFame = (tickResult.fame || 0) + actualFameGain;
          // Check for fame milestone arrivals
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

          // Add evolution notification if applicable
          if (potentialEvolutions.length > 0) {
            const evolveMsg = 'Evolution available: ' + potentialEvolutions.map(e => e.name + ' → ' + e.evolutionName).join(', ');
            // Only add if not already notified about evolution (dedup within last notification)
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
            activeQuest: {
              ...tickResult.activeQuest,
              status: succeeded ? 'complete' : 'failed',
              result: outcome,
            },
          };
        }

        // Add evolution notifications if applicable
        if (potentialEvolutions.length > 0) {
          const evolveMsg = 'Evolution available: ' + potentialEvolutions.map(e => e.name + ' → ' + e.evolutionName).join(', ');
          const existingNotifications = tickResult.notifications || [];
          const lastNotif = existingNotifications[existingNotifications.length - 1];
          if (!lastNotif || !lastNotif.message.includes('Evolution available')) {
            return {
              ...tickResult,
              notifications: [...existingNotifications, {
                id: generateId(),
                message: evolveMsg,
                timestamp: Date.now(),
              }],
            };
          }
        }
        return tickResult;
      }
      case 'EVENT_FIRED': {
        const { eventId, title, description, category, choices } = action.payload;

        // Validate event exists
        if (!eventId || !title) return currentState;

        const events = currentState.events || [];
        const newEvent = {
          eventId,
          title,
          description,
          category,
          choices: choices ? choices.map(c => ({ label: c.label, index: choices.indexOf(c) })) : [],
          timestamp: currentState.day || 0,
          resolved: false,
        };

        return {
          ...currentState,
          events: [...events, newEvent],
        };
      }
      case 'EVENT_RESOLVED': {
        const { eventId, choiceIndex } = action.payload;

        if (!eventId && eventId !== 0) return currentState;

        // Resolve the event using the entity function
        const resolution = resolveEvent(currentState, eventId, choiceIndex);

        if (!resolution.delta || Object.keys(resolution.delta).length === 0) {
          return currentState;
        }

        // Apply gold change
        let newGold = currentState.gold;
        if (resolution.delta.gold) {
          newGold = Math.max(0, (currentState.gold ?? 0) + resolution.delta.gold);
        }

        // Apply morale adjustment (if a single number, apply to all; if an array, apply per-adventurer)
        let updatedAdventurers = currentState.adventurers;
        if (resolution.delta.moraleAdjustment) {
          const adj = resolution.delta.moraleAdjustment;
          updatedAdventurers = currentState.adventurers.map(a => ({
            ...a,
            morale: Math.max(0, Math.min(100, a.morale + (typeof adj === 'number' ? adj : 0))),
          }));
        }

        // Handle departure count (adventurers leave due to event)
        let departureCount = resolution.delta.departureCount || 0;
        if (departureCount > 0 && updatedAdventurers.length > 0) {
          // Remove adventurers with lowest morale first
          const sorted = [...updatedAdventurers].sort((a, b) => a.morale - b.morale);
          for (let i = 0; i < departureCount && sorted[i]; i++) {
            const departedId = sorted[i].id;
            updatedAdventurers = updatedAdventurers.filter(a => a.id !== departedId);
          }
          departureCount -= updatedAdventurers.length < sorted.length ? Math.min(departureCount, sorted.length - updatedAdventurers.length) : 0;
        }

        // Handle retirement trigger
        if (resolution.delta.retirementTriggered) {
          const oldest = [...updatedAdventurers].sort((a, b) => b.level - a.level || b.experience - a.experience)[0];
          if (oldest) {
            const legacyPerk = generateLegacyPerk(oldest, currentState.day);
            const newPerks = [...(currentState.legacyPerks || []), legacyPerk];
            updatedAdventurers = updatedAdventurers.filter(a => a.id !== oldest.id);
            // Pass legacyPerk through delta for state merge
            resolution.delta._retirementPerk = legacyPerk;
            resolution.delta._newPerks = newPerks;
          }
        }

        // Build cooldowns: mark this event as unavailable for EVENT_COOLDOWN_TICKS
        const cooldowns = { ...(currentState.eventCooldowns || {}) };
        cooldowns[eventId] = (currentState.day || 0) + 20; // 20 ticks cooldown

        // Merge any other delta fields into state
        const { gold, moraleAdjustment, departureCount: depCount, retirementTriggered, trainingBonus, _retirementPerk, _newPerks, ...restDelta } = resolution.delta;

        return {
          ...currentState,
          gold: newGold,
          adventurers: updatedAdventurers,
          events: (currentState.events || []).filter(e => e.eventId !== eventId || e.resolved),
          eventCooldowns: cooldowns,
          // Merge remaining delta fields (fameDelta, reputation, favorDebt, questRisk, etc.)
          ...restDelta,
          // Apply legacy perks from retirement
          ...(_newPerks ? { legacyPerks: _newPerks } : {}),
          ...(resolution.delta.fameDelta ? { fame: (currentState.fame || 0) + resolution.delta.fameDelta } : {}),
          // Apply training bonus as temporary state (consumed after next quest)
          ...(trainingBonus ? { pendingTrainingBonus: (currentState.pendingTrainingBonus || 0) + trainingBonus } : {}),
        };
      }
      default:
        return currentState;
    }
  }

  return {
    getState: () => structuredClone(state),

    subscribe: (fn) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },

    dispatch: (action) => {
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
export function createAction(type, payloadFn) {
  return {
    [type](payload) {
      return {
        type,
        payload: typeof payloadFn === 'function' ? payloadFn(payload) : payload,
      };
    },
  }[type];
}
