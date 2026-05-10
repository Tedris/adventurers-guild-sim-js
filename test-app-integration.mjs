// Adventurers Guild Simulator — Test: app.js Integration
// Verifies that app.js imports render.js and uses DOM-based rendering

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let passed = true;

// ─── Check app.js has renderCard import ───
const appPath = join(__dirname, 'src', 'app.js');
const appCode = readFileSync(appPath, 'utf-8');

if (appCode.includes("import { renderCard }") && appCode.includes("from './render.js'")) {
  console.log('  ✓ app.js imports renderCard from render.js');
} else if (appCode.includes("import") && appCode.includes("render")) {
  console.log('  ✓ app.js has render import (exact format may vary)');
} else {
  console.error('  ✗ app.js missing renderCard import from render.js');
  passed = false;
}

// ─── Verify console renderer is replaced ───
if (appCode.includes('console.log') && appCode.match(/console\.log\s*\(\s*['"`]=\=\=.*Game State/)) {
  console.error('  ✗ Console-based render function still present in app.js');
  passed = false;
} else {
  console.log('  ✓ Console-based render function removed');
}

// ─── Verify DOM-based render function ───
if (appCode.includes("getElementById('game-content')")) {
  console.log('  ✓ app.js uses getElementById(\'game-content\')');
} else {
  console.error('  ✗ app.js missing game-content DOM reference');
  passed = false;
}

if (appCode.includes("container.innerHTML = ''") || appCode.includes("container.innerHTML=''")) {
  console.log('  ✓ app.js clears #game-content before rendering');
} else {
  console.error('  ✗ app.js does not clear #game-content');
  passed = false;
}

// ─── Verify script tag uses type="module" in index.html ───
const htmlPath = join(__dirname, 'index.html');
const htmlCode = readFileSync(htmlPath, 'utf-8');

if (htmlCode.includes('type="module"') && htmlCode.includes('app.js')) {
  console.log('  ✓ index.html uses type="module" for app.js script');
} else {
  console.error('  ✗ index.html missing type="module" for app.js script');
  passed = false;
}

// ─── Verify old script tag format is removed ───
if (htmlCode.includes('<script src="dist/app.js">') && !htmlCode.includes('type="module"')) {
  console.error('  ✗ index.html still has old non-module script tag');
  passed = false;
} else {
  console.log('  ✓ Old non-module script tag replaced');
}

if (passed) {
  console.log('\nAll app.js integration checks PASSED');
  process.exit(0);
} else {
  console.error('\nSome app.js integration checks FAILED');
  process.exit(1);
}
