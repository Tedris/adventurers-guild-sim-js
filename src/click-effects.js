// Adventurers Guild Simulator — Click Effect Utilities
// =====================================================
// Floating text, screen shake, and click sound effects.
// All animations respect prefers-reduced-motion.
//
// Threat mitigation T-04-01: Animation handles are returned to callers
// who must call .finish() or .cancel() to prevent memory leaks.

// ─── Audio Context (singleton) ──────────────────────

let audioContext = null;

/**
 * Get or create the shared Web Audio API context.
 * Must be called from a user gesture (click) context.
 * @returns {AudioContext}
 */
export function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Browser may suspend the context until user interaction
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  return audioContext;
}

/**
 * Play a retro click sound effect using Web Audio API.
 * Short frequency burst with quick decay.
 * @param {AudioContext} ctx — Web Audio context
 */
export function playClickSound(ctx) {
  const context = ctx || getAudioContext();

  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  // Retro click: short high-frequency burst
  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(800, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(200, context.currentTime + 0.05);

  gainNode.gain.setValueAtTime(0.15, context.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.05);

  oscillator.start(context.currentTime);
  oscillator.stop(context.currentTime + 0.05);
}

// ─── Floating Text ──────────────────────────────────

/**
 * Create a floating text element at the given coordinates.
 * Animates upward and fades out, then removes from DOM.
 * @param {HTMLElement} container — Parent container element
 * @param {number} x — X coordinate in pixels
 * @param {number} y — Y coordinate in pixels
 * @param {string} text — Display text (e.g., "+1G")
 * @returns {HTMLElement} The floating text element
 */
export function createFloatingText(container, x, y, text) {
  const el = document.createElement('div');
  el.className = 'floating-text';
  el.textContent = text;
  el.style.position = 'fixed';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.pointerEvents = 'none';
  el.style.zIndex = '9999';
  el.style.fontWeight = 'bold';
  el.style.fontSize = '1rem';
  el.style.color = '#ffd700';
  el.style.textShadow = '0 0 4px rgba(255, 215, 0, 0.8)';
  el.style.whiteSpace = 'nowrap';

  container.appendChild(el);

  // Animate upward and fade out using WAAPI
  if (!prefersReducedMotion()) {
    try {
      const animation = el.animate(
        [
          { transform: 'translateY(0) scale(1)', opacity: 1 },
          { transform: 'translateY(-50px) scale(1.2)', opacity: 0.7 },
          { transform: 'translateY(-80px) scale(0.9)', opacity: 0 },
        ],
        {
          duration: 800,
          easing: 'ease-out',
          fill: 'forwards',
        }
      );

      animation.onfinish = () => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      };
    } catch {
      // WAAPI not supported or error — remove element immediately
      if (el.parentNode) el.parentNode.removeChild(el);
    }
  } else {
    // For reduced motion: fade out quickly without movement
    try {
      const animation = el.animate(
        [
          { opacity: 1 },
          { opacity: 0 },
        ],
        {
          duration: 300,
          easing: 'ease-out',
          fill: 'forwards',
        }
      );

      animation.onfinish = () => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      };
    } catch {
      // WAAPI not supported or error — remove element immediately
      if (el.parentNode) el.parentNode.removeChild(el);
    }
  }

  return el;
}

// ─── Screen Shake ───────────────────────────────────

/**
 * Play a subtle screen shake animation on the target element.
 * Uses WAAPI for smooth performance.
 * @param {HTMLElement} element — Element to shake
 * @returns {Animation} WAAPI animation handle
 */
export function triggerScreenShake(element) {
  if (prefersReducedMotion()) {
    // Return a no-op animation
    const noop = element.animate([], { duration: 0 });
    noop.cancel();
    return noop;
  }

  return element.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-3px)' },
      { transform: 'translateX(3px)' },
      { transform: 'translateX(-2px)' },
      { transform: 'translateX(2px)' },
      { transform: 'translateX(-1px)' },
      { transform: 'translateX(1px)' },
      { transform: 'translateX(0)' },
    ],
    {
      duration: 150,
      easing: 'ease-out',
      fill: 'none',
    }
  );
}

// ─── Reduced Motion ─────────────────────────────────

/**
 * Check if the user prefers reduced motion.
 * Respects prefers-reduced-motion media query.
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
