// Adventurers Guild Simulator — Test: Event Listener Cleanup
// Verifies that event listener tracking and cleanup is properly implemented

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
  if (!path) return false;
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

function countOccurrences(code, pattern) {
  const matches = code.split(pattern);
  return matches.length - 1;
}

function countNativeAddEventListener(code, excludeLines) {
  const lines = code.split('\n');
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Count addEventListener that's NOT trackEventListener
    if (line.includes('addEventListener') && !line.includes('trackEventListener')) {
      // Check if this is a native addEventListener (not WAAPI animation.addEventListener)
      if (!line.includes('animHandle.addEventListener') && !line.includes('.addEventListener(')) {
        continue;
      }
      // Check if it's not a finish event listener (WAAPI)
      if (line.trim().includes('animHandle.addEventListener')) {
        continue;
      }
      count++;
    }
  }
  return count;
}

// ─── Check listener tracking helpers exist in card.ts ───
console.log('\n--- Listener Tracking Helpers (card.ts) ---');
const cardPath = join(__dirname, 'src', 'render', 'card.ts');
checkFile('card.ts', cardPath);

checkContent('card.ts', cardPath, [
  'function trackEventListener',
  'export function trackEventListener',
  'export function detachAllListeners',
  'const _listenerRefs = new WeakMap',
], 'listener tracking functions');

// ─── Check tab.ts imports listener tracking ───
console.log('\n--- Tab.ts Imports ---');
const tabPath = join(__dirname, 'src', 'render', 'tab.ts');
checkFile('tab.ts', tabPath);

checkContent('tab.ts', tabPath, [
  "import { renderCard, trackEventListener, detachAllListeners } from './card.js'",
], 'listener tracking imports');

// ─── Check card.ts uses trackEventListener for evolution button ───
console.log('\n--- Evolution Button Tracking ---');
const cardCode = readFileSync(cardPath, 'utf-8');

// Verify evolution button uses trackEventListener
const evolveMatch = cardCode.match(/evolveHandler.*\)/s);
if (evolveMatch) {
  console.log('  ✓ Evolution button uses named handler (evolveHandler)');
} else {
  console.error('  ✗ Evolution button does not use named handler');
  passed = false;
}

if (cardCode.includes("trackEventListener(evolveBtn, 'click', evolveHandler)")) {
  console.log('  ✓ Evolution button uses trackEventListener');
} else {
  console.error('  ✗ Evolution button does not use trackEventListener');
  passed = false;
}

// ─── Check tab.ts uses trackEventListener for roster buttons ───
console.log('\n--- Roster Button Tracking ---');
const tabCode = readFileSync(tabPath, 'utf-8');

if (tabCode.includes('trackEventListener(partyBtn, \'click\', partyHandler)')) {
  console.log('  ✓ Party button (standard) uses trackEventListener');
} else {
  console.error('  ✗ Party button (standard) does not use trackEventListener');
  passed = false;
}

if (tabCode.includes('trackEventListener(retireBtn, \'click\', retireHandler)')) {
  console.log('  ✓ Retire button (standard) uses trackEventListener');
} else {
  console.error('  ✗ Retire button (standard) does not use trackEventListener');
  passed = false;
}

// ─── Check tab.ts detachAllListeners in animation cleanup ───
console.log('\n--- Animation Cleanup with Listener Detachment ---');
if (tabCode.includes('detachAllListeners(oldCard)')) {
  console.log('  ✓ renderRosterStandard: detachAllListeners in removed card cleanup');
} else {
  console.error('  ✗ renderRosterStandard: missing detachAllListeners in removed card cleanup');
  passed = false;
}

if (tabCode.includes('detachAllListeners(cardEl)') && tabCode.includes('Retire')) {
  console.log('  ✓ Retire button: detachAllListeners in animation finish');
} else {
  console.error('  ✗ Retire button: missing detachAllListeners in animation finish');
  passed = false;
}

if (tabCode.includes('detachAllListeners(element)') && tabCode.includes('onCardLeave')) {
  console.log('  ✓ VirtualList onCardLeave: detachAllListeners');
} else {
  console.error('  ✗ VirtualList onCardLeave: missing detachAllListeners');
  passed = false;
}

// ─── Check recruitment view ───
console.log('\n--- Recruitment View Tracking ---');
if (tabCode.includes('trackEventListener(hireBtn, \'click\', hireHandler)')) {
  console.log('  ✓ Hire button uses trackEventListener');
} else {
  console.error('  ✗ Hire button does not use trackEventListener');
  passed = false;
}

if (tabCode.includes('trackEventListener(restockBtn as HTMLElement, \'click\', restockHandler)')) {
  console.log('  ✓ Restock button uses trackEventListener');
} else {
  console.error('  ✗ Restock button does not use trackEventListener');
  passed = false;
}

if (tabCode.includes('detachAllListeners(oldCard)') && tabCode.includes('recruitmentOrphanedCount')) {
  console.log('  ✓ Recruitment: detachAllListeners with orphaned count tracking');
} else {
  console.error('  ✗ Recruitment: missing detachAllListeners with orphaned count');
  passed = false;
}

// ─── Check VirtualList destroy cleanup ───
console.log('\n--- VirtualList Destroy Cleanup ---');
const virtualListPath = join(__dirname, 'src', 'virtual-list.ts');
checkFile('virtual-list.ts', virtualListPath);

const virtualListCode = readFileSync(virtualListPath, 'utf-8');

if (virtualListCode.includes("import { detachAllListeners } from './render/card.js'")) {
  console.log('  ✓ virtual-list.ts imports detachAllListeners');
} else {
  console.error('  ✗ virtual-list.ts does not import detachAllListeners');
  passed = false;
}

if (virtualListCode.includes('detachAllListeners(card)') && virtualListCode.includes('destroy')) {
  console.log('  ✓ VirtualList.destroy() calls detachAllListeners');
} else {
  console.error('  ✗ VirtualList.destroy() missing detachAllListeners call');
  passed = false;
}

// ─── Check console.debug logging ───
console.log('\n--- Console Debug Logging ---');
if (tabCode.includes('console.debug(`[Render] Cleaned') && tabCode.includes('orphaned roster cards')) {
  console.log('  ✓ Roster: console.debug for orphaned card cleanup');
} else {
  console.error('  ✗ Roster: missing console.debug logging');
  passed = false;
}

if (tabCode.includes('console.debug(`[Render] Cleaned') && tabCode.includes('orphaned recruitment cards')) {
  console.log('  ✓ Recruitment: console.debug for orphaned card cleanup');
} else {
  console.error('  ✗ Recruitment: missing console.debug logging');
  passed = false;
}

// ─── Verify no orphaned native addEventListener in render functions ───
console.log('\n--- Native addEventListener Audit ---');
// Count native addEventListener calls in tab.ts that aren't WAAPI animations
const lines = tabCode.split('\n');
let suspiciousCalls = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  // Skip if it's trackEventListener
  if (trimmed.includes('trackEventListener')) continue;
  // Skip if it's a finish event listener (WAAPI animation)
  if (trimmed.includes('animHandle.addEventListener')) continue;
  // Skip comments
  if (trimmed.startsWith('//')) continue;
  // Skip if it's removeEventListener
  if (trimmed.includes('removeEventListener')) continue;
  // Check for native addEventListener on DOM elements
  if (trimmed.includes('.addEventListener(') && trimmed.includes('\'click\'')) {
    suspiciousCalls.push(`Line ${i + 1}: ${trimmed}`);
  }
}

if (suspiciousCalls.length === 0) {
  console.log('  ✓ No suspicious native addEventListener calls in tab.ts');
} else {
  console.error('  ✗ Found suspicious native addEventListener calls:');
  for (const call of suspiciousCalls) {
    console.error(`    ${call}`);
  }
  passed = false;
}

// Count native addEventListener in card.ts (excluding trackEventListener)
const cardLines = cardCode.split('\n');
let cardSuspicious = [];
for (let i = 0; i < cardLines.length; i++) {
  const line = cardLines[i];
  const trimmed = line.trim();
  if (trimmed.includes('trackEventListener')) continue;
  if (trimmed.includes('animHandle.addEventListener')) continue;
  if (trimmed.startsWith('//')) continue;
  if (trimmed.includes('.addEventListener(') && trimmed.includes('\'click\'')) {
    cardSuspicious.push(`Line ${i + 1}: ${trimmed}`);
  }
}

if (cardSuspicious.length === 0) {
  console.log('  ✓ No suspicious native addEventListener calls in card.ts');
} else {
  console.error('  ✗ Found suspicious native addEventListener calls in card.ts:');
  for (const call of cardSuspicious) {
    console.error(`    ${call}`);
  }
  passed = false;
}

// ─── Summary ───
console.log('\n' + '='.repeat(50));
if (passed) {
  console.log('✅ All event listener cleanup checks PASSED');
  process.exit(0);
} else {
  console.error('❌ Some event listener cleanup checks FAILED');
  process.exit(1);
}
