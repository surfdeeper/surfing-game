---
name: testing
description: Apply testing best practices when writing or modifying tests. Use when creating unit tests (Vitest), visual tests (Playwright), or discussing test strategy. Auto-apply when editing files in tests/ or *.test.ts files.
---

# Testing Skill (Orchestrator)

This skill coordinates testing strategy. For specific test types, see:

- **`unit-testing`** - Vitest unit tests, physics testing, test utilities
- **`visual-testing`** - Ladle stories, Playwright visual regression

## The Testing Pyramid

Run cheap tests first to catch issues early:

```
                    ┌─────────────┐
                    │   Visual    │  Slowest, most expensive
                    │  Regression │  Only run when unit tests pass
                    ├─────────────┤
                    │    E2E      │  Smoke test: does app load?
                    │   Smoke     │
                    ├─────────────┤
                    │    Unit     │  Fast, isolated logic tests
                    │   Tests     │  Run specific files first
                    ├─────────────┤
                    │    Lint     │  Fastest - syntax/import errors
                    └─────────────┘
```

## Test Order (Always Follow This)

After making changes, run tests in this order:

```bash
# 1. Lint (~1 second) - catches syntax/import errors
npm run lint

# 2. Smoke test (~3 seconds) - verifies app loads without JS errors
npx playwright test tests/smoke.spec.js:3

# 3. Specific unit tests (~seconds) - test files related to changes
npx vitest run src/path/changed-file.test.ts

# 4. Visual tests (if relevant) - only after unit tests pass
npm run test:visual:headless

# 5. Full suite (rarely needed) - only for major changes
npm test
```

**Why this order matters:**

| Step | Catches | Time |
|------|---------|------|
| Lint | Syntax errors, bad imports | 1s |
| Smoke | App crashes, broken imports not in unit tests | 3s |
| Unit | Logic bugs in changed code | seconds |
| Visual | Rendering regressions | minutes |

If lint fails, don't bother running tests. If smoke fails, the app is broken - fix that first. If unit tests fail, don't run visual tests (you'll waste time debugging render issues when the data is wrong).

## Critical Principles

### 1. Tests Must Exercise Production Code

```
❌ Anti-pattern:
   Helper (tested) → Used by Storybook only
   Inline copy     → Used by main.tsx (production)

   Tests pass, production runs different code.

✅ Correct:
   Helper (tested) → Used by BOTH stories AND main.tsx
```

### 2. Unit Tests Gate Visual Tests

Don't run visual tests when unit tests are failing:

```bash
# Unit tests fail
$ npx vitest run src/state/energyField.test.ts
FAIL - energy should reach row 3 by t=3s

# DON'T run visual tests yet - fix the data first
# Visual tests would give misleading results
```

Visual tests are expensive. If the underlying data/logic is wrong, you'll waste time looking at broken renders trying to debug "visual issues" when the real bug is in the model.

### 3. Test Utilities Must Be Tested

`src/test-utils/` contains foundational code. A bug there corrupts all tests:

```bash
# Run after modifying test utilities
npx vitest run src/test-utils/
```

## Choosing the Right Test Type

| Scenario | Test Type | Skill |
|----------|-----------|-------|
| Logic/math/physics | Unit test | `unit-testing` |
| "Does X render correctly?" | Visual test | `visual-testing` |
| "Does the app load?" | Smoke test | (this skill) |
| "Did imports break?" | Lint | (this skill) |
| Time progression behavior | Unit + Visual | both |

## Quick Reference

```bash
# Linting
npm run lint

# Smoke test
npx playwright test tests/smoke.spec.js:3

# Unit tests
npx vitest run src/path/file.test.ts    # Specific file
npm test                                  # All unit tests

# Visual tests
npm run ladle:build                       # Verify stories compile
npm run test:visual:headless              # Run visual regression
npm run test:visual:update:headless       # Update baselines

# Reset
npm run reset:visual                      # Clear results
npm run reset:visual:all                  # Clear results + baselines
```

## Debugging: CSS vs Logic Bugs

| Symptom | Likely Cause | Next Step |
|---------|--------------|-----------|
| Unit test fails | Logic bug | Debug with `unit-testing` skill |
| Unit passes, visual fails | Rendering bug | Check `visual-testing` skill |
| Both pass, browser looks wrong | CSS conflict | Check for transitions on 60fps elements |
