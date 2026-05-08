// Adventurers Guild Simulator — Reactive State Store
// ===================================================
// Central state machine with pub/sub dispatch and validation.
// All state changes flow through this single channel.

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
