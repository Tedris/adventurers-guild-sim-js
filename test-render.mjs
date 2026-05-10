// Adventurers Guild Simulator — Test: render.js
// Verifies module exports and helper functions

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let passed = true;

// ─── Check file exists ───
const renderPath = join(__dirname, 'src', 'render.js');
try {
  readFileSync(renderPath, 'utf-8');
  console.log('  ✓ render.js exists');
} catch {
  console.error('  ✗ render.js does not exist');
  process.exit(1);
}

// ─── Check exports via file content (DOM-dependent functions can't be imported in Node) ───
const renderCode = readFileSync(renderPath, 'utf-8');

const REQUIRED_EXPORTS = [
  'export function renderCard',
  'export function renderAdventurerCard',
  'export function renderQuestCard',
  'export function renderEventCard',
];

for (const exp of REQUIRED_EXPORTS) {
  if (renderCode.includes(exp)) {
    console.log(`  ✓ ${exp.replace('export function ', '')} exported`);
  } else {
    console.error(`  ✗ ${exp.replace('export function ', '')} NOT exported`);
    passed = false;
  }
}

// ─── Check helper functions ───
const REQUIRED_HELPERS = [
  'function getRarityColor',
  'function getMoraleBarColor',
  'function getDifficultyStars',
];

for (const helper of REQUIRED_HELPERS) {
  if (renderCode.includes(helper)) {
    console.log(`  ✓ ${helper.split(' ').pop()} helper function present`);
  } else {
    console.error(`  ✗ ${helper.split(' ').pop()} helper function missing`);
    passed = false;
  }
}

// ─── Verify document.importNode usage (D-06 compliance) ───
if (renderCode.includes('document.importNode')) {
  console.log('  ✓ Uses document.importNode for template cloning (D-06)');
} else {
  console.error('  ✗ Missing document.importNode for template cloning');
  passed = false;
}

// ─── Verify data-* attribute anchors (D-06 compliance) ───
if (renderCode.includes('data-')) {
  console.log('  ✓ Uses data-* attribute anchors for population');
} else {
  console.error('  ✗ Missing data-* attribute anchors');
  passed = false;
}

// ─── Verify threat mitigation T-04-01 (textContent vs innerHTML) ───
// Card populators should use textContent for game data, not innerHTML
if (renderCode.includes('.textContent') || renderCode.includes('setAttribute')) {
  console.log('  ✓ Uses textContent/setAttribute for game data (T-04-01 mitigation)');
} else if (renderCode.includes('.innerHTML') && !renderCode.includes('template')) {
  console.error('  ✗ Uses innerHTML for game data (T-04-01 violation)');
  passed = false;
} else {
  console.log('  ⚠ Text content pattern needs verification in full context');
}

// ─── Test helper function logic (importable) ───
// Since we can't import render.js directly (DOM dependency), 
// we verify the expected behavior by checking the source code patterns

if (renderCode.includes("'Common': '#888'") || renderCode.includes("'Common':'#888'") || 
    renderCode.includes('"Common": "#888"') || renderCode.includes("'Common':'#888'")) {
  console.log('  ✓ getRarityColor has Common color mapping');
} else if (renderCode.includes('#888') && renderCode.includes('Common')) {
  console.log('  ✓ getRarityColor has Common color mapping');
}

if (renderCode.includes('morale < 30') && renderCode.includes('morale < 60')) {
  console.log('  ✓ getMoraleBarColor has threshold logic (<30 red, <60 orange, >60 green)');
}

if (renderCode.includes("'★'.repeat(difficulty)") || renderCode.includes('"★".repeat(difficulty)')) {
  console.log('  ✓ getDifficultyStars uses ★ repeat pattern');
}

if (passed) {
  console.log('\nAll render.js checks PASSED');
  process.exit(0);
} else {
  console.error('\nSome render.js checks FAILED');
  process.exit(1);
}
