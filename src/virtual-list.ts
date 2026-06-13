// Adventurers Guild Simulator — Virtual List Engine
// ==================================================
// IntersectionObserver-based virtual list for adventurer cards.
// Only renders visible cards + overscan to keep DOM shallow for 100+ items.
//
// Threat mitigation T-04-01: Card DOM is created from trusted template clones,
// never innerHTML. All data inserted via textContent/setAttribute.

import type { Adventurer, GameState } from './types.js';
import type { AnimationConfig } from './animation.js';
import { detachAllListeners } from './render/card.js';

// ─── Types ─────────────────────────────────────────────

/**
 * Configuration for the virtual list.
 */
export interface VirtualListConfig {
  /** Total number of items */
  itemCount: number;
  /** Height of each card in pixels (must be consistent) */
  itemHeight: number;
  /** Container element that will hold visible cards */
  container: HTMLElement;
  /** Card height including margins/gap */
  rowHeight: number;
  /** Number of extra cards to render above/below viewport for smooth scrolling */
  overscanCount: number;
  /** Callback to create a card element for an item at given index */
  renderCard: (index: number, adventurer: Adventurer, state: GameState) => HTMLElement | null;
  /** Optional callback when a card enters the visible area (for animations) */
  onCardEnter?: (element: HTMLElement, index: number) => void;
  /** Optional callback when a card leaves the visible area */
  onCardLeave?: (element: HTMLElement, index: number) => void;
  /** CSS gap value between cards (in px) */
  gap: number;
}

/**
 * Result of visible range calculation.
 */
export interface VisibleRange {
  start: number;
  end: number;
}

// ─── Public Exports ────────────────────────────────────

/**
 * Calculate which items are visible in the current scroll position.
 * Uses scroll position, container height, row height, and overscan.
 *
 * @param scrollY — Current vertical scroll offset
 * @param containerHeight — Height of the visible viewport
 * @param rowHeight — Height of each row including gap
 * @param itemCount — Total number of items
 * @param overscanCount — Extra items to render above/below viewport
 * @returns Visible range with overscan applied
 */
export function calculateVisibleRange(
  scrollY: number,
  containerHeight: number,
  rowHeight: number,
  itemCount: number,
  overscanCount: number,
): VisibleRange {
  if (rowHeight <= 0 || itemCount <= 0) {
    return { start: 0, end: 0 };
  }

  const start = Math.max(0, Math.floor(scrollY / rowHeight) - overscanCount);
  const rawEnd = Math.ceil((scrollY + containerHeight) / rowHeight) + overscanCount;
  const end = Math.min(itemCount - 1, Math.max(0, rawEnd));

  return { start, end };
}

/**
 * Create a virtual list container element with proper sizing.
 * Sets up the scroll container and spacer elements for the scroll trick.
 *
 * Container structure:
 * <div class="virtual-list-container" style="overflow-y: auto; height: 600px;">
 *   <div class="virtual-list-spacer-top" style="height: 0px;"></div>
 *   <div class="virtual-list-cards">
 *     <div class="virtual-card" style="transform: translateY(0px);">...</div>
 *     ...
 *   </div>
 *   <div class="virtual-list-spacer-bottom" style="height: 7920px;"></div>
 * </div>
 */
export function createVirtualListContainer(
  config: Pick<VirtualListConfig, 'itemCount' | 'rowHeight' | 'gap'>,
): HTMLElement {
  const { itemCount, rowHeight, gap } = config;
  const totalHeight = itemCount * rowHeight;

  const container = document.createElement('div');
  container.className = 'virtual-list-container';
  container.style.height = '100%';
  container.style.overflowY = 'auto';
  container.style.position = 'relative';

  const spacerTop = document.createElement('div');
  spacerTop.className = 'virtual-list-spacer-top';
  spacerTop.style.height = '0px';

  const cardsWrapper = document.createElement('div');
  cardsWrapper.className = 'virtual-list-cards';
  cardsWrapper.style.position = 'relative';
  cardsWrapper.style.width = '100%';
  cardsWrapper.style.height = `${rowHeight}px`; // Will be updated dynamically

  const spacerBottom = document.createElement('div');
  spacerBottom.className = 'virtual-list-spacer-bottom';
  spacerBottom.style.height = `${Math.max(0, totalHeight - rowHeight)}px`;

  container.appendChild(spacerTop);
  container.appendChild(cardsWrapper);
  container.appendChild(spacerBottom);

  // Store layout info on the container for quick access
  (container as unknown as VirtualListContainer)._cardsWrapper = cardsWrapper;
  (container as unknown as VirtualListContainer)._spacerBottom = spacerBottom;
  (container as unknown as VirtualListContainer)._rowHeight = rowHeight;

  return container;
}

/**
 * Extended HTMLElement with virtual list internal fields.
 */
interface VirtualListContainer extends HTMLElement {
  _cardsWrapper: HTMLElement;
  _spacerBottom: HTMLElement;
  _rowHeight: number;
}

// ─── VirtualList Class ─────────────────────────────────

/**
 * A virtual list manager that renders only visible items.
 * Uses scroll position + IntersectionObserver for efficient visibility detection.
 *
 * Usage:
 *   const list = new VirtualList({
 *     itemCount: 100,
 *     itemHeight: 220,
 *     rowHeight: 232, // 220 + 12px gap
 *     container: document.getElementById('game-content')!,
 *     renderCard: (index, adventurer, state) => renderCard(...),
 *     gap: 12,
 *     overscanCount: 3,
 *   });
 *
 *   // On state change:
 *   list.update(newAdventurers, newState);
 *
 *   // Cleanup:
 *   list.destroy();
 */
export class VirtualList {
  private config: VirtualListConfig;
  private items: Adventurer[] = [];
  private state: GameState | null = null;
  private observer: IntersectionObserver | null = null;
  private renderFrameId: number | null = null;
  private lastVisibleRange: VisibleRange = { start: 0, end: 0 };
  private cardElements = new Map<number, HTMLElement>();
  private container: HTMLElement | null = null;
  private isDestroyed = false;

  constructor(config: VirtualListConfig) {
    this.config = {
      ...config,
      overscanCount: config.overscanCount ?? 3,
      gap: config.gap ?? 12,
    };

    this.setupContainer();
    this.setupObserver();
    this.render();
  }

  /**
   * Setup the container structure with spacers.
   */
  private setupContainer(): void {
    const { container, rowHeight, itemCount } = this.config;

    // Clear existing content
    container.innerHTML = '';

    const virtualContainer = createVirtualListContainer({
      itemCount,
      rowHeight,
      gap: this.config.gap,
    });

    // Replace the original container with the virtual one
    container.replaceWith(virtualContainer);
    this.container = virtualContainer;

    // Listen for scroll events to trigger re-renders
    virtualContainer.addEventListener('scroll', () => {
      this.scheduleRender();
    }, { passive: true });
  }

  /**
   * Set up IntersectionObserver for visibility detection.
   */
  private setupObserver(): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const indexStr = entry.target.getAttribute('data-virtual-index');
          const index = indexStr !== null ? parseInt(indexStr, 10) : -1;

          if (index < 0) continue;

          if (entry.isIntersecting) {
            // Card visible — ensure it's rendered
            this.ensureCardRendered(index);
          }
        }
      },
      {
        root: this.container,
        rootMargin: `${this.config.overscanCount * this.config.rowHeight}px`,
        threshold: 0,
      },
    );
  }

  /**
   * Schedule a render on the next animation frame (debounce).
   */
  private scheduleRender(): void {
    if (this.renderFrameId !== null) {
      cancelAnimationFrame(this.renderFrameId);
    }

    this.renderFrameId = requestAnimationFrame(() => {
      this.render();
      this.renderFrameId = null;
    });
  }

  /**
   * Update the item data. Call when adventurers array changes.
   * @param items — Updated adventurer list
   * @param state — Current game state
   */
  update(items: Adventurer[], state: GameState): void {
    // Check if count changed (requires full rebuild)
    const countChanged = items.length !== this.config.itemCount;

    this.items = items;
    this.state = state;

    // Update container total height if count changed
    if (countChanged || this.isDestroyed) {
      this.config.itemCount = items.length;

      // Recalculate total height and update spacers
      const totalHeight = items.length * this.config.rowHeight;
      const wrapper = (this.container as VirtualListContainer)?._cardsWrapper;
      const spacerBottom = (this.container as VirtualListContainer)?._spacerBottom;

      if (wrapper) {
        wrapper.style.height = `${this.config.rowHeight}px`;
      }
      if (spacerBottom) {
        spacerBottom.style.height = `${Math.max(0, totalHeight - this.config.rowHeight)}px`;
      }

      // Rebuild all card elements
      this.cardElements.clear();
      this.lastVisibleRange = { start: 0, end: 0 };

      // Re-render with new items
      if (!this.isDestroyed) {
        this.render();
      }
    } else {
      // Same count — just update visible cards
      const visibleRange = this.getVisibleRange();
      for (let i = visibleRange.start; i <= visibleRange.end && i < items.length; i++) {
        this.ensureCardRendered(i);
      }
    }
  }

  /**
   * Destroy the virtual list and clean up observers/timers.
   */
  destroy(): void {
    this.isDestroyed = true;

    // Cancel any pending render
    if (this.renderFrameId !== null) {
      cancelAnimationFrame(this.renderFrameId);
      this.renderFrameId = null;
    }

    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Clear all card elements with listener cleanup
    for (const [, card] of this.cardElements) {
      detachAllListeners(card);
    }
    this.cardElements.clear();

    // Clear references
    this.items = [];
    this.state = null;
    this.container = null;
  }

  /**
   * Get the current visible range (first and last visible indices).
   */
  getVisibleRange(): VisibleRange {
    const scrollContainer = this.container;
    if (!scrollContainer) {
      return { start: 0, end: 0 };
    }

    return calculateVisibleRange(
      scrollContainer.scrollTop,
      scrollContainer.clientHeight,
      this.config.rowHeight,
      this.config.itemCount,
      this.config.overscanCount,
    );
  }

  /**
   * Force a re-render of all visible cards.
   * Call after data changes that don't affect count or positions.
   */
  forceRender(): void {
    const visibleRange = this.getVisibleRange();
    for (let i = visibleRange.start; i <= visibleRange.end && i < this.items.length; i++) {
      this.ensureCardRendered(i);
    }
  }

  /**
   * Ensure a card at the given index is rendered in the DOM.
   */
  private ensureCardRendered(index: number): void {
    if (index < 0 || index >= this.items.length) return;

    // If already rendered, just update its position
    if (this.cardElements.has(index)) {
      this.updateCardPosition(index);
      return;
    }

    const adventurer = this.items[index];
    const state = this.state;
    if (!state) return;

    const card = this.config.renderCard(index, adventurer, state);
    if (!card) return;

    // Set up the card with virtual list classes
    card.className = 'virtual-card';
    card.setAttribute('data-virtual-index', String(index));
    card.setAttribute('data-adventurer-id', adventurer.id);

    // Position the card
    this.updateCardPosition(index, card);

    // Observe this card for visibility changes
    if (this.observer) {
      this.observer.observe(card);
    }

    // Track onCardEnter
    if (this.config.onCardEnter) {
      this.config.onCardEnter(card, index);
    }

    this.cardElements.set(index, card);
  }

  /**
   * Update a card's Y position in the DOM.
   */
  private updateCardPosition(index: number, card?: HTMLElement): void {
    const target = card || this.cardElements.get(index);
    if (!target) return;

    const y = index * this.config.rowHeight;
    target.style.transform = `translateY(${y}px)`;
    target.style.position = 'absolute';
    target.style.width = '100%';
    target.style.left = '0';
    target.style.willChange = 'transform';
  }

  /**
   * Render all visible cards.
   */
  private render(): void {
    const visibleRange = this.getVisibleRange();
    const wrapper = (this.container as VirtualListContainer)?._cardsWrapper;

    if (!wrapper || !this.items.length) return;

    // Remove cards that are no longer in visible range
    for (const [index, card] of this.cardElements) {
      if (index < visibleRange.start || index > visibleRange.end) {
        // Call onCardLeave before removing
        if (this.config.onCardLeave) {
          this.config.onCardLeave(card, index);
        }
        if (this.observer) {
          this.observer.unobserve(card);
        }
        detachAllListeners(card);
        card.remove();
        this.cardElements.delete(index);
      }
    }

    // Render new visible cards
    for (let i = visibleRange.start; i <= visibleRange.end && i < this.items.length; i++) {
      this.ensureCardRendered(i);
    }

    this.lastVisibleRange = visibleRange;
  }
}
