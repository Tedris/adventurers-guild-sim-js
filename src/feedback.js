// Adventurers Guild Simulator — Feedback System Adapter
// =====================================================
// Adapter layer that wraps click-effects.js exports to provide
// the higher-level feedback API expected by app.js.
//
// Exports: initAudio, showFloatingText, playScreenFlash,
//          playSound, playScreenShake

import {
  getAudioContext,
  playClickSound,
  createFloatingText,
  triggerScreenShake,
  prefersReducedMotion,
} from './click-effects.js';

// ─── Audio Initialization ────────────────────────────

/**
 * Initialize the audio context on first user interaction.
 * Browser autoplay policy requires user gesture.
 */
export function initAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  } catch {
    // Audio not available — silently skip
  }
}

// ─── Floating Text ───────────────────────────────────

/**
 * Show floating text at screen coordinates.
 * Uses document.body as the container.
 * @param {string} text — Text to display
 * @param {number} x — X coordinate in pixels
 * @param {number} y — Y coordinate in pixels
 * @param {string} [color] — Text color (default: '#ffd700')
 */
export function showFloatingText(text, x, y, color = '#ffd700') {
  if (typeof document === 'undefined') return;
  try {
    const el = createFloatingText(document.body, x, y, text);
    if (el && color) {
      el.style.color = color;
    }
  } catch {
    // Silent fail — floating text is non-critical
  }
}

// ─── Screen Flash ────────────────────────────────────

/**
 * Play a brief screen flash effect.
 * @param {'green'|'red'|'gold'} color — Flash color type
 */
export function playScreenFlash(color) {
  if (typeof document === 'undefined') return;
  try {
    const flash = document.createElement('div');
    flash.className = 'feedback-screen-flash';

    const colorMap = {
      green: 'rgba(39, 174, 96, 0.25)',
      red: 'rgba(231, 76, 60, 0.25)',
      gold: 'rgba(255, 215, 0, 0.25)',
    };

    flash.style.backgroundColor = colorMap[color] || colorMap.gold;
    document.body.appendChild(flash);

    flash.animate(
      [
        { opacity: 0 },
        { opacity: 1 },
        { opacity: 0 },
      ],
      { duration: 300, easing: 'ease-out' }
    ).onfinish = () => {
      if (flash.parentNode) flash.parentNode.removeChild(flash);
    };
  } catch {
    // Silent fail — screen flash is non-critical
  }
}

// ─── Sound Dispatcher ────────────────────────────────

/**
 * Play a named sound effect by dispatching to the appropriate handler.
 * @param {'click'|'success'|'failure'} soundName — Sound to play
 */
export function playSound(soundName) {
  if (typeof document === 'undefined') return;
  try {
    if (soundName === 'click') {
      playClickSound(null);
    }
    // success/failure sounds could be expanded later
  } catch {
    // Silent fail — audio is non-critical
  }
}

// ─── Screen Shake ────────────────────────────────────

/**
 * Play screen shake on an element.
 * @param {HTMLElement} element — Element to shake
 * @param {number} [duration] — Animation duration in ms (default: 150)
 * @param {number} [amplitude] — Shake amplitude in px (default: 3)
 */
export function playScreenShake(element, duration, amplitude) {
  if (typeof document === 'undefined') return;
  if (prefersReducedMotion()) return;

  try {
    if (duration !== undefined && amplitude !== undefined) {
      // Custom shake with specified params
      const keyframes = generateShakeKeyframes(amplitude);
      element.animate(keyframes, {
        duration,
        easing: 'ease-out',
        fill: 'none',
      });
    } else {
      // Use default click-effects shake
      triggerScreenShake(element);
    }
  } catch {
    // Silent fail — animation is non-critical
  }
}

/**
 * Generate WAAPI keyframes for a shake animation.
 * @param {number} amplitude — Max displacement in pixels
 * @returns {Array<Record<string, string>>}
 */
function generateShakeKeyframes(amplitude) {
  const steps = [
    { transform: 'translateX(0)' },
    { transform: `translateX(${-amplitude}px)` },
    { transform: `translateX(${amplitude}px)` },
    { transform: `translateX(${-amplitude * 0.67}px)` },
    { transform: `translateX(${amplitude * 0.67}px)` },
    { transform: `translateX(${-amplitude * 0.33}px)` },
    { transform: `translateX(${amplitude * 0.33}px)` },
    { transform: 'translateX(0)' },
  ];
  return steps;
}
