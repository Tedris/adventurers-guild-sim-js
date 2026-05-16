// Adventurers Guild Simulator — WAAPI Animation Utilities
// =======================================================
// Shared animation utilities for Web Animations API (WAAPI).
// All animations respect prefers-reduced-motion.
//
// Threat mitigation T-04-01: Animation handles are returned to callers
// who must call .finish() or .cancel() to prevent memory leaks.

// ─── Types ─────────────────────────────────────────────

/**
 * Animation configuration for typed WAAPI animations.
 */
export interface AnimationConfig {
  keyframes: Keyframe[];
  options?: AnimationOptions;
  duration?: number;
  easing?: string;
  delay?: number;
  fill?: 'forwards' | 'backwards' | 'both' | 'none';
}

// ─── Core Animation API ────────────────────────────────

/**
 * Play a WAAPI animation on an element and return the Animation handle.
 * @param element — Target DOM element
 * @param config — Animation configuration
 * @returns Animation handle (caller must call .finish() or .cancel() to clean up)
 */
export function playAnimation(
  element: HTMLElement,
  config: AnimationConfig,
): Animation {
  if (prefersReducedMotion()) {
    // Return a no-op animation that resolves immediately
    const noop = element.animate([], { duration: 0 });
    noop.cancel();
    return noop;
  }

  const animation = element.animate(config.keyframes, {
    duration: config.duration ?? 200,
    easing: config.easing ?? 'ease-out',
    delay: config.delay ?? 0,
    fill: config.fill ?? 'forwards',
    ...config.options,
  });

  return animation;
}

/**
 * Play an animation and return a promise that resolves when it completes.
 * @param element — Target DOM element
 * @param config — Animation configuration
 * @returns Promise that resolves on animationfinish
 */
export function playAnimationAsync(
  element: HTMLElement,
  config: AnimationConfig,
): Promise<void> {
  return new Promise((resolve) => {
    if (prefersReducedMotion()) {
      resolve();
      return;
    }

    const animation = playAnimation(element, config);
    animation.addEventListener('finish', () => {
      animation.finish();
      resolve();
    });
    // Safety net: resolve after 2x the configured duration
    const timeout = setTimeout(() => {
      animation.cancel();
      resolve();
    }, ((config.duration ?? 200) * 2) + (config.delay ?? 0));
    animation.addEventListener('finish', () => clearTimeout(timeout), { once: true });
  });
}

/**
 * Check if the user prefers reduced motion.
 * Respects prefers-reduced-motion media query.
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Create a batch of parallel animations and play them all.
 * Returns a promise that resolves when all animations complete.
 * @param animations — Array of { element, config } pairs
 */
export function playBatchAnimation(
  animations: Array<{ element: HTMLElement; config: AnimationConfig }>,
): Promise<void> {
  const promises = animations.map(({ element, config }) =>
    playAnimationAsync(element, config),
  );
  return Promise.all(promises).then(() => {});
}

// ─── Animation Presets — Card Transitions ──────────────

/**
 * Slide-in from right animation (for recruited adventurers).
 * Duration: 180ms, easing: ease-out.
 */
export function slideInFromRight(duration: number = 180): AnimationConfig {
  return {
    keyframes: [
      { transform: 'translateX(30px)', opacity: '0' },
      { transform: 'translateX(0)', opacity: '1' },
    ],
    duration,
    easing: 'ease-out',
    fill: 'none',
  };
}

/**
 * Fade-out with shrink animation (for retired/quested adventurers).
 * Duration: 200ms, easing: ease-in.
 */
export function fadeOutAndShrink(duration: number = 200): AnimationConfig {
  return {
    keyframes: [
      { transform: 'scale(1)', opacity: '1' },
      { transform: 'scale(0.95)', opacity: '0' },
    ],
    duration,
    easing: 'ease-in',
    fill: 'none',
  };
}

// ─── Animation Presets — Tab Transitions ───────────────

/**
 * Tab slide transition — old view slides out, new view slides in.
 * @param direction — 'left' (next tab) or 'right' (prev tab)
 */
export function tabSlideTransition(
  direction: 'left' | 'right',
): { out: AnimationConfig; in: AnimationConfig } {
  const isLeft = direction === 'left';

  const out: AnimationConfig = {
    keyframes: [
      { opacity: '1', transform: 'translateX(0)' },
      {
        opacity: '0',
        transform: `translateX(${isLeft ? '-30px' : '30px'})`,
      },
    ],
    duration: 250,
    easing: 'ease-out',
    fill: 'none',
  };

  const inConfig: AnimationConfig = {
    keyframes: [
      {
        opacity: '0',
        transform: `translateX(${isLeft ? '30px' : '-30px'})`,
      },
      { opacity: '1', transform: 'translateX(0)' },
    ],
    duration: 250,
    easing: 'ease-in',
    fill: 'none',
  };

  return { out, in: inConfig };
}

// ─── Animation Presets — Event Feedback ────────────────

/**
 * Flash animation for event feedback.
 * Brief scale + opacity pulse.
 * Duration: 300ms, easing: ease-in-out.
 */
export function eventFlash(duration: number = 300): AnimationConfig {
  return {
    keyframes: [
      { transform: 'scale(1)', opacity: '1' },
      { transform: 'scale(1.05)', opacity: '0.85' },
      { transform: 'scale(1)', opacity: '1' },
    ],
    duration,
    easing: 'ease-in-out',
    fill: 'none',
  };
}

/**
 * Scale pulse for positive feedback (quest success, upgrade).
 */
export function scalePulse(duration: number = 200): AnimationConfig {
  return {
    keyframes: [
      { transform: 'scale(1)' },
      { transform: 'scale(1.08)' },
      { transform: 'scale(1)' },
    ],
    duration,
    easing: 'ease-out',
    fill: 'none',
  };
}

/**
 * Shake animation for negative feedback (quest failure, error).
 */
export function shake(duration: number = 300): AnimationConfig {
  return {
    keyframes: [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-6px)' },
      { transform: 'translateX(6px)' },
      { transform: 'translateX(-6px)' },
      { transform: 'translateX(6px)' },
      { transform: 'translateX(0)' },
    ],
    duration,
    easing: 'ease-in-out',
    fill: 'none',
  };
}

/**
 * Positive event feedback (budget bonus, successful quest, upgrade).
 * Green flash + scale pulse.
 */
export function positiveEventFeedback(duration: number = 200): AnimationConfig {
  return {
    keyframes: [
      {
        transform: 'scale(1)',
        opacity: '1',
        filter: 'hue-rotate(0deg)',
      },
      {
        transform: 'scale(1.1)',
        opacity: '1',
        filter: 'hue-rotate(90deg) brightness(1.2)',
      },
      {
        transform: 'scale(1)',
        opacity: '1',
        filter: 'hue-rotate(0deg)',
      },
    ],
    duration,
    easing: 'ease-out',
    fill: 'none',
  };
}

/**
 * Negative event feedback (crisis, failed quest, budget loss).
 * Red flash + shake.
 */
export function negativeEventFeedback(duration: number = 300): AnimationConfig {
  return {
    keyframes: [
      { transform: 'translateX(0)', filter: 'hue-rotate(0deg)' },
      { transform: 'translateX(-4px)', filter: 'hue-rotate(280deg) brightness(1.3)' },
      { transform: 'translateX(4px)', filter: 'hue-rotate(280deg) brightness(1.3)' },
      { transform: 'translateX(-4px)', filter: 'hue-rotate(280deg) brightness(1.3)' },
      { transform: 'translateX(4px)', filter: 'hue-rotate(280deg) brightness(1.3)' },
      { transform: 'translateX(0)', filter: 'hue-rotate(0deg)' },
    ],
    duration,
    easing: 'ease-in-out',
    fill: 'none',
  };
}

/**
 * Neutral event feedback (drama event, info notification).
 * Subtle opacity pulse.
 */
export function neutralEventFeedback(duration: number = 400): AnimationConfig {
  return {
    keyframes: [
      { opacity: '1' },
      { opacity: '0.75' },
      { opacity: '1' },
    ],
    duration,
    easing: 'ease-in-out',
    fill: 'none',
  };
}

/**
 * Quest success celebration.
 * Gold sparkles + scale up + fade.
 */
export function questSuccessCelebration(duration: number = 500): AnimationConfig {
  return {
    keyframes: [
      { transform: 'scale(1)', opacity: '1' },
      { transform: 'scale(1.08)', opacity: '1' },
      { transform: 'scale(1.05)', opacity: '0.9' },
      { transform: 'scale(1)', opacity: '1' },
    ],
    duration,
    easing: 'ease-out',
    fill: 'none',
  };
}

/**
 * Quest failure disappointment.
 * Red tint + shake + fade out.
 */
export function questFailureAnimation(duration: number = 400): AnimationConfig {
  return {
    keyframes: [
      { transform: 'translateX(0) scale(1)', opacity: '1', filter: 'hue-rotate(0deg)' },
      { transform: 'translateX(-4px) scale(0.98)', opacity: '0.85', filter: 'hue-rotate(280deg)' },
      { transform: 'translateX(4px) scale(0.98)', opacity: '0.85', filter: 'hue-rotate(280deg)' },
      { transform: 'translateX(-2px) scale(0.97)', opacity: '0.8', filter: 'hue-rotate(280deg)' },
      { transform: 'translateX(0) scale(0.97)', opacity: '0.8', filter: 'hue-rotate(280deg)' },
    ],
    duration,
    easing: 'ease-in',
    fill: 'none',
  };
}

/**
 * Upgrade purchased feedback.
 * Green scale pulse on upgrade card.
 */
export function upgradeSuccessAnimation(duration: number = 300): AnimationConfig {
  return {
    keyframes: [
      { transform: 'scale(1)', filter: 'hue-rotate(0deg)' },
      { transform: 'scale(1.03)', filter: 'hue-rotate(90deg) brightness(1.1)' },
      { transform: 'scale(1)', filter: 'hue-rotate(0deg)' },
    ],
    duration,
    easing: 'ease-out',
    fill: 'none',
  };
}
