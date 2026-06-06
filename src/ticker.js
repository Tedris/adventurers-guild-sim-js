// Adventurers Guild Simulator — Game Ticker Module
// ==================================================
// Manages the game tick system: fires TICK actions at 1500ms intervals.
// Handles page visibility changes (pauses when tab is hidden).

import { TICK_INTERVAL_MS } from './entities/economy.js';

/**
 * Game ticker — fires TICK actions at regular intervals.
 * Pauses automatically when the page visibility changes to hidden.
 */
export class GameTicker {
  /**
   * @param {Object} store - The game store with dispatch method
   */
  constructor(store) {
    this._store = store;
    this._intervalId = null;
    this._isRunning = false;
    this._wasPausedBeforeVisibilityChange = false;
  }

  /**
   * Start the ticker. If already running, does nothing.
   */
  start() {
    if (this._isRunning) return;

    this._isRunning = true;
    this._intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && this._store) {
        this._store.dispatch({ type: 'TICK', payload: { tickCount: 1 } });
      }
    }, TICK_INTERVAL_MS);
  }

  /**
   * Stop the ticker. If not running, does nothing.
   */
  stop() {
    if (!this._isRunning) return;

    this._isRunning = false;
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  /**
   * Toggle running state.
   */
  toggle() {
    if (this._isRunning) {
      this.stop();
    } else {
      this.start();
    }
  }

  /**
   * Check if ticker is currently running.
   * @returns {boolean}
   */
  isRunning() {
    return this._isRunning;
  }

  /**
   * Clean up ticker and remove all event listeners.
   * Call this on page unload.
   */
  destroy() {
    this.stop();
    this._store = null;
  }
}

/**
 * Create and start a game ticker with automatic visibility-based pause/resume.
 * @param {Object} store - The game store with dispatch method
 * @returns {GameTicker} The ticker instance
 */
export function createGameTicker(store) {
  const ticker = new GameTicker(store);

  // Handle page visibility changes
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      // Pause when tab is hidden
      ticker.stop();
    } else if (document.visibilityState === 'visible') {
      // Resume when tab becomes visible
      ticker.start();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Store reference for cleanup
  ticker._visibilityHandler = handleVisibilityChange;

  // Override destroy to also remove visibility listener
  const originalDestroy = ticker.destroy.bind(ticker);
  ticker.destroy = () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    originalDestroy();
  };

  ticker.start();
  return ticker;
}
