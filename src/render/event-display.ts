// Adventurers Guild Simulator — Event Display Modal System
// =========================================================
// Modal overlay system for confirmations and event resolutions.
// Handles focus management for accessibility.

import type { GameEvent, StoreAction } from '../types.js';

// ─── Public API ────────────────────────────────────────

/**
 * Store-like interface for dispatching actions from modals.
 */
export interface StoreLike {
  dispatch: (action: StoreAction) => boolean;
}

/**
 * Show a confirmation modal with message and callback buttons.
 * Focus management: confirm button is focused for accessibility.
 */
export function showConfirmModal(
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
): void {
  const container = document.getElementById('modal-overlay-container');
  if (!container) return;

  const template = document.getElementById('modal-overlay-template');
  if (!template || !(template instanceof HTMLTemplateElement)) return;

  const clone = document.importNode(template.content, true);
  const messageEl = clone.querySelector('.modal-message') as HTMLElement | null;
  const confirmBtn = clone.querySelector('.modal-confirm') as HTMLButtonElement | null;
  const cancelBtn = clone.querySelector('.modal-cancel') as HTMLButtonElement | null;

  if (messageEl) messageEl.textContent = message;
  if (confirmBtn) confirmBtn.addEventListener('click', () => {
    hideModal();
    if (onConfirm) onConfirm();
  });
  if (cancelBtn && onCancel) {
    cancelBtn.addEventListener('click', () => {
      hideModal();
      onCancel();
    });
  }

  container.appendChild(clone);
  // Focus management for accessibility
  if (confirmBtn) confirmBtn.focus();
}

/**
 * Show an event resolution modal with event data and choice buttons.
 * Focus management: first choice button is focused for accessibility.
 */
export function showEventModal(
  event: GameEvent,
  storeLike?: StoreLike,
): void {
  const container = document.getElementById('modal-overlay-container');
  if (!container) return;

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.setAttribute('data-modal', 'true');

  const content = document.createElement('div');
  content.className = 'modal-content';

  const title = document.createElement('h3');
  title.textContent = event.title;
  content.appendChild(title);

  const desc = document.createElement('p');
  desc.className = 'modal-message';
  desc.textContent = event.description;
  content.appendChild(desc);

  const choices = document.createElement('div');
  choices.className = 'modal-choices';

  if (event.choices) {
    event.choices.forEach((choice, index) => {
      const btn = document.createElement('button');
      btn.className = 'modal-choice-btn';
      btn.textContent = choice.label;
      btn.addEventListener('click', () => {
        hideModal();
        if (storeLike) {
          storeLike.dispatch({
            type: 'EVENT_RESOLVED',
            payload: { eventId: event.eventId, choiceIndex: index },
          });
        }
      });
      choices.appendChild(btn);
    });
  }

  content.appendChild(choices);
  modal.appendChild(content);
  container.appendChild(modal);

  // Focus first choice button for accessibility
  const firstChild = choices.firstChild;
  if (firstChild && 'focus' in firstChild && typeof firstChild.focus === 'function') {
    firstChild.focus();
  }
}

/**
 * Hide the modal overlay.
 */
export function hideModal(): void {
  const container = document.getElementById('modal-overlay-container');
  if (!container) return;
  container.innerHTML = '';
}
