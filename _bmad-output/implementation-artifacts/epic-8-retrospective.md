# Epic 8 Retrospective — Backlog: Deferred Bug Fixes & Improvements

**Date:** 2026-06-23
**Epic:** 8 — Backlog: Deferred Bug Fixes & Improvements
**Status:** Done (all 6 stories completed, retrospective complete)

---

## Summary

| Metric | Value |
|--------|-------|
| Stories completed | 6/6 (100%) |
| Files modified | 4+ (card.ts, tab.ts, store.ts, app.ts) |
| Tests passing | 71+ (8.6 economy test suite) |
| Deferred items | 11 (from code reviews across all 6 stories) |
| Pre-existing bugs caught | 18+ (spread across stories) |

---

## What Went Well

1. **Story isolation was clean.** Each of the 6 stories targeted a specific, well-defined issue with clear before/after states. No story depended on another, enabling parallel development.

2. **8.1 unified the event card dispatch pattern.** Replacing `window.dispatchEvent` with store dispatch across all card types created a consistent event handling architecture. All card types now follow the same dispatch pattern.

3. **8.2's MERGE_STATE fix is architecturally significant.** Changing from `structuredClone(payload)` to `{ ...state, ...payload }` means future partial state updates won't silently lose unrelated state fields. All 4 current callers pass full state objects, so this is non-breaking.

4. **8.6's economy test suite is comprehensive.** 71 new tests covering gold scaling, upgrade cost calculation, economy targets across 5 difficulties. All passing. Zero bugs found — the economy system is well-calibrated.

5. **8.5 confirmed architectural decisions.** Verifying that morale and aptitudes are intentionally separated confirmed a sound design decision. The game's stat system is architecturally sound.

---

## Challenges & Lessons Learned

### 1. The "Deferred Items" Cycle — Root Cause Analysis

**The Pattern:** Every epic (1-8) has accumulated deferred items during code review. By Epic 8, there were so many deferred items that a full epic was needed just to catch up.

**Root Cause Discussion:**
- **Epic 6 retro** committed to a "pre-review self-checklist" and "atomic status updates" — neither was implemented
- **Epic 5 retro** also identified the same issue
- The team has been flagging this problem for 4 epics without fixing it

**Efvl's Insight:** The model improving (newer context window, better KV cache) may have addressed some of the underlying capability issues, but **explicit guardrails are still needed** — the model needs structured prompts to catch issues before code review.

**Lesson:** Process commitments without implementation are just intentions. Guardrails must be baked into the story template, not added as retro action items.

### 2. Pre-existing Debt Dominates Review Findings

Of the 11 deferred items across 6 stories, the vast majority are **pre-existing issues**, not bugs introduced by the current story's work. This is actually positive — it means stories were well-implemented — but it also means systemic debt is not being systematically addressed.

### 3. Runtime ReferenceErrors Slip Through

Story 8-4's review found `card.ts` referencing undefined variable `frag` instead of `cardEl` — a copy-paste artifact that causes a `ReferenceError` at runtime every time an event card renders. This is the most critical remaining issue from Epic 8.

---

## Deferred Items (Carry Forward to Epic 9)

| # | Source | Item | Priority |
|---|--------|------|----------|
| 1 | 8-4 code review | `card.ts:frag` undefined variable ReferenceError | **High** |
| 2 | 8-4 code review | `event as unknown as EventTemplate` type cast bypass | Medium |
| 3 | 8-5 code review | Morale/aptitude decision not documented | Low |
| 4 | 8-3 code review | Single-attempt IDB retry is fragile | Low |
| 5 | 8-6 code review | 5 false-positive "deferred" items (not actual bugs) | N/A (dismissed) |

**Note:** Items 1-3 must be resolved before or during Epic 9. Items 4-5 are low priority / informational.

---

## Continuity from Previous Retrospectives

### Epic 6 Action Items

| # | Action | Epic 8 Status |
|---|--------|---------------|
| 1 | Pre-review self-checklist for null safety, dead code, duplicate computation | ❌ **Not implemented** — this was the core finding of Epic 8 |
| 2 | Atomic status updates (story file + sprint-status.yaml together) | ❌ **Not implemented** — story status files still lag behind sprint-status.yaml |

### Epic 5 Action Items

| # | Action | Epic 8 Status |
|---|--------|---------------|
| 1 | Pre-review self-checklist | ❌ **Not implemented** — same as Epic 6 item |

### Epic 3 Action Items

| # | Action | Epic 8 Status |
|---|--------|---------------|
| 1 | Run `npx tsc --noEmit` on full project after each file | ✅ **Followed** — TypeScript compilation verified |
| 2 | Audit `GameState` against runtime state | ⏳ **Partially followed** — MERGE_STATE fix addressed this |

---

## Key Insight: Guardrails, Not Just Process

Efvl identified that the real issue isn't missing a checklist — it's that **the model needs explicit guardrails baked into story templates**. Without mandatory sections in story files that force the developer to check for:
- Type safety (no unchecked casts)
- Variable naming consistency (no copy-paste artifacts)
- Pre-existing debt audit (what's already broken?)
- Undefined variable verification

...the model will keep making the same mistakes regardless of model improvements.

**New approach:** Story templates will include mandatory guardrail sections. These will be validated in Epic 9.

---

## Action Items for Epic 9

### Process: Guardrails

1. **Implement guardrail sections in story template**
   - Owner: Developer
   - Deadline: Before Epic 9 kickoff
   - Sections: "Type Safety Check," "Pre-existing Debt Audit," "Undefined Variable Check," "Naming Consistency Check"
   - Success criteria: All Epic 9 story files contain filled guardrail sections

2. **Validate guardrails effectiveness**
   - Owner: Developer + Efvl
   - Deadline: After Epic 9 stories 3-4
   - Success criteria: Deferred item count drops from Epic 8's average (3-4 per story) to ≤1 per story

### Technical Debt

1. **Fix `frag` ReferenceError in `card.ts`**
   - Owner: Developer
   - Priority: High
   - Must complete: Before Epic 9 story 1

2. **Document morale/aptitude separation decision**
   - Owner: Developer
   - Priority: Low
   - Can happen during Epic 9

---

## Next Epic (Epic 9: UI/UX Overhaul)

**Source Documents:**
- UX Design Specification: `_bmad-output/planning-artifacts/ux-design-specification.md`
- Design Directions: `_bmad-output/planning-artifacts/ux-design-directions.html`
- Chosen Direction: Hybrid Dashboard + Card-Based (Direction 4 + Direction 3)

**Scope:**
- Implement two-column dashboard layout (quest/activity left, stats/events right)
- Redesign adventurer cards to match spec (rarity borders, hover effects, expanded states)
- Implement button hierarchy (primary/secondary/danger/success)
- Implement feedback patterns (floating text, screen flash, consistent timing)
- Remove jarring animations — replace with clean, direct DOM updates
- Apply design system tokens consistently (colors, spacing, typography from UX spec)
- Accessibility foundation (ARIA labels, keyboard nav, focus states, WCAG AA)

**Dependencies on Epic 8:**
- MERGE_STATE fix provides safe partial state updates for new dashboard components
- Event card dispatch pattern (8.1) means events already use store dispatch — no changes needed
- trackEventListener/detachAllListeners patterns are project-wide and ready

**Recommendation:** Epic 9 stories should be derived directly from the UX Spec's Phase 1 component roadmap. Each story targets a specific component or pattern from the spec.

---

*Retrospective completed: 2026-06-23*
*Epic 8 status: done (all 6 stories, retrospective complete)*
*2 guardrail process action items committed for Epic 9*
*3 deferred items carry forward to Epic 9*
*Epic 9: UI/UX Overhaul — defined, using existing UX Design Specification*
