// Adventurers Guild Simulator — Test Runner
// ============================================
// Runs all tests using esbuild to transpile TypeScript.

import { build } from 'esbuild';
import { rmSync, readFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd();

// List of test files
const testFiles = [
  'src/entities.test.js',
  'src/store.test.js',
  'src/save-load.test.js',
  'src/data-integrity.test.js',
  'src/personality-traits.test.js',
  'src/quest-templates.test.js',
];

// List of Node.js test scripts (run separately, not bundled)
const scriptTests = [
  'test-listener-cleanup.mjs',
  'test-render.mjs',
];

let failed = false;

for (const testFile of testFiles) {
  const fullPath = join(cwd, testFile);

  // Check if test file exists
  try {
    readFileSync(fullPath);
  } catch {
    console.log(`⊘ ${testFile} (skipped — not found)`);
    continue;
  }

  // Create bundle
  const bundleDir = join(cwd, 'dist', 'test-bundle');
  const outFile = join(bundleDir, basename(testFile, '.js') + '.mjs');

  try {
    await build({
      entryPoints: [fullPath],
      bundle: true,
      format: 'esm',
      platform: 'node',
      outfile: outFile,
      external: ['wisp-server-node'],
    });

    const testOutput = execSync(`node "${outFile}"`, {
      cwd,
      encoding: 'utf-8',
      timeout: 30000,
    });

    console.log(`\n--- ${testFile} ---`);
    console.log(testOutput);

    // Check for failures
    if (testOutput.includes('✗')) {
      failed = true;
    }
  } catch (e) {
    console.log(`\n✗ ${testFile} FAILED`);
    console.log(e.stdout || e.stderr || e.message);
    failed = true;
    continue;
  }

  // Clean up
  try { rmSync(bundleDir, { recursive: true }); } catch {}
}

// Run Node.js test scripts (not bundled, run directly)
for (const scriptTest of scriptTests) {
  const fullPath = join(cwd, scriptTest);
  try {
    readFileSync(fullPath);
  } catch {
    console.log(`⊘ ${scriptTest} (skipped — not found)`);
    continue;
  }

  try {
    const testOutput = execSync(`node "${fullPath}"`, {
      cwd,
      encoding: 'utf-8',
      timeout: 30000,
    });
    console.log(`\n--- ${scriptTest} ---`);
    console.log(testOutput);

    if (testOutput.includes('✗')) {
      failed = true;
    }
  } catch (e) {
    console.log(`\n✗ ${scriptTest} FAILED`);
    console.log(e.stdout || e.stderr || e.message);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
console.log('\n✓ All tests passed');
