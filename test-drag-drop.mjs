// Adventurers Guild Simulator — Test: Drag-and-Drop Party Building (Story 6.3)
// Verifies drag-and-drop handlers, drop zones, and CSS styling for party building.

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

// ─── Check drag-and-drop constants and helpers exist ───
console.log('\n--- Drag-and-Drop Constants (tab.ts) ---');
const tabCode = readFileSync(join(__dirname, 'src', 'render', 'tab.ts'), 'utf-8');
checkContent('tab.ts', join(__dirname, 'src', 'render', 'tab.ts'), [
  'application/adventurer-id',
  'attachDragSourceHandlers',
  'attachDropTargetHandlers',
  'createDragGhost',
  'cleanupDragGhost',
  'clearDraggingClasses',
  'DND_ADVENTURER_ID_TYPE',
], 'drag-and-drop constants and helpers');

// ─── Check standard roster has drag source ───
console.log('\n--- Standard Roster Drag Source ---');
checkContent('tab.ts', join(__dirname, 'src', 'render', 'tab.ts'), [
  'attachDragSourceHandlers(card, adventurer.id',
  'draggable',
  'dragstart',
  'dragend',
], 'drag source in renderRosterStandard');

// ─── Check virtual roster has drag source ───
console.log('\n--- Virtual Roster Drag Source ---');
checkContent('tab.ts', join(__dirname, 'src', 'render', 'tab.ts'), [
  'attachDragSourceHandlers(card, adventurer.id',
  'virtual-card',
], 'drag source in renderRosterVirtual');

// ─── Check virtual roster cleanup on leave ───
console.log('\n--- Virtual Roster Cleanup ---');
checkContent('tab.ts', join(__dirname, 'src', 'render', 'tab.ts'), [
  'element.classList.remove(\'dragging\')',
  'onCardLeave',
], 'dragging class cleanup on card leave');

// ─── Check party panel has drop targets ───
console.log('\n--- Party Panel Drop Targets ---');
checkContent('tab.ts', join(__dirname, 'src', 'render', 'tab.ts'), [
  'attachDropTargetHandlers(memberItem, \'remove\'',
  'data-party-drop',
], 'drop targets in createPartyOverviewPanel');

// ─── Check backdrop drop zone for removing adventurers ───
console.log('\n--- Backdrop Drop Zone ---');
checkContent('tab.ts', join(__dirname, 'src', 'render', 'tab.ts'), [
  'dropZoneHandler',
  'dragOverBackdropHandler',
  'dragLeaveBackdropHandler',
  'backdrop, \'dragover\'',
  'backdrop, \'drop\'',
  'ASSIGN_PARTY',
], 'backdrop drop zone in renderPartyOverviewPanel');

// ─── Check CSS has drag-and-drop styles ───
console.log('\n--- Drag-and-Drop CSS (styles.css) ---');
const cssCode = readFileSync(join(__dirname, 'src', 'styles.css'), 'utf-8');
checkContent('styles.css', join(__dirname, 'src', 'styles.css'), [
  '.drag-ghost',
  '.roster-card.dragging',
  '.party-member-item.drag-over',
  '.party-over-backdrop.drag-over',
  'cursor: grab',
  'cursor: grabbing',
  'z-index: 10000',
], 'drag-and-drop CSS classes');

// ─── Verify drag data MIME type consistency ───
console.log('\n--- MIME Type Consistency ---');
if (tabCode.includes('DND_ADVENTURER_ID_TYPE') &&
    tabCode.includes('setData(DND_ADVENTURER_ID_TYPE') &&
    tabCode.includes('getData(DND_ADVENTURER_ID_TYPE')) {
  console.log('  ✓ MIME type consistent (DND_ADVENTURER_ID_TYPE constant)');
} else {
  console.error('  ✗ MIME type inconsistent or missing');
  passed = false;
}

// ─── Verify ASSIGN_PARTY dispatch on drop ───
console.log('\n--- ASSIGN_PARTY Integration ---');
if (tabCode.includes('type: \'ASSIGN_PARTY\'')) {
  console.log('  ✓ ASSIGN_PARTY action dispatched on drop');
} else {
  console.error('  ✗ ASSIGN_PARTY action not found');
  passed = false;
}

// ─── Verify no "any" types introduced in drag-and-drop code ───
console.log('\n--- TypeScript Compliance (DnD) ---');
const dndSection = tabCode.split('// ─── Drag')[1]?.split('// ─── View Types')[0] || '';
if (!dndSection.includes(': any')) {
  console.log('  ✓ No "any" types in drag-and-drop code');
} else {
  console.error('  ✗ Found "any" types in drag-and-drop code');
  passed = false;
}

// ─── Verify trackEventListener used for all DnD handlers ───
console.log('\n--- Listener Tracking (DnD) ---');
if (dndSection.includes('trackEventListener(card, \'dragstart\'') &&
    dndSection.includes('trackEventListener(card, \'dragend\'') &&
    dndSection.includes('trackEventListener(memberItem, \'dragover\'') &&
    dndSection.includes('trackEventListener(memberItem, \'drop\'')) {
  console.log('  ✓ All drag-and-drop handlers tracked');
} else {
  console.error('  ✗ Some drag-and-drop handlers not tracked');
  passed = false;
}

// ─── Verify party size constraint in drop handler ───
console.log('\n--- Party Size Constraint ---');
if (dndSection.includes('currentParty.length < 3') ||
    dndSection.includes('MAX_PARTY_SIZE')) {
  console.log('  ✓ Party size constraint enforced in drop handler');
} else {
  console.error('  ✗ Party size constraint not found in drop handler');
  passed = false;
}

// ─── Verify detachAllListeners called in closePartyOverviewPanel ───
console.log('\n--- Cleanup in Panel Close ---');
if (tabCode.includes('closePartyOverviewPanel') &&
    tabCode.includes('detachAllListeners')) {
  console.log('  ✓ detachAllListeners used in closePartyOverviewPanel');
} else {
  console.error('  ✗ Cleanup not found in closePartyOverviewPanel');
  passed = false;
}

if (passed) {
  console.log('\n✅ All drag-and-drop (Story 6.3) checks PASSED');
  process.exit(0);
} else {
  console.error('\n❌ Some drag-and-drop (Story 6.3) checks FAILED');
  process.exit(1);
}
