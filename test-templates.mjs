// Adventurers Guild Simulator — Test: HTML Card Templates
// Verifies that all card template elements exist in index.html
// This test runs via Node.js to check file content before DOM is available.

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const html = readFileSync(join(__dirname, 'index.html'), 'utf-8');

const REQUIRED_TEMPLATES = [
  'adventurer-card-template',
  'quest-card-template',
  'event-card-template',
  'modal-overlay-template',
];

let passed = true;

for (const templateId of REQUIRED_TEMPLATES) {
  const expected = `<template id="${templateId}"`;
  if (html.includes(expected)) {
    console.log(`  ✓ ${templateId} found`);
  } else {
    console.error(`  ✗ ${templateId} NOT found`);
    passed = false;
  }
}

// Check that comment placeholders are removed
if (html.includes('<!-- adventurer-card-template -->') || html.includes('<!-- quest-card-template -->')) {
  console.error('  ✗ Comment placeholders still present');
  passed = false;
} else {
  console.log('  ✓ Comment placeholders removed');
}

// Check that modal overlay template has required structure
if (html.includes('modal-backdrop') && html.includes('modal-content') && html.includes('modal-message')) {
  console.log('  ✓ Modal overlay structure present');
} else {
  console.error('  ✗ Modal overlay structure incomplete');
  passed = false;
}

if (passed) {
  console.log('\nAll template checks PASSED');
  process.exit(0);
} else {
  console.error('\nSome template checks FAILED');
  process.exit(1);
}
