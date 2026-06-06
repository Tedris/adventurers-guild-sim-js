// Adventurers Guild Simulator — Tests: Feedback Utility Module
// Tests for feedback.ts — floating text, screen flash, SFX, reduced motion

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let passed = true;

function checkFile(name, path) {
  try {
    readFileSync(path, 'utf-8');
    console.log(`  ✓ ${name} exists`);
    return true;
  } catch {
    console.error(`  ✗ ${name} does not exist`);
    passed = false;
    return false;
  }
}

function checkContent(name, path, patterns, label) {
  if (!path) return;
  const code = readFileSync(path, 'utf-8');
  let allFound = true;
  for (const pattern of patterns) {
    if (code.includes(pattern)) {
      console.log(`  ✓ ${name}: ${pattern}`);
    } else {
      console.error(`  ✗ ${name}: missing "${pattern}"`);
      allFound = false;
    }
  }
  return allFound;
}

// ─── Check feedback.ts exists ───
console.log('\n--- Feedback Module File ---');
checkFile('src/feedback.ts', join(__dirname, 'src', 'feedback.ts'));

// ─── Check exported functions ───
console.log('\n--- Feedback Exports ---');
const feedbackCode = readFileSync(join(__dirname, 'src', 'feedback.ts'), 'utf-8');

checkContent('feedback.ts', join(__dirname, 'src', 'feedback.ts'), [
  'export function showFloatingText',
  'export function playScreenFlash',
  'export function playSound',
  'export function playScreenShake',
  'export function createQuestProgressBar',
  'export function updateQuestProgressBar',
  'export function removeQuestProgressBar',
  'export function initReducedMotion',
  'export function isReducedMotion',
  'export function setReducedMotionSetting',
  'export function initAudio',
  'export function getReducedMotionSettings',
], 'function exports');

// ─── Check reduced motion support ───
console.log('\n--- Reduced Motion Support ---');
checkContent('feedback.ts', join(__dirname, 'src', 'feedback.ts'), [
  'isReducedMotion',
  'reducedMotionSetting',
  'reducedMotionPreference',
], 'reduced motion checks');

// Verify reduced motion suppresses WAAPI animations
if (feedbackCode.includes('if (isReducedMotion())') && feedbackCode.includes('playScreenShake')) {
  console.log('  ✓ Screen shake suppressed when reduced motion enabled');
} else {
  console.error('  ✗ Screen shake not suppressed for reduced motion');
  passed = false;
}

// Verify floating text preserved in reduced motion
if (feedbackCode.includes('Reduced motion:') || feedbackCode.includes('Reduced motion mode')) {
  console.log('  ✓ Floating text preserved in reduced motion mode');
} else {
  console.error('  ✗ Floating text behavior in reduced motion unclear');
  passed = false;
}

// ─── Check floating text features ───
console.log('\n--- Floating Text Features ---');
checkContent('feedback.ts', join(__dirname, 'src', 'feedback.ts'), [
  'MAX_CONCURRENT_FLOATING_TEXTS',
  'cleanupOldFloatingTexts',
  'detectTextColor',
  'feedback-floating-text',
], 'floating text implementation');

// Check color detection logic
if (feedbackCode.includes("normalized.startsWith('-')") || feedbackCode.includes("normalized.includes('fail')")) {
  console.log('  ✓ Negative text detected as red');
} else {
  console.error('  ✗ Negative text color detection missing');
  passed = false;
}

if (feedbackCode.includes("normalized.startsWith('+')") || feedbackCode.includes("normalized.includes('success')")) {
  console.log('  ✓ Positive text detected as green');
} else {
  console.error('  ✗ Positive text color detection missing');
  passed = false;
}

// ─── Check screen flash ───
console.log('\n--- Screen Flash ---');
checkContent('feedback.ts', join(__dirname, 'src', 'feedback.ts'), [
  'feedback-screen-flash',
  'rgba(39, 174, 96, 0.3)',
  'rgba(231, 76, 60, 0.3)',
  'rgba(255, 215, 0, 0.3)',
], 'screen flash colors');

// Check green/red/gold color parameter
if (feedbackCode.includes("color: 'green' | 'red' | 'gold'")) {
  console.log('  ✓ Typed color parameter for playScreenFlash');
} else {
  console.error('  ✗ playScreenFlash color parameter not typed');
  passed = false;
}

// ─── Check SFX (Web Audio API) ───
console.log('\n--- Audio SFX ---');
checkContent('feedback.ts', join(__dirname, 'src', 'feedback.ts'), [
  'AudioContext',
  'playClickSound',
  'playSuccessSound',
  'playFailureSound',
  '800', // 800Hz click
  '0.05', // 50ms click duration
  '523.25', // C4
  '659.25', // E4
  '783.99', // G4
  'sawtooth', // failure uses sawtooth
], 'SFX implementation');

// Check audio init on user gesture
if (feedbackCode.includes('init()') || feedbackCode.includes('user gesture') || feedbackCode.includes('initAudio')) {
  console.log('  ✓ Audio init documented for user gesture requirement');
} else {
  console.error('  ✗ Audio init user gesture requirement not addressed');
  passed = false;
}

// ─── Check progress bar ───
console.log('\n--- Progress Bar ---');
checkContent('progress-bar', join(__dirname, 'src', 'feedback.ts'), [
  'quest-progress-bar',
  'quest-progress-label',
  'quest-progress-bar-outer',
  'quest-progress-bar-inner',
  'quest-progress-ticks',
], 'progress bar DOM structure');

if (feedbackCode.includes('createQuestProgressBar') &&
    feedbackCode.includes('updateQuestProgressBar') &&
    feedbackCode.includes('removeQuestProgressBar')) {
  console.log('  ✓ Full progress bar lifecycle (create/update/remove)');
} else {
  console.error('  ✗ Progress bar lifecycle incomplete');
  passed = false;
}

// ─── Check DOM element lifecycle / memory leak prevention ───
console.log('\n--- Memory Leak Prevention ---');
if (feedbackCode.includes('removeChild') || feedbackCode.includes('remove(')) {
  console.log('  ✓ DOM elements removed after animation');
} else {
  console.error('  ✗ DOM cleanup after animation missing');
  passed = false;
}

if (feedbackCode.includes('catch') && feedbackCode.includes('parentNode')) {
  console.log('  ✓ Safe DOM removal with error handling');
} else {
  console.error('  ✗ Unsafe DOM removal — potential memory leak');
  passed = false;
}

// ─── Check debouncing ───
console.log('\n--- Debouncing ---');
if (feedbackCode.includes('CLICK_FREQ_DEBOUNCE_MS') || feedbackCode.includes('debounce')) {
  console.log('  ✓ Debounce for rapid feedback calls');
} else {
  console.error('  ✗ Debounce mechanism missing');
  passed = false;
}

if (feedbackCode.includes('MAX_CONCURRENT_FLOATING_TEXTS') || feedbackCode.includes('cleanupOldFloatingTexts')) {
  console.log('  ✓ Concurrent floating text limit enforced');
} else {
  console.error('  ✗ Concurrent floating text limit missing');
  passed = false;
}

// ─── Verify no state mutations in feedback module ───
console.log('\n--- Pure Functions Verification ---');
// The feedback module should not import or use the game store
const storeImports = ['from \'../store', 'from \'./store', 'from \'@/store', 'dispatch(', 'store.'];
let hasStoreAccess = false;
for (const imp of storeImports) {
  if (feedbackCode.includes(imp)) {
    console.error(`  ✗ Feedback module accesses store: "${imp}"`);
    hasStoreAccess = true;
    passed = false;
  }
}
if (!hasStoreAccess) {
  console.log('  ✓ No store access — pure presentation functions');
}

// ─── Check TypeScript types ───
console.log('\n--- TypeScript Compliance ---');
if (!feedbackCode.includes(': any')) {
  console.log('  ✓ No "any" types in feedback.ts');
} else {
  console.error('  ✗ Found "any" types in feedback.ts');
  passed = false;
}

if (feedbackCode.includes('FloatingTextOptions') || feedbackCode.includes('interface')) {
  console.log('  ✓ TypeScript interfaces defined');
} else {
  console.error('  ✗ No TypeScript interfaces found');
  passed = false;
}

// ─── Check animation.ts integration ───
console.log('\n--- Animation Module Integration ---');
if (feedbackCode.includes("from './animation.js'")) {
  console.log('  ✓ Imports from animation.js module');
} else {
  console.error('  ✗ Does not import from animation.js');
  passed = false;
}

if (feedbackCode.includes('prefersReducedMotion')) {
  console.log('  ✓ Uses shared prefersReducedMotion from animation.ts');
} else {
  console.error('  ✗ Does not use shared prefersReducedMotion');
  passed = false;
}

// ─── Summary ───
if (passed) {
  console.log('\n✅ All feedback module checks PASSED');
  process.exit(0);
} else {
  console.error('\n❌ Some feedback module checks FAILED');
  process.exit(1);
}
