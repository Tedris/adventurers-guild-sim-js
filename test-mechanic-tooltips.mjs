// Adventurers Guild Simulator — Mechanic Tooltip Tests
// Tests for fame, wage/morale, and evolution tooltip content functions.

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import * as fs from 'fs';
import * as path from 'path';

// Read tooltip.ts as text to inspect exports
const __dirname = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
const tooltipPath = path.join(__dirname, 'src', 'render', 'tooltip.ts');
const tooltipContent = fs.readFileSync(tooltipPath, 'utf-8');

describe('Mechanic Tooltip Exports', () => {
  it('computeFameMechanicTooltipContent is exported', () => {
    assert.ok(tooltipContent.includes('export function computeFameMechanicTooltipContent'),
      'tooltip.ts should export computeFameMechanicTooltipContent');
  });

  it('computeWageMechanicTooltipContent is exported', () => {
    assert.ok(tooltipContent.includes('export function computeWageMechanicTooltipContent'),
      'tooltip.ts should export computeWageMechanicTooltipContent');
  });

  it('computeEvolutionMechanicTooltipContent is exported', () => {
    assert.ok(tooltipContent.includes('export function computeEvolutionMechanicTooltipContent'),
      'tooltip.ts should export computeEvolutionMechanicTooltipContent');
  });

  it('showFameMechanicTooltip is exported', () => {
    assert.ok(tooltipContent.includes('export function showFameMechanicTooltip'),
      'tooltip.ts should export showFameMechanicTooltip');
  });

  it('showWageMechanicTooltip is exported', () => {
    assert.ok(tooltipContent.includes('export function showWageMechanicTooltip'),
      'tooltip.ts should export showWageMechanicTooltip');
  });

  it('showEvolutionMechanicTooltip is exported', () => {
    assert.ok(tooltipContent.includes('export function showEvolutionMechanicTooltip'),
      'tooltip.ts should export showEvolutionMechanicTooltip');
  });
});

describe('Mechanic Tooltip Accent Colors', () => {
  it('Fame tooltip uses Guild Gold (#FFD700)', () => {
    assert.ok(tooltipContent.includes("FAME_TOOLTIP_ACCENT = '#FFD700'"),
      'Fame tooltip accent color should be Guild Gold');
  });

  it('Wage tooltip uses Alert Red (#E74C3C)', () => {
    assert.ok(tooltipContent.includes("WAGE_TOOLTIP_ACCENT = '#E74C3C'"),
      'Wage tooltip accent color should be Alert Red');
  });

  it('Evolution tooltip uses Adventure Blue (#3498DB)', () => {
    assert.ok(tooltipContent.includes("EVOLUTION_TOOLTIP_ACCENT = '#3498DB'"),
      'Evolution tooltip accent color should be Adventure Blue');
  });
});

describe('Mechanic Tooltip CSS', () => {
  const cssPath = path.join(__dirname, 'src', 'styles.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('fame-tooltip CSS variant exists', () => {
    assert.ok(cssContent.includes('fame-tooltip'),
      'CSS should have fame-tooltip variant');
  });

  it('wage-tooltip CSS variant exists', () => {
    assert.ok(cssContent.includes('wage-tooltip'),
      'CSS should have wage-tooltip variant');
  });

  it('evolution-tooltip CSS variant exists', () => {
    assert.ok(cssContent.includes('evolution-tooltip'),
      'CSS should have evolution-tooltip variant');
  });

  it('evolution-counter card styling exists', () => {
    assert.ok(cssContent.includes('.evolution-counter'),
      'CSS should have .evolution-counter class');
  });
});

describe('Fame Tooltip Content Structure', () => {
  it('fame tooltip includes description text', () => {
    assert.ok(tooltipContent.includes('Your guild reputation bonus'),
      'Fame tooltip should include description explaining fame multiplier');
  });

  it('fame tooltip includes current fame level', () => {
    assert.ok(tooltipContent.includes('Current Fame'),
      'Fame tooltip should include current fame level section');
  });

  it('fame tooltip includes multiplier display', () => {
    assert.ok(tooltipContent.includes('×${fameMultiplier.toFixed(2)}'),
      'Fame tooltip should show current fame multiplier');
  });
});

describe('Wage Tooltip Content Structure', () => {
  it('wage tooltip includes description text', () => {
    assert.ok(tooltipContent.includes('Morale decay from underpaying adventurers'),
      'Wage tooltip should include description explaining wage pressure');
  });

  it('wage tooltip includes decay rate', () => {
    assert.ok(tooltipContent.includes('-${decayRate} per 10 ticks'),
      'Wage tooltip should show morale decay rate');
  });

  it('wage tooltip includes office upgrade recommendation', () => {
    assert.ok(tooltipContent.includes('Upgrade office to improve working conditions'),
      'Wage tooltip should recommend office upgrades');
  });
});

describe('Evolution Tooltip Content Structure', () => {
  it('evolution tooltip includes system explanation', () => {
    assert.ok(tooltipContent.includes('Class evolution triggered by equipping'),
      'Evolution tooltip should explain the evolution system');
  });

  it('evolution tooltip includes discovery progress', () => {
    assert.ok(tooltipContent.includes('Discovery Progress'),
      'Evolution tooltip should show discovery progress');
  });

  it('evolution tooltip includes discovered evolutions list', () => {
    assert.ok(tooltipContent.includes('Discovered'),
      'Evolution tooltip should list discovered evolutions');
  });

  it('evolution tooltip includes undiscovered evolutions', () => {
    assert.ok(tooltipContent.includes('Not Yet Discovered'),
      'Evolution tooltip should show undiscovered evolutions');
  });
});

describe('tab.ts Integration', () => {
  const tabPath = path.join(__dirname, 'src', 'render', 'tab.ts');
  const tabContent = fs.readFileSync(tabPath, 'utf-8');

  it('createFameCard accepts GameState parameter', () => {
    assert.ok(tabContent.includes('createFameCard(fameData: FameLevelResult, state?: GameState)'),
      'createFameCard should accept optional GameState parameter');
  });

  it('createPartyStatusCard wires wage tooltip listeners', () => {
    assert.ok(tabContent.includes('showWageMechanicTooltip'),
      'createPartyStatusCard should wire showWageMechanicTooltip');
  });

  it('renderDashboard creates evolution counter element', () => {
    assert.ok(tabContent.includes('evolutionCard'),
      'renderDashboard should create evolution counter element');
  });

  it('renderDashboard wires evolution tooltip listeners', () => {
    assert.ok(tabContent.includes('showEvolutionMechanicTooltip'),
      'renderDashboard should wire showEvolutionMechanicTooltip');
  });

  it('tab.ts imports CLASS_EVOLUTIONS', () => {
    assert.ok(tabContent.includes('CLASS_EVOLUTIONS'),
      'tab.ts should import CLASS_EVOLUTIONS');
  });

  it('tab.ts imports tooltip utilities', () => {
    assert.ok(tabContent.includes('isTooltipVisible'),
      'tab.ts should import isTooltipVisible');
    assert.ok(tabContent.includes('positionTooltip'),
      'tab.ts should import positionTooltip');
  });
});

describe('Tooltip Content Functions Are Pure', () => {
  it('computeFameMechanicTooltipContent is a pure function (no DOM manipulation)', () => {
    // The function body should not contain document.createElement, querySelector, etc.
    const fameStart = tooltipContent.indexOf('export function computeFameMechanicTooltipContent');
    const fameEnd = tooltipContent.indexOf('\nexport function', fameStart + 1);
    const fameBody = tooltipContent.slice(fameStart, fameEnd === -1 ? tooltipContent.length : fameEnd);
    assert.ok(!fameBody.includes('document.createElement'),
      'computeFameMechanicTooltipContent should not create DOM elements');
    assert.ok(!fameBody.includes('querySelector'),
      'computeFameMechanicTooltipContent should not query the DOM');
  });

  it('computeWageMechanicTooltipContent is a pure function', () => {
    const wageStart = tooltipContent.indexOf('export function computeWageMechanicTooltipContent');
    const wageEnd = tooltipContent.indexOf('\nexport function', wageStart + 1);
    const wageBody = tooltipContent.slice(wageStart, wageEnd === -1 ? tooltipContent.length : wageEnd);
    assert.ok(!wageBody.includes('document.createElement'),
      'computeWageMechanicTooltipContent should not create DOM elements');
  });

  it('computeEvolutionMechanicTooltipContent is a pure function', () => {
    const evoStart = tooltipContent.indexOf('export function computeEvolutionMechanicTooltipContent');
    const evoEnd = tooltipContent.indexOf('\nexport function', evoStart + 1);
    const evoBody = tooltipContent.slice(evoStart, evoEnd === -1 ? tooltipContent.length : evoEnd);
    assert.ok(!evoBody.includes('document.createElement'),
      'computeEvolutionMechanicTooltipContent should not create DOM elements');
  });
});

describe('Listener Tracking', () => {
  const tabPath = path.join(__dirname, 'src', 'render', 'tab.ts');
  const tabContent = fs.readFileSync(tabPath, 'utf-8');

  it('fame card uses trackEventListener for mouse listeners', () => {
    // Check that trackEventListener is called in createFameCard for fame tooltip
    const fameCardStart = tabContent.indexOf('export function createFameCard');
    const fameCardEnd = tabContent.indexOf('\nexport function', fameCardStart + 1);
    const fameCardBody = tabContent.slice(fameCardStart, fameCardEnd === -1 ? tabContent.length : fameCardEnd);
    assert.ok(fameCardBody.includes('trackEventListener(card, \'mouseenter\''),
      'Fame card should use trackEventListener for mouseenter');
    assert.ok(fameCardBody.includes('trackEventListener(card, \'mouseleave\''),
      'Fame card should use trackEventListener for mouseleave');
    assert.ok(fameCardBody.includes('trackEventListener(card, \'mousemove\''),
      'Fame card should use trackEventListener for mousemove');
  });

  it('party card uses trackEventListener for wage tooltip listeners', () => {
    const partyCardStart = tabContent.indexOf('export function createPartyStatusCard');
    const partyCardEnd = tabContent.indexOf('\nexport function', partyCardStart + 1);
    const partyCardBody = tabContent.slice(partyCardStart, partyCardEnd === -1 ? tabContent.length : partyCardEnd);
    assert.ok(partyCardBody.includes('trackEventListener(card, \'mouseenter\''),
      'Party card should use trackEventListener for mouseenter');
  });
});

describe('computeFameLevelResult helper', () => {
  it('computeFameLevelResult is exported', () => {
    assert.ok(tooltipContent.includes('export function computeFameLevelResult'),
      'tooltip.ts should export computeFameLevelResult');
  });

  it('computeFameLevelResult returns correct shape', () => {
    assert.ok(tooltipContent.includes('name: string'),
      'computeFameLevelResult should return name field');
    assert.ok(tooltipContent.includes('currentFame: number'),
      'computeFameLevelResult should return currentFame field');
    assert.ok(tooltipContent.includes('progress: number'),
      'computeFameLevelResult should return progress field');
    assert.ok(tooltipContent.includes('nextLevel: string | null'),
      'computeFameLevelResult should return nextLevel field');
    assert.ok(tooltipContent.includes('bonus: number'),
      'computeFameLevelResult should return bonus field');
  });
});
