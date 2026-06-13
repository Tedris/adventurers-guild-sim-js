// Global type declarations for browser environment

interface GuildStore {
  getState: () => import('./types.js').GameState;
  subscribe: (fn: (state: import('./types.js').GameState, action?: import('./types.js').StoreAction) => void) => () => void;
  dispatch: (action: import('./types.js').StoreAction) => boolean;
}

interface Window {
  __guildStore: GuildStore | undefined;
}
