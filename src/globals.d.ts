// Global type declarations for browser environment

interface GuildStore {
  getState: () => Record<string, unknown>;
  subscribe: (fn: (state: Record<string, unknown>, action?: Record<string, unknown>) => void) => () => void;
  dispatch: (action: Record<string, unknown>) => boolean;
}

interface Window {
  __guildStore: GuildStore | undefined;
}
