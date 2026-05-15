// Adventurers Guild Simulator — Test: Render Module Split
// Verifies module exports and helper functions in the new TypeScript module structure

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

// ─── Check new module files exist ───
console.log('\n--- Module Structure ---');
checkFile('src/render/card.ts', join(__dirname, 'src', 'render', 'card.ts'));
checkFile('src/render/tab.ts', join(__dirname, 'src', 'render', 'tab.ts'));
checkFile('src/render/event-display.ts', join(__dirname, 'src', 'render', 'event-display.ts'));
checkFile('src/render/index.ts', join(__dirname, 'src', 'render', 'index.ts'));
checkFile('src/render/index.ts barrel', join(__dirname, 'src', 'render', 'index.ts'));

// Old file should be deleted
const oldPath = join(__dirname, 'src', 'render.js');
try {
  readFileSync(oldPath, 'utf-8');
  console.error('  ✗ src/render.js should be deleted');
  passed = false;
} catch {
  console.log('  ✓ src/render.js deleted');
}

// ─── Check card.ts exports ───
console.log('\n--- card.ts Exports ---');
checkContent('card.ts', join(__dirname, 'src', 'render', 'card.ts'), [
  'export function renderCard',
  'export function renderAdventurerCard',
  'export function renderQuestCard',
  'export function renderEventCard',
  'export function getRarityColor',
  'export function getMoraleBarColor',
  'export function getDifficultyStars',
], 'function exports');

// ─── Check tab.ts exports ───
console.log('\n--- tab.ts Exports ---');
checkContent('tab.ts', join(__dirname, 'src', 'render', 'tab.ts'), [
  'export function renderView',
  'export function renderDashboard',
  'export function renderRoster',
  'export function renderRecruitment',
  'export function renderQuestBoard',
  'export function renderEvents',
  'export function renderUpgrades',
  'export function createOfficeCard',
  'export function createFameCard',
  'export function createPartyStatusCard',
  'export function renderNotifications',
  'export function formatUpgradeEffects',
], 'function exports');

// ─── Check event-display.ts exports ───
console.log('\n--- event-display.ts Exports ---');
checkContent('event-display.ts', join(__dirname, 'src', 'render', 'event-display.ts'), [
  'export function showConfirmModal',
  'export function showEventModal',
  'export function hideModal',
], 'function exports');

// ─── Check barrel exports ───
console.log('\n--- Barrel Export ---');
checkContent('index.ts barrel', join(__dirname, 'src', 'render', 'index.ts'), [
  "export * from './card.js'",
  "export * from './tab.js'",
  "export * from './event-display.js'",
], 'barrel re-exports');

// ─── Verify app.js imports from barrel ───
console.log('\n--- app.js Import Update ---');
const appPath = join(__dirname, 'src', 'app.js');
const appCode = readFileSync(appPath, 'utf-8');
if (appCode.includes('./render/index.js')) {
  console.log('  ✓ app.js imports from ./render/index.js');
} else {
  console.error('  ✗ app.js does not import from ./render/index.js');
  passed = false;
}

// ─── Verify threat mitigation T-04-01 ───
console.log('\n--- Threat Mitigation ---');
if (appCode.includes('document.importNode') || 
    readFileSync(join(__dirname, 'src', 'render', 'card.ts'), 'utf-8').includes('document.importNode')) {
  console.log('  ✓ Uses document.importNode for template cloning (D-06)');
}

if (readFileSync(join(__dirname, 'src', 'render', 'card.ts'), 'utf-8').includes('.textContent') ||
    readFileSync(join(__dirname, 'src', 'render', 'card.ts'), 'utf-8').includes('setAttribute')) {
  console.log('  ✓ Uses textContent/setAttribute for game data (T-04-01 mitigation)');
}

// ─── Verify TypeScript compliance ───
console.log('\n--- TypeScript Compliance ---');
const cardCode = readFileSync(join(__dirname, 'src', 'render', 'card.ts'), 'utf-8');
if (!cardCode.includes(': any')) {
  console.log('  ✓ No "any" types in card.ts');
} else {
  console.error('  ✗ Found "any" types in card.ts');
  passed = false;
}

if (passed) {
  console.log('\n✅ All render module split checks PASSED');
  process.exit(0);
} else {
  console.error('\n❌ Some render module split checks FAILED');
  process.exit(1);
}
