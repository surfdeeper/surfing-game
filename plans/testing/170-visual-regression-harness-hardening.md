# Plan 170: Visual Regression Harness Hardening

**Status**: Proposed  
**Category**: testing  
**Depends On**: 110 (Testing Strategy), 130 (Testing Expansion)

## Problem

We rely on Playwright visual tests, but the harness itself is not validated. Header clutter and overflow regressions can slip in because:
- Stories are not guaranteed deterministic (viewport, data, seeds), causing flaky baselines.
- No meta-tests prove that diffs are detected (if the harness is broken, tests pass silently).
- Baseline lifecycle (reset/update) is ad hoc; unclear when to trust a diff.
- Story organization is ad hoc, making it hard to scale many snapshots.

## Goal

Make the visual regression system trustworthy and scalable by: (1) enforcing deterministic, organized stories; (2) validating the harness with “tests for the tests”; (3) clarifying baseline lifecycle and CI behavior.

## Approach

1. **Determinism & Seeds**
   - Standardize viewport presets (sm/md/lg) and deterministic data/seeded props for stories under test.
   - Provide shared helpers to freeze time/randomness and inject fixed text (long labels, overflow cases).
1. **Story Organization**
   - Naming convention: `Category/Component/State` with folders for `layout`, `controls`, `header`, etc.
   - Mark “visual-test-ready” stories via explicit exports to avoid accidental inclusion.
1. **Harness Meta-Tests (“test the tests”)**
   - Add a synthetic story + script that intentionally changes DOM (e.g., shifts a button 10px) and assert the visual test fails.
   - Add a fake “no-diff” control to ensure passing path works.
   - Validate failure messaging is readable (surface diff path, hint to update baselines).
1. **Baseline Lifecycle & CI**
   - Document/reset/update flow (use `npm run reset:visual` and `npm run test:visual:update:headless`).
   - CI: run headless snapshots; fail on diff; prohibit baseline writes in CI.
   - Add flake mitigation: retry-on-diff once with the same seed/viewport before failing.
1. **Reusable Fixtures**
   - `stories/testing/` helpers for deterministic mounts and long-text fixtures.
   - Viewport matrix helper to generate per-breakpoint snapshots with the same story code.

## Scope / Deliverables

- Docs: this plan + a short README in `tests/visual/` describing seeds, viewports, and baseline workflow.
- Code: deterministic fixture helpers; meta-test that proves a DOM change is caught; opt-in story tagging for visual runs.
- CI: explicit rule that CI cannot update baselines; one retry on diff.

## Acceptance Criteria

- Running the meta-test that nudges a DOM element produces a failing snapshot diff locally.
- Visual runs are stable across sm/md/lg viewports for a fixed seed.
- Clear documented flow for reset/update; CI fails on unintended diffs and cannot write baselines.
