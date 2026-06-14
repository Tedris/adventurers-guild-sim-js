---
stepsCompleted: []
inputDocuments:
  - path: '_bmad-output/planning-artifacts/game-architecture.md'
    type: architecture
    summary: 'Game architecture — vanilla TypeScript/HTML/CSS, pub/sub store with pure reducer, ECS-Light entity pattern, IndexedDB persistence, 14 completed dev phases'
  - path: '_bmad-output/planning-artifacts/gdds/gdd-adventurers-guild-sim-js-2026-05-30/gdd.md'
    type: gdd
    summary: 'Complete GDD for Adventures in Management Phase 1: The Guild — idle/incremental simulation'
  - path: '_bmad-output/planning-artifacts/prds/prd-adventurers-guild-sim-js-2026-05-30/prd.md'
    type: prd
    summary: 'Product requirements with 36 numbered FRs, scope boundaries, success metrics'
  - path: '_bmad-output/implementation-artifacts/brownfield-codebase-audit-2026-05-30.md'
    type: brownfield-audit
    summary: 'Brownfield codebase audit — 3 shipped milestones, 14 completed phases, all foundational systems implemented'
  - path: '.planning/ROADMAP.md'
    type: roadmap
    summary: 'v1.3 UI/UX Improvements roadmap — Phases 15-20, 14 requirements'
  - path: '.planning/REQUIREMENTS.md'
    type: requirements
    summary: 'v1.3 requirements — 14 REQs across 5 categories'
  - path: '.planning/PROJECT.md'
    type: project-context
    summary: 'Project context — v1.0/v1.1/v1.2 shipped, v1.3 planning, 272+ tests, ~12k LOC'
project_name: 'adventurers-guild-sim-js'
user_name: 'Efvl'
date: '2026-05-30'
---

# adventurers-guild-sim-js - Epic Breakdown (Brownfield Restructure) ⭐ ACTIVE PLAN

> **This is the active sprint tracking document.** All story creation, sprint planning, and implementation tracking use this file.
>
> **Superseded:** `_bmad-output/planning-artifacts/epics.md` (greenfield, build-from-scratch — retained as reference only)

## Overview

This document provides the complete epic and story breakdown for **adventurers-guild-sim-js**, a **brownfield project** with 3 shipped milestones (v1.0, v1.1, v1.2) spanning 14 completed phases. All foundational game systems described in the original GDD/PRD are **already implemented**.

The epics below reflect the **actual current state**: maintenance, refactoring, and v1.3 UI/UX improvements on top of an existing, tested codebase.

## Current Project State

| Metric | Value |
|--------|-------|
| Shipped milestones | 3 (v1.0, v1.1, v1.2) |
| Completed phases | 14 (Phases 1-14) |
| Total commits | 158 |
| Lines of code | ~12,000 |
| TypeScript modules | 15+ |
| Passing tests | 294 |
| Current milestone | v1.3 UI/UX Improvements |
| Current phase | 15 (planning) |

### What's Already Built (Brownfield)

All systems described in the original GDD/PRD epics (11 epics, 37 stories) are **100% implemented**:

- ✅ Core gameplay loop (click, upgrade, quest auto-completion, visual feedback)
- ✅ Adventurer system (generation, recruitment, profile, rank progression)
- ✅ Equipment & all 12 class evolution paths
- ✅ Party management & quest system (fame-gated, confidence scoring)
- ✅ Fame system (5 tiers, milestone arrivals, recruitment bonuses)
- ✅ Personality & morale (35 traits, decay, departures)
- ✅ Event system (18 templates across 3 categories, cooldown, weighted selection)
- ✅ Office visual progression (5 stages, level calculation)
- ✅ Persistence (IndexedDB, auto-save, structured clone, DOM virtualization)
- ✅ Legacy perks (8 templates, stat bonuses)

### What Still Needs Work

From the brownfield audit and v1.3 roadmap:

1. **TypeScript migration** of 3 remaining `.js` files (`store.js`, `app.js`, `save-load.js`)
2. **Test coverage** — `quest-templates.test.js` not wired into test runner
3. **Known bugs** — duplicate evolution handler, duplicated quest success rate calc
4. **Tech debt** — 663-line reducer, global state access pattern
5. **v1.3 UI/UX Improvements** — 14 requirements across Phases 15-20
6. **Prestige reset** — teasers exist, full reset deferred to future milestone

---

## Requirements Inventory

### v1.3 Requirements (from `.planning/REQUIREMENTS.md`)

**Navigation (NAV-01, NAV-02):**
- NAV-01: User can switch tabs with smooth transitions and clear active state
- NAV-02: Tab order is logical (Adventurers → Party → Quests → Economy → Events)

**Tooltips & Info Display (TOOLTIP-01, TOOLTIP-02, TOOLTIP-03):**
- TOOLTIP-01: Hovering adventurer cards shows full stat breakdowns
- TOOLTIP-02: Hovering quest cards shows requirements (aptitude thresholds, recommended party)
- TOOLTIP-03: Hovering UI elements shows contextual help for game mechanics

**Party Management (PARTY-01, PARTY-02, PARTY-03, PARTY-04):**
- PARTY-01: Party overview panel shows at-a-glance party strength
- PARTY-02: Party synergy display (bonus indicators when compatible classes/traits grouped)
- PARTY-03: User can drag-and-drop adventurers into party slots
- PARTY-04: Party slots validate composition (2-3 adventurers, no duplicates)

**Interaction Quality (INTERACT-01, INTERACT-02, INTERACT-03):**
- INTERACT-01: All clickable elements have minimum 44x44px touch targets
- INTERACT-02: Button feedback (hover/active states) on all interactive elements
- INTERACT-03: Selection highlights are visible and consistent

**Stats & Abilities (STATS-01, STATS-02):**
- STATS-01: Ability bonuses show source breakdown (base + trait + origin + equipment)
- STATS-02: Clicking a stat shows which adventurers contribute it

### Existing Bugs & Tech Debt (from brownfield audit)

- **BUG-01:** Duplicate event listener on evolution button (`tab.ts:535` duplicates `card.ts:209`)
- **BUG-02:** Quest success rate calculation duplicated between `party.ts` and `store.js`
- **DEBT-01:** Store reducer — 663-line god function, 18 action types in single switch
- **DEBT-02:** Inline store access pattern — render functions access `window.__guildStore` directly
- **DEBT-03:** Mixed TypeScript/JavaScript — 3 core files remain `.js` without type safety
- **TEST-01:** `quest-templates.test.js` exists but not wired into `test-runner.mjs`

### Out of Scope for v1.3

- Prestige reset system (teasers only, deferred to future milestone)
- Economy calibration (BAL-01) — separate balancing concern
- Difficulty curve tuning (BAL-02) — separate balancing concern
- New game content (quests, traits, events) — v1.2 already expanded
- Mobile app / responsive redesign — existing responsive layout acceptable
- Sound / music — not in v1.3 scope

---

## Epic List

### Epic 1: Core Gameplay Foundation (DONE — Greenfield sprint)

**User outcome:** Players can launch the game, click for gold, purchase upgrades, and see quests progress automatically.

**Stories:** 1.1 through 1.4 (all done)
**Notes:** This was the first implementation sprint — all foundational game systems are built.

---

### Epic 2: Bug Fixes & Test Coverage (DONE)

**User outcome:** All known bugs resolved, test coverage complete.

**Stories:** 2.1 through 2.3 (all done)

---

### Epic 3: TypeScript Migration

**User outcome:** All core application logic (`store.js`, `app.js`, `save-load.js`, `click-effects.js`, `feedback.js`, `ticker.js`) is migrated to TypeScript with full type safety, eliminating the mixed `.js`/`.ts` codebase.

**FRs covered:** N/A (maintenance/refactoring)

**Notes:** Low-risk mechanical migration. Each file has test coverage. Migrate one file at a time, verifying all tests pass after each migration. This is a prerequisite for full type safety across the codebase. NOTE: Original spec only covered 3 files — updated to cover all 6 remaining `.js` files in src/.

---

### Epic 4: Tech Debt Reduction

**User outcome:** The store reducer is refactored into extractable action handlers, eliminating the 663-line god function. Render functions no longer access `window.__guildStore` directly, improving testability and reducing coupling.

**FRs covered:** N/A (maintenance)

**Notes:** This epic has higher risk than Epic 3 (structural refactoring vs mechanical migration). Should be done after TypeScript migration (Epic 3) so types provide a safety net. Should be done before or in parallel with v1.3 features (so new features benefit from cleaner architecture).

---

### Epic 5: Navigation & Tooltips (v1.3 Phases 15-16)

**User outcome:** Players experience smooth, animated tab transitions with clear active state indicators. Hovering over adventurer cards and quest cards reveals detailed breakdowns. Contextual tooltips explain game mechanics.

**FRs covered:** NAV-01, NAV-02, TOOLTIP-01, TOOLTIP-02, TOOLTIP-03

**Notes:** Phase 15 (Navigation) must complete before Phase 16 (Tooltips) because tooltips rely on the restructured tab system. Both are UI-layer changes to `src/render/tab.ts`.

---

### Epic 6: Party Management (v1.3 Phases 17-18)

**User outcome:** Players see a party overview panel showing combined stats and synergy bonuses. They can build parties via drag-and-drop with composition validation.

**FRs covered:** PARTY-01, PARTY-02, PARTY-03, PARTY-04

**Notes:** Phase 17 (Party Overview Panel) provides the display layer. Phase 18 (Drag-and-Drop) adds the interaction layer. Party overview panel should exist before drag-and-drop (players need to understand what they're looking at before manipulating).

---

### Epic 7: Interaction Quality (v1.3 Phases 19-20)

**User outcome:** All interactive elements meet modern usability standards with proper touch targets, visual feedback, and consistent selection highlights. Players can explore how stat bonuses are calculated by clicking on party stats to see source attribution.

**FRs covered:** INTERACT-01, INTERACT-02, INTERACT-03, STATS-01, STATS-02

**Notes:** Phase 19 (Interaction Quality) depends only on Phase 15 (Navigation) and can run in parallel with Phases 17-18 (Epic 6). Phase 20 (Stats Breakdown) depends on Phase 17 (Party Overview) because it builds on the party panel.

---

## Epic 3: TypeScript Migration

### Story 3.1: Migrate store.js to TypeScript

As a developer,
I can have `store.js` as `store.ts` with full type safety,
So that the reducer and action types are enforced by the TypeScript compiler.

**Acceptance Criteria:**

**Given** `store.js` exists with 663 lines and 18 action types
**When** the file is renamed to `store.ts` and type annotations are added
**Then** the `GameState` interface from `src/types.ts` is imported and used
**And** action types are defined as discriminated unions with proper payloads
**And** the reducer function returns `GameState` type
**And** `store.dispatch()` accepts typed `AppAction` type
**And** all existing subscribers (`src/app.js` → `src/app.ts` after migration) compile without errors

**Given** all existing tests reference `store.ts` instead of `store.js`
**When** `npm run test` is executed
**Then** all 54 existing store tests pass without modification
**And** TypeScript compilation succeeds with no errors (zero `any` types)

**Given** `src/types.ts` defines `ActionType` as string literal union
**When** `store.ts` is compiled
**Then** all action type strings are covered by the discriminated union
**And** the TypeScript compiler rejects unknown action types at compile time

**Given** `esbuild.config.js` entry point references `src/app.js`
**When** `app.js` is migrated to `app.ts` (Story 1.2)
**Then** the import path resolves to `./store.js` (esbuild handles `.js` → `.ts` resolution)

### Story 3.2: Migrate app.js to TypeScript

As a developer,
I can have `app.js` as `app.ts` with full type safety,
So that the application entry point, DOM wiring, and game loop are fully typed.

**Acceptance Criteria:**

**Given** `app.js` exists with 265 lines (entry point, DOM wiring, game loop)
**When** the file is renamed to `app.ts` and type annotations are added
**Then** `GuildStore` global type from `src/globals.d.ts` is used for store access
**And** all DOM element references use `HTMLElement` or specific element types
**And** event handler callbacks are properly typed
**And** the `GameLoop` tick interval is typed
**And** all imports from `./store.ts` and `./render/index.ts` resolve correctly

**Given** `src/globals.d.ts` declares `window.__guildStore: GuildStore`
**When** `app.ts` accesses the store
**Then** TypeScript recognizes `window.__guildStore` without `any` type errors
**And** the store's methods (`dispatch`, `subscribe`, `getState`) are correctly typed

**Given** all existing tests
**When** `npm run test` is executed
**Then** all integration tests pass (test-runner.mjs tests `store.test.js` separately)
**And** TypeScript compilation succeeds with zero errors
**And** `npm run dev` builds and serves without errors

### Story 3.3: Migrate save-load.js to TypeScript

As a developer,
I can have `save-load.js` as `save-load.ts` with full type safety,
So that the persistence layer is type-checked with proper IndexedDB types.

**Acceptance Criteria:**

**Given** `save-load.js` exists with 131 lines (IndexedDB wrapper, auto-save)
**When** the file is renamed to `save-load.ts` and type annotations are added
**Then** `IndexedDB` API types from lib.dom.d.ts are used
**And** `GameState` type is imported from `./types` for `saveState` payload
**And** `loadState` returns `GameState | null`
**And** the `enableAutoSave` subscriber callback is typed
**And** `STORE_VERSION` constant is typed as `number`

**Given** the existing test suite (`save-load.test.js`) with 10 tests
**When** `npm run test` is executed
**Then** all 10 tests pass without modification
**And** TypeScript compilation succeeds
**And** no `any` types are introduced

### Story 3.4: Update esbuild config and verify full build

As a developer,
I can build the full project with all `.ts` files,
So that the production bundle is generated from a fully typed TypeScript codebase.

**Acceptance Criteria:**

**Given** `store.ts`, `app.ts`, `save-load.ts` are all compiled
**When** `npm run build` is executed
**Then** `dist/app.js` and `dist/styles.css` are generated without errors
**And** sourcemaps are produced (per `esbuild.config.js`)
**And** the bundled output loads and runs in a browser without errors

**Given** `tsconfig.json` has `noEmit: true`
**When** the build runs
**Then** TypeScript performs type-checking without producing emit files
**And** esbuild bundles the transpiled output (esbuild handles TS transpilation)

**Given** all `.js` source files have been migrated
**When** the project root is scanned
**Then** no `.js` source files remain in `src/` (only test files and `.mjs` runner)
**And** all imports reference `.js` paths (esbuild resolution convention)

---

## Epic 2: Bug Fixes & Test Coverage (DONE)

### Story 2.1: Fix duplicate evolution button event listener

As a developer,
I can have the evolution button trigger only once per click,
So that the evolution effect is not applied twice when clicked from the virtual roster list.

**Acceptance Criteria:**

**Given** the evolution button is rendered in `src/render/card.ts:209-216`
**When** a player clicks the evolution button from the virtual roster list
**Then** the evolution effect is triggered exactly once
**And** the duplicate handler in `src/render/tab.ts:535-553` is removed
**And** all existing evolution tests pass (including `evolveClass` and `evolveAdventurer` tests in `entities.test.js`)

**Given** the evolution button is also available from the adventurer profile panel
**When** a player clicks the evolution button from the profile
**Then** the evolution effect is triggered exactly once
**And** no regression in the profile panel evolution display occurs

**Given** the fix is applied
**When** `npm run test` is executed
**Then** all 198 entity tests pass
**And** all 54 store tests pass

### Story 2.2: Consolidate quest success rate calculation

As a developer,
I can have a single source of truth for quest success rate calculation,
So that the rate is not calculated differently in `party.ts` vs `store.js`.

**Acceptance Criteria:**

**Given** `calculateQuestSuccessRate` exists in `src/entities/party.ts:162-188`
**When** the inline implementations in `src/store.js:246-252` and `src/store.js:422-431` are replaced with calls to `calculateQuestSuccessRate`
**Then** quest success rate is calculated consistently across all code paths
**And** the COMPLETE_QUEST reducer uses `calculateQuestOutcome` from `party.ts`
**And** the TICK reducer uses `calculateQuestSuccessRate` from `party.ts`

**Given** the consolidated code
**When** quest success is calculated for a party with synergy bonuses
**Then** the result matches the pre-fix behavior (no regression)
**And** the `calculateQuestOutcome` function is used (not inline logic)

**Given** existing quest tests
**When** `npm run test` is executed
**Then** all tests pass including `calculateQuestSuccessRate` and `calculateQuestOutcome` tests

### Story 2.3: Wire quest-templates.test.js into test runner

As a developer,
I can have `quest-templates.test.js` run as part of the full test suite,
So that quest template changes are caught by the test runner.

**Acceptance Criteria:**

**Given** `src/quest-templates.test.js` exists with quest template tests
**When** `test-runner.mjs` is updated to include this file
**Then** the quest template tests run alongside all other test suites
**And** all quest template tests pass (they already exist and should be passing)

**Given** the test runner is updated
**When** `npm run test` is executed
**Then** the output includes quest-templates test results
**And** the total test count increases by the number of quest-templates tests

---

## Epic 4: Tech Debt Reduction

### Story 4.1: Extract store action handlers from god reducer

As a developer,
I can have each store action type handled by its own function instead of a 663-line switch statement,
So that the reducer is navigable and adding new action types is low-risk.

**Acceptance Criteria:**

**Given** `store.js` has a single 663-line reducer with 18 action types in a switch statement
**When** each action handler is extracted (e.g., `handleHire`, `handleSendQuest`, `handleCompleteQuest`, etc.)
**Then** the main reducer becomes a thin dispatch function: `switch(action.type) { case 'HIRE': return handleHire(state, action.payload); ... }`
**And** each handler is a pure function receiving `(state, payload)` and returning new state
**And** the TypeScript types for each handler match the expected action payload type
**And** all existing tests pass — the behavior is unchanged, only the internal structure changes

**Given** the extracted handlers
**When** a new action type is needed (e.g., a new v1.3 action)
**Then** adding it requires only: 1) a new handler function, 2) one case in the switch, 3. a type in the discriminated union
**And** the risk of accidentally modifying unrelated state is eliminated (each handler owns its state slice)

**Given** `src/types.ts` defines the action discriminated union
**When** a new handler is added without a corresponding type
**Then** the TypeScript compiler produces an error (exhaustiveness check)

### Story 4.2: Replace global store access in render functions

As a developer,
I can have render functions receive state as a parameter instead of accessing `window.__guildStore` directly,
So that render functions are testable in isolation and the coupling between render and state layers is reduced.

**Acceptance Criteria:**

**Given** render functions in `card.ts`, `tab.ts`, and `event-display.ts` access `window.__guildStore` directly
**When** each render function is refactored to accept `state: GameState` (or a derived subset) as a parameter
**Then** all render calls in `tab.ts:80` (the full re-render) pass `store.getState()` as the first argument
**And** all render calls in `app.js` (via the store subscription callback) pass `state`
**And** the `window.__guildStore` access pattern is eliminated from all render functions
**And** all existing visual output is unchanged — the UI renders identically

**Given** the refactored render functions
**When** they are called from test code (unit test)
**Then** they can be invoked with a mock `state` object without needing the global `window.__guildStore`
**And** the tests can verify specific DOM output for specific state inputs

---

## Epic 5: Navigation & Tooltips (v1.3 Phases 15-16)

Players can navigate between tabs with smooth animations and see detailed information on hover over cards and UI elements.

**FRs covered:** NAV-01, NAV-02, TOOLTIP-01, TOOLTIP-02, TOOLTIP-03
**UX-DRs:** UX-DR-7 (dashboard sidebar), UX-DR-10 (navigation patterns), UX-DR-8 (button hierarchy)

### Story 5.1: Rebuild tab switching with smooth transitions (Phase 15)

As a player navigating the game,
I can switch between tabs with smooth WAAPI animations and clear active state indicators,
So that navigation feels polished and I always know which view I'm on.

**Acceptance Criteria:**

**Given** the player is on any tab view
**When** the player clicks a different tab in the navigation bar
**Then** the current view animates out using WAAPI (`tab.ts` slide transition)
**And** the new view animates in with a matching slide direction
**And** the active tab in the navigation bar has a clearly visible indicator (color change or underline, per UX-DR-8)

**Given** the tab order is Adventurers → Party → Quests → Economy → Events
**When** the player views the navigation bar
**Then** the tabs appear in this order (NAV-02 satisfied)
**And** keyboard tab-order follows the same sequence

**Given** the player is using reduced motion settings
**When** a tab switch occurs
**Then** the WAAPI transition is skipped (instant switch)
**And** the active tab indicator still updates

**Given** the restructured tab system
**When** `npm run test` is executed
**Then** all existing integration tests pass (the test-app-integration checks tab rendering)

### Story 5.2: Implement rich adventurer card tooltips (Phase 16 — TOOLTIP-01)

As a player examining my roster,
I can hover over an adventurer card to see their full stat breakdown,
So that I can evaluate party composition without opening the full profile.

**Acceptance Criteria:**

**Given** the player hovers over an adventurer card in the roster
**When** the tooltip appears
**Then** it displays: base aptitudes, trait bonuses (with trait names), origin bonuses, equipment bonuses
**And** the tooltip shows how each bonus is calculated (e.g., "STR: 5 base + 2 Brave + 1 Sword class")
**And** the tooltip follows UX-DR-9 (floating text style) and UX-DR-12 (color system)
**And** the tooltip does not overlap the card in a way that blocks interaction

**Given** the adventurer has no equipped equipment
**When** the tooltip is displayed
**Then** the equipment bonus section is omitted (not shown as "+0")

**Given** the player moves the mouse away from the card
**When** the tooltip is dismissed
**Then** it disappears smoothly (CSS transition)

### Story 5.3: Implement quest card tooltips (Phase 16 — TOOLTIP-02)

As a player looking at the quest board,
I can hover over a quest card to see aptitude thresholds and recommended party composition,
So that I can plan my party before dispatching.

**Acceptance Criteria:**

**Given** the player hovers over a quest card on the quest board
**When** the tooltip appears
**Then** it displays: required stat thresholds (STR/DEX/INT/VIT/LCK), recommended classes, party size needed
**And** it shows the gold/XP reward and difficulty stars
**And** it indicates whether the player's current roster can satisfy the requirements (e.g., "Adventurers with STR ≥ 8 available: 3")

**Given** the quest has preferred classes
**When** the tooltip is displayed
**Then** it shows which of the player's adventurers match the preferred classes
**And** the match count is accurate based on current roster

### Story 5.4: Implement contextual mechanic tooltips (Phase 16 — TOOLTIP-03)

As a player learning or returning to the game,
I can hover over any UI element to see contextual help explaining what it does,
So that I understand game mechanics without leaving the game.

**Acceptance Criteria:**

**Given** the player hovers over the fame multiplier display in the dashboard
**When** the tooltip appears
**Then** it explains: "Your guild reputation bonus. Increases recruitment quality and unlocks better quests."
**And** it shows the current fame level and what the next level provides

**Given** the player hovers over the wage pressure indicator
**When** the tooltip appears
**Then** it explains: "Morale decay from underpaying adventurers. Upgrade your office to improve conditions."
**And** it shows the current morale decay rate

**Given** the player hovers over the evolution counter (X/12 found)
**When** the tooltip appears
**Then** it explains the class evolution system and what equipment combinations are needed
**And** it lists any evolutions the player has already discovered

---

## Epic 6: Party Management (v1.3 Phases 17-18)

Players can see at-a-glance party strength and synergy, and build parties via drag-and-drop.

**FRs covered:** PARTY-01, PARTY-02, PARTY-03, PARTY-04
**UX-DRs:** UX-DR-4 (party formation panel), UX-DR-1 (adventurer card)

### Story 6.1: Build party overview panel (Phase 17 — PARTY-01)

As a player forming a party,
I can see an at-a-glance panel showing combined party stats and aptitude summary,
So that I can quickly assess whether my party is strong enough for a quest.

**Acceptance Criteria:**

**Given** the player opens the party formation panel (from a quest card or the quests tab)
**When** the party overview panel is displayed
**Then** it shows the combined stats of all selected adventurers (sum of STR/DEX/INT/VIT/LCK)
**And** it shows the calculated aptitude summary (how well the party matches quest requirements)
**And** the panel updates in real-time as adventurers are added or removed from the party
**And** the overview panel is positioned prominently in the party formation UI (UX-DR-4)

**Given** the party has 0 adventurers selected
**When** the overview panel is displayed
**Then** it shows a placeholder message: "Select adventurers to view party stats"
**And** no numerical values are displayed

### Story 6.2: Add party synergy display (Phase 17 — PARTY-02)

As a player forming a party,
I can see synergy bonus indicators when compatible classes and traits are grouped,
So that I can optimize my party composition for better quest success.

**Acceptance Criteria:**

**Given** the player has selected adventurers with class diversity (e.g., Sword, Bow, Staff)
**When** the party overview panel is displayed
**Then** a synergy bonus indicator shows the diversity bonus (from `calculateClassDiversity`)
**And** the indicator uses a green color for positive synergy, orange for neutral, red for redundant (same class)
**And** the synergy bonus is included in the confidence score calculation

**Given** the player has selected adventurers with complementary traits (e.g., Courageous + Scholarly)
**When** the party overview panel is displayed
**Then** the trait synergy is noted (e.g., "+2 combat bonus from Brave trait")
**And** the trait bonuses are aggregated with the aptitude summary

### Story 6.3: Implement drag-and-drop party building (Phase 18 — PARTY-03)

As a player forming a party,
I can drag adventurers from the roster grid into party slots,
So that building a party feels tactile and intuitive.

**Acceptance Criteria:**

**Given** the player has opened the party formation panel
**When** the player drags an adventurer card from the roster grid
**Then** the card visually follows the cursor during drag (clone with opacity)
**And** the party slots show a drop highlight when the dragged card is over them
**And** dropping a card into a party slot adds that adventurer to the party

**Given** the player drags an adventurer who is already in the party
**When** they drop back into the roster grid
**Then** the adventurer is removed from the party
**And** the party overview updates to reflect the change

**Given** the drag interaction
**When** the browser does not support HTML5 drag-and-drop
**Then** the click-to-select interaction (existing behavior) remains functional as fallback

### Story 6.4: Implement party composition validation (Phase 18 — PARTY-04)

As a player building a party,
I can prevent invalid party compositions (duplicates, wrong size),
So that I cannot dispatch with an invalid party.

**Acceptance Criteria:**

**Given** the player attempts to drag the same adventurer into a party slot twice
**When** the second drop is attempted
**Then** the drop is rejected with a visual feedback (red border flash, UX-DR-9)
**And** a message "Adventurer already in party!" is displayed

**Given** the party size limit is 2 (based on player fame)
**When** the player attempts to add a third adventurer
**Then** the drop is rejected with a visual feedback
**And** a message "Party is full (2/2)" is displayed

**Given** the player has selected the minimum required party size
**When** the player clicks "Dispatch"
**Then** the dispatch proceeds normally

**Given** the player has not selected the minimum required party size
**When** the player clicks "Dispatch"
**Then** the dispatch button shows a warning: "Need at least X adventurers"
**And** no dispatch occurs

---

## Epic 7: Interaction Quality (v1.3 Phases 19-20)

All interactive elements meet modern usability standards. Players can explore stat bonus sources by clicking on party stats.

**FRs covered:** INTERACT-01, INTERACT-02, INTERACT-03, STATS-01, STATS-02
**UX-DRs:** UX-DR-8 (button hierarchy), UX-DR-9 (feedback patterns)

### Story 6.1: Ensure touch target sizes and button feedback (Phase 19 — INTERACT-01, 02, 03)

As a player using the game on any device,
I can reliably tap and click all interactive elements,
So that the game is accessible and feels responsive.

**Acceptance Criteria:**

**Given** the player views the game on a touch device (or simulates touch with browser dev tools)
**When** any button or interactive element is rendered
**Then** its clickable area is at least 44x44px (INTERACT-01)
**And** all buttons show hover state (brightness increase) and active state (0.95x scale-down) (INTERACT-02)
**And** selection highlights (selected adventurers, active party members) are visible and consistent across all views (INTERACT-03)

**Given** the player is navigating with a keyboard
**When** any interactive element receives focus
**Then** it shows a gold outline (2px solid #FFD700, per UX-DR-8)
**And** the focus outline is visible and does not overlap important content

**Given** the player interacts with buttons
**When** a button is hovered
**Then** the brightness increases by 10% (CSS filter brightness)
**And** when a button is pressed
**Then** it scales to 0.95x with a transition

### Story 7.2: Show bonus source breakdown (Phase 20 — STATS-01)

As a player trying to understand my party's stats,
I can see where each stat bonus comes from (base + trait + origin + equipment),
So that I can make informed decisions about equipment and party composition.

**Acceptance Criteria:**

**Given** the player is viewing a party overview panel
**When** the player sees a party stat (e.g., "Party STR: 25")
**Then** the stat breakdown shows: base STR sum (15) + trait bonuses (+5) + origin bonuses (+3) + equipment bonuses (+2) = 25
**And** the breakdown is displayed in a tooltip or expandable section (UX-DR-9 feedback pattern)
**And** each source is labeled clearly (e.g., "Brave trait: +2 STR")

**Given** the party composition changes (adventurer added/removed)
**When** the stat breakdown is displayed
**Then** it updates in real-time to reflect the current party composition
**And** the breakdown accurately reflects all active bonus sources

### Story 7.3: Clickable stat attribution (Phase 20 — STATS-02)

As a player examining a party stat,
I can click on it to see which adventurer contributes what,
So that I can identify which adventurer is providing which bonus.

**Acceptance Criteria:**

**Given** the player clicks on a party stat in the party overview panel
**When** the stat attribution popup appears
**Then** it lists each party member and their contribution to that stat (e.g., "Lyn: STR 5, Torian: STR 4, Mira: STR 6")
**And** the contributing adventurer's card is highlighted in the roster grid
**And** the popup dismisses when the player clicks outside or presses Escape

**Given** the player clicks on a party stat while viewing the quest requirements
**When** the stat attribution appears
**Then** it visually compares each adventurer's contribution against the quest requirement (e.g., "Quest requires STR ≥ 8 — Lyn meets requirement")

---

## Epic 8: Backlog — Deferred Bug Fixes & Improvements

**User outcome:** All known bugs and quality improvements identified during code reviews are tracked and resolved, preventing technical debt accumulation.

**FRs covered:** N/A (maintenance backlog)

**Notes:** This epic collects all deferred items from code reviews of Epics 1-4. Items are prioritized by severity. The goal is to prevent the "deferred pile-up" pattern where too many items accumulate without resolution. Each story should be completed before the next epic starts to keep technical debt manageable.

**Deferred items source:** `deferred-work.md`, Epic 3 retrospective, Epic 4 retrospective, story-by-story deferred notes.

---

### Story 8.1: Fix event cards to use dispatch instead of window.dispatchEvent

As a developer,
I can have event cards use the store dispatch system consistently with other card types,
So that event choice handling follows a single pattern and is testable in isolation.

**Acceptance Criteria:**

**Given** `renderEventCard` in `card.ts` currently uses `window.dispatchEvent` for choice handling
**When** event cards are rendered with a dispatch callback
**Then** event choices dispatch `EVENT_RESOLVED` actions through the store instead of `window.dispatchEvent`
**And** `tab.ts` calls `renderCard('event', event, state, undefined, dispatch)` with dispatch passed through
**And** event choice callbacks in `renderEventCard` use `dispatch({ type: 'EVENT_RESOLVED', payload: { eventId, choiceIndex: i } })`

**Given** event cards still use `window.dispatchEvent` as fallback
**When** no dispatch callback is provided
**Then** the event card falls back to `window.dispatchEvent` for backward compatibility

---

### Story 8.2: Fix MERGE_STATE to preserve non-payload state fields

As a developer,
I can have MERGE_STATE intelligently merge state rather than replace it entirely,
So that partial state updates don't lose important game state.

**Acceptance Criteria:**

**Given** `handleMergeState` in `store.ts` currently does `structuredClone(payload)` (total replacement)
**When** MERGE_STATE is dispatched with a partial state object
**Then** the merge preserves non-payload fields that are present in the current state (e.g., events, activeQuest, party)
**And** payload fields override current state values
**And** the behavior is documented as a shallow merge, not a deep merge

**Given** MERGE_STATE is dispatched with a full state object
**Then** the behavior is identical to the current full replacement

**Given** a consumer needs full replacement
**Then** they can merge `payload` with `currentState` before dispatching MERGE_STATE

---

### Story 8.3: Consume store subscribe cleanup and fix listener leaks

As a developer,
I can have all store subscriptions cleaned up properly and no event listener leaks,
So that memory usage stays bounded over long play sessions.

**Acceptance Criteria:**

**Given** `app.ts` discards the unsubscribe function from `store.subscribe()`
**When** the app mounts
**Then** the unsubscribe function is stored and called on page unload (beforeunload event)

**Given** `_visibilityHandler` on `GameTicker` is public
**When** the ticker is used
**Then** the property is private (rename to `_visibilityHandler` → `_visibilityHandler` is already private, just remove `public` modifier)

**Given** IndexedDB connection is opened
**When** the page is suspended and resumed after a long time
**Then** the IndexedDB connection is re-opened (connection state is validated)

**Given** `save-load.ts` auto-save
**When** the first dispatch fires
**Then** auto-save is not triggered (only on non-initial state changes)

---

### Story 8.4: Remove innerHTML = '' pattern in favor of safe DOM clearing

As a developer,
I can have all view rendering use safe DOM clearing that preserves event listeners,
So that listener tracking system handles cleanup without innerHTML destroying tracked listeners.

**Acceptance Criteria:**

**Given** multiple view functions in `tab.ts` use `container.innerHTML = ''`
**When** the view is rendered
**Then** the existing content's listeners are detached via `detachAllListeners` before innerHTML clearing
**And** the pattern is documented as a requirement in renderView comments

**Given** the listener tracking system exists
**When** any view uses innerHTML = ''
**Then** it first calls detachAllListeners on the container (or its children)

---

### Story 8.5: Verify morale aptitude functionality

As a developer,
I can verify whether morale aptitude is functional or a no-op flavor value,
So that the team has a clear decision on whether to implement or remove it.

**Acceptance Criteria:**

**Given** the morale system has aptitude-related calculations
**When** I trace through morale calculation code paths
**Then** the output clearly documents whether morale aptitude has any gameplay effect

**Given** the current behavior is documented
**When** a decision is made (keep, implement, or remove)
**Then** the appropriate story is created to address it

---

### Story 8.6: Add economy calibration test suite

As a developer,
I can have a test suite that validates economy balance (upgrade costs, gold income, quest rewards),
So that economy changes are caught by tests and don't break game balance.

**Acceptance Criteria:**

**Given** the current upgrade costs (office: 50, equipment: 30, job_postings: 15) and scaling (1.5x per level)
**When** a test suite validates economy balance
**Then** the suite checks: gold income vs cost ratios at different game stages, quest reward fairness, restock economy, upgrade affordability progression

**Given** economy calibration data (BAL-01, BAL-02)
**When** the test suite runs
**Then** it flags any economy parameter that falls outside reasonable bounds

---

## Epic-to-Requirement Traceability

| Epic | Requirements | FR Coverage |
|------|-------------|-------------|
| Epic 1: Core Gameplay (DONE) | N/A | N/A — v1.0-v1.2 shipped |
| Epic 2: Bug Fixes & Test Coverage (DONE) | BUG-01, BUG-02, TEST-01 | N/A |
| Epic 3: TypeScript Migration | N/A (maintenance) | N/A |
| Epic 4: Tech Debt Reduction | DEBT-01, DEBT-02 | N/A |
| Epic 5: Navigation & Tooltips | NAV-01, NAV-02, TOOLTIP-01-03 | NAV-01, NAV-02, TOOLTIP-01, TOOLTIP-02, TOOLTIP-03 |
| Epic 6: Party Management | PARTY-01, PARTY-02, PARTY-03, PARTY-04 | PARTY-01, PARTY-02, PARTY-03, PARTY-04 |
| Epic 7: Interaction Quality | INTERACT-01-03, STATS-01, STATS-02 | INTERACT-01, INTERACT-02, INTERACT-03, STATS-01, STATS-02 |
| Epic 8: Backlog — Deferred Fixes | DEF-01 through DEF-06 | N/A |

### Original GSD FR Coverage (for reference — already built)

| FR Range | Coverage Status | Notes |
|----------|----------------|-------|
| FR-1 to FR-36 | Already implemented in v1.0-v1.2 | All foundational systems exist |
| Prestige reset | Deferred to future milestone | Only legacy perks implemented |
| v1.3 UI/UX | Covered by Epics 5-7 | New requirements, not in original GSD epics |

---

## Epic Dependencies & Execution Order

```
Epic 1: Core Gameplay (DONE)
Epic 2: Bug Fixes (DONE)
    ↓
Epic 3: TypeScript Migration (independent, low risk)
    ↓
Epic 4: Tech Debt Reduction (needs TypeScript types as safety net)
    ↕ parallel
Epic 5: Navigation & Tooltips (depends on Epic 3 — clean types)
    ↕ parallel
Epic 6: Party Management (depends on Epic 5 for tab structure)
    ↕ parallel
Epic 7: Interaction Quality (Phase 19 parallel to Phase 17-18)
    ↓
Epic 8: Backlog — Deferred Fixes (after all features stable)
```

**Recommended sprint order:**
1. Epic 1: Core Gameplay — DONE ✅
2. Epic 2: Bug Fixes — DONE ✅
3. Epic 3: TypeScript Migration — quick win, sets foundation
4. Epic 5: Navigation & Tooltips — Phases 15-16
5. Epic 6: Party Management — Phases 17-18
6. Epic 7: Interaction Quality — Phases 19-20 (can start after Phase 15)
7. Epic 8: Backlog — Deferred Fixes — run after all features stable to clear accumulated deferred items
8. Epic 4: Tech Debt — can start after Epic 3, complete after Epics 5-7 (after features are stable)
9. Epic 9: Prestige Reset System — future milestone (out of scope for v1.3)

---

## Story Count Summary

| Epic | Stories | Categories |
|------|---------|-----------|
| 1: Core Gameplay (DONE) | 4 | 4 stories |
| 2: Bug Fixes & Test Coverage (DONE) | 3 | 3 stories |
| 3: TypeScript Migration | 4 | 4 stories |
| 4: Tech Debt Reduction | 2 | 2 stories |
| 5: Navigation & Tooltips | 4 | 4 stories |
| 6: Party Management | 4 | 4 stories |
| 7: Interaction Quality | 3 | 3 stories |
| 8: Backlog — Deferred Fixes | 6 | 6 stories |
| **Total** | **30 stories** | **8 epics** |

---

*Epic breakdown generated: 2026-05-30 — Renumbered 2026-06-12 to avoid duplication with greenfield Epic 1.*
*Based on brownfield codebase audit and v1.3 roadmap (Phases 15-20)*
*Active sprint tracking file — supersedes greenfield epics.md*
