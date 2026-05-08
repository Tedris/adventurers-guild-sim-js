// Adventurers Guild Simulator — Reactive State Store
// ===================================================
// Central state machine with pub/sub dispatch and validation.
// All state changes flow through this single channel.

import { validateParty, calculateSynergyScore } from './entities.js';

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

        // This will be populated by the caller with pool entries
        const newPoolEntries = action.payload.adventurers || [];
        return {
          ...currentState,
          recruitmentPool: [...currentState.recruitmentPool, ...newPoolEntries],
        };
      }
      case 'ASSIGN_PARTY': {
        const { partyId, adventurerIds, quest } = action.payload;
        // Validate party size
        const partyValidation = validateParty(adventurerIds, quest);
        if (!partyValidation.valid) {
          console.warn(`[Store] ASSIGN_PARTY rejected: ${partyValidation.reason}`);
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
