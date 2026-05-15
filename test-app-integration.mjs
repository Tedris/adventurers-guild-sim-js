// Adventurers Guild Simulator — Test: app.js Integration
// Verifies that app.js wires together store, render, and event handlers

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let passed = true;

// ─── Check app.js imports from render barrel and store.js ───
const appPath = join(__dirname, 'src', 'app.js');
const appCode = readFileSync(appPath, 'utf-8');

if (appCode.includes("import") && (appCode.includes("render") || appCode.includes("renderView"))) {
  console.log('  ✓ app.js imports render module');
} else {
  console.error('  ✗ app.js missing render module import');
  passed = false;
}

// ─── Verify DOM-based render function is in render/tab.ts ───
const tabPath = join(__dirname, 'src', 'render', 'tab.ts');
const tabCode = readFileSync(tabPath, 'utf-8');

if (tabCode.includes("getElementById('game-content')")) {
  console.log('  ✓ tab.ts uses getElementById(\'game-content\')');
} else {
  console.error('  ✗ tab.ts missing game-content DOM reference');
  passed = false;
}

if (tabCode.includes("innerHTML = ''") || tabCode.includes("innerHTML=''")) {
  console.log('  ✓ tab.ts clears #game-content before rendering');
} else {
  console.error('  ✗ tab.ts does not clear #game-content');
  passed = false;
}

// ─── Verify app.js wires up store subscribe for rendering ───
if (appCode.includes("store.subscribe")) {
  console.log('  ✓ app.js subscribes store to render');
} else {
  console.error('  ✗ app.js missing store.subscribe');
  passed = false;
}

// ─── Verify tab navigation is wired up ───
if (appCode.includes("nav-tab") || appCode.includes("data-tab")) {
  console.log('  ✓ app.js has tab navigation wiring');
} else {
  console.error('  ✗ app.js missing tab navigation');
  passed = false;
}

// ─── Verify Next Day button exists and is wired ───
if (appCode.includes("TICK")) {
  console.log('  ✓ app.js dispatches TICK action for time advancement');
} else {
  console.error('  ✗ app.js missing TICK dispatch');
  passed = false;
}

// ─── Verify index.html has recruitment tab ───
const htmlPath = join(__dirname, 'index.html');
const htmlCode = readFileSync(htmlPath, 'utf-8');

if (htmlCode.includes('data-tab="recruitment"')) {
  console.log('  ✓ index.html has Recruitment tab');
} else {
  console.error('  ✗ index.html missing Recruitment tab');
  passed = false;
}

if (htmlCode.includes('data-tab="quests"')) {
  console.log('  ✓ index.html has Quest Board tab');
} else {
  console.error('  ✗ index.html missing Quest Board tab');
  passed = false;
}

// ─── Verify app.js references dist/app.js or app.js in index.html ───
if (htmlCode.includes('app.js')) {
  console.log('  ✓ index.html references app.js');
} else {
  console.error('  ✗ index.html missing app.js reference');
  passed = false;
}

if (passed) {
  console.log('\nAll app.js integration checks PASSED');
  process.exit(0);
} else {
  console.error('\nSome app.js integration checks FAILED');
  process.exit(1);
}
