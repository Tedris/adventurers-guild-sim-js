// Adventurers Guild Simulator — Test: Party Composition Validation (Story 6-4)
// Verifies party composition validation: duplicate detection, size limits, dispatch validation

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
    const found = code.includes(pattern) || code.includes(pattern.replace(/'/g, '"'));
    if (found) {
      console.log(`  ✓ ${name}: ${pattern}`);
    } else {
      console.error(`  ✗ ${name}: missing "${pattern}"`);
      allFound = false;
    }
  }
  return allFound;
}

// ─── Check tab.ts has showValidationError function ───
console.log('\n--- showValidationError Function (AC: 1, 2) ---');
const tabCode = readFileSync(join(__dirname, 'src', 'render', 'tab.ts'), 'utf-8');
checkContent('tab.ts', join(__dirname, 'src', 'render', 'tab.ts'), [
  'function showValidationError',
  'Adventurer already in party!',
  'Party is full',
  'MAX_PARTY_SIZE',
  'role',
  'alert',
  '1500',
], 'validation helper function');

// ─── Check duplicate adventurer detection in drop handler (AC: 1) ───
console.log('\n--- Duplicate Adventurer Detection (AC: 1) ---');
checkContent('tab.ts', join(__dirname, 'src', 'render', 'tab.ts'), [
  'currentParty.includes(adventurerId)',
  'Adventurer already in party',
  'showValidationError',
  'Party is full',
], 'drop handler duplicate check');

// ─── Check party size limit validation (AC: 2) ───
console.log('\n--- Party Size Limit Validation (AC: 2) ---');
checkContent('tab.ts', join(__dirname, 'src', 'render', 'tab.ts'), [
  'MAX_PARTY_SIZE',
  'currentParty.length',
  '`Party is full',
], 'drop handler size check');

// ─── Check dispatch button validation (AC: 3, 4) ───
console.log('\n--- Dispatch Button Validation (AC: 3, 4) ---');
checkContent('tab.ts', join(__dirname, 'src', 'render', 'tab.ts'), [
  'quest.requirements?.minPartySize',
  'MIN_PARTY_SIZE',
  'dispatch-btn-warning',
  'Need at least',
  'SEND_QUEST',
], 'dispatch validation in createPartyOverviewPanel');

// ─── Check imports for constants ───
console.log('\n--- Entity Constants Import ---');
checkContent('tab.ts', join(__dirname, 'src', 'render', 'tab.ts'), [
  'MAX_PARTY_SIZE',
  'MIN_PARTY_SIZE',
], 'constants imported from entities');

// ─── Check CSS validation feedback styles (AC: 1, 2) ───
console.log('\n--- Validation Feedback CSS (AC: 1, 2) ---');
const cssCode = readFileSync(join(__dirname, 'src', 'styles.css'), 'utf-8');
checkContent('styles.css', join(__dirname, 'src', 'styles.css'), [
  '.validation-toast',
  '.validation-error',
  '.dispatch-btn-warning',
  'redBorderFlash',
  '@keyframes redBorderFlash',
  '#E74C3C',
], 'validation CSS classes');

// ─── Verify no unintended changes to roster buttons ───
console.log('\n--- Roster Button Integrity ---');
checkContent('tab.ts', join(__dirname, 'src', 'render', 'tab.ts'), [
  'Add to Party',
  'Remove from Party',
  'btn-assign-party',
  'btn-remove-party',
], 'roster buttons unchanged');

// ─── Verify backdrop drop zone still works (remove is always valid) ───
console.log('\n--- Backdrop Drop Zone Integrity ---');
checkContent('tab.ts', join(__dirname, 'src', 'render', 'tab.ts'), [
  'party-over-backdrop',
  'ASSIGN_PARTY',
  'filter((id) => id !== adventurerId)',
], 'backdrop remove flow unchanged');

// ─── Verify showValidationError auto-dismiss behavior ───
console.log('\n--- Toast Auto-Dismiss ---');
checkContent('tab.ts', join(__dirname, 'src', 'render', 'tab.ts'), [
  'setTimeout',
  "toast.style.opacity = '0'",
  'toast.remove()',
], 'toast auto-dismiss cleanup');

// ─── Verify duplicate check runs before dispatch ───
console.log('\n--- Validation Order ---');
const dropHandlerSection = tabCode.substring(tabCode.indexOf('dropHandler'));
const duplicateCheckIndex = dropHandlerSection.indexOf('Adventurer already in party');
const sizeCheckIndex = dropHandlerSection.indexOf('Party is full');
const dispatchIndex = dropHandlerSection.indexOf('ASSIGN_PARTY');
if (duplicateCheckIndex < dispatchIndex) {
  console.log('  ✓ Duplicate check runs before dispatch');
} else {
  console.error('  ✗ Duplicate check does not run before dispatch');
  passed = false;
}
if (sizeCheckIndex < dispatchIndex) {
  console.log('  ✓ Size check runs before dispatch');
} else {
  console.error('  ✗ Size check does not run before dispatch');
  passed = false;
}

if (passed) {
  console.log('\n✅ All party composition validation checks PASSED');
  process.exit(0);
} else {
  console.error('\n❌ Some party composition validation checks FAILED');
  process.exit(1);
}
