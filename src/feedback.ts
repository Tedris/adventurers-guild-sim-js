// Adventurers Guild Simulator — Feedback System Adapter
// =====================================================
// Adapter layer that wraps click-effects.ts exports to provide
// the higher-level feedback API expected by app.js.
//
// Exports: initAudio, showFloatingText, playScreenFlash,
//          playSound, playScreenShake

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {
  getAudioContext,
  playClickSound,
  createFloatingText,
  triggerScreenShake,
  prefersReducedMotion,
} from './click-effects.js';

type Keyframe = Record<string, string | number | null | undefined>;

export type FlashColor = 'green' | 'red' | 'gold';
export type SoundName = 'click' | 'success' | 'failure';

// ─── Audio Initialization ────────────────────────────

/**
 * Initialize the audio context on first user interaction.
 * Browser autoplay policy requires user gesture.
 */
export function initAudio(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch {
    // Audio not available — silently skip
  }
}

// ─── Floating Text ───────────────────────────────────

/**
 * Show floating text at screen coordinates.
 * Uses document.body as the container.
 * @param text — Text to display
 * @param x — X coordinate in pixels
 * @param y — Y coordinate in pixels
 * @param color — Text color (default: '#ffd700')
 */
export function showFloatingText(text: string, x: number, y: number, color?: string): void {
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
 * @param color — Flash color type
 */
export function playScreenFlash(color: FlashColor): void {
  if (typeof document === 'undefined') return;
  if (prefersReducedMotion()) return;
  try {
    const flash = document.createElement('div');
    flash.className = 'feedback-screen-flash';

    const colorMap: Record<FlashColor, string> = {
      green: 'rgba(39, 174, 96, 0.25)',
      red: 'rgba(231, 76, 60, 0.25)',
      gold: 'rgba(255, 215, 0, 0.25)',
    };

    flash.style.backgroundColor = colorMap[color] || colorMap.gold;
    try {
      document.body.appendChild(flash);
    } catch {
      return;
    }

    try {
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
      if (flash.parentNode) flash.parentNode.removeChild(flash);
    }
  } catch {
    // Silent fail — screen flash is non-critical
  }
}

// ─── Sound Dispatcher ────────────────────────────────

/**
 * Play a named sound effect by dispatching to the appropriate handler.
 * @param soundName — Sound to play
 */
export function playSound(soundName: SoundName): void {
  if (typeof document === 'undefined') return;
  try {
    if (soundName === 'click') {
      try {
        playClickSound(null);
      } catch {
        // Click sound not available — silently skip
      }
    } else if (soundName === 'success' || soundName === 'failure') {
      // Sound placeholder — wire to Web Audio API when tones are defined
    }
  } catch {
    // Silent fail — audio is non-critical
  }
}

// ─── Screen Shake ────────────────────────────────────

/**
 * Play screen shake on an element.
 * @param element — Element to shake
 * @param duration — Animation duration in ms (default: 150)
 * @param amplitude — Shake amplitude in px (default: 3)
 */
export function playScreenShake(element: HTMLElement, duration?: number, amplitude?: number): void {
  if (typeof document === 'undefined') return;
  if (prefersReducedMotion()) return;

  try {
    if (duration === undefined && amplitude === undefined) {
      // Use default click-effects shake
      triggerScreenShake(element);
    } else {
      // Custom shake with specified params
      const safeAmplitude = amplitude === undefined || !Number.isFinite(amplitude) || amplitude < 0 ? 3 : amplitude;
      const safeDuration = Number.isFinite(duration) ? duration : 150;
      const keyframes = generateShakeKeyframes(safeAmplitude);
      element.animate(keyframes, {
        duration: safeDuration,
        easing: 'ease-out',
        fill: 'none',
      });
    }
  } catch {
    // Silent fail — animation is non-critical
  }
}

/**
 * Generate WAAPI keyframes for a shake animation.
 * @param amplitude — Max displacement in pixels
 */
function generateShakeKeyframes(amplitude: number): Keyframe[] {
  const steps: Keyframe[] = [
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
