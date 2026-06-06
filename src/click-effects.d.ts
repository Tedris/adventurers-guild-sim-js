// Type declarations for click-effects.js
export function getAudioContext(): AudioContext;
export function playClickSound(ctx: AudioContext | null): void;
export function createFloatingText(container: HTMLElement, x: number, y: number, text: string): HTMLElement;
export function triggerScreenShake(element: HTMLElement): Animation;
export function prefersReducedMotion(): boolean;
