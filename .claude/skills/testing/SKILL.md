---
name: testing
description: Apply testing best practices when writing or modifying tests. Use when creating unit tests (Vitest), visual tests (Playwright), or discussing test strategy. Auto-apply when editing files in tests/ or *.test.js files.
---

# Testing Skill

## Fundamental Principles

### 1. Tests must exercise the same code that runs in production

**Tests must exercise the same code that runs in production.**

If tests pass but the app is broken, you're testing the wrong code.

```
❌ Anti-pattern:
   Helper module (tested) → Used by Storybook
   Inline copy (untested) → Used by main.jsx

   Tests pass, production runs different code.

✅ Correct:
   Helper module (tested) → Used by BOTH Storybook AND main.jsx
```

When writing tests, always verify you're testing code that production actually uses. If Storybook uses a helper function, main.jsx should use that same function.

### 2. Test utilities must be tested

**The test framework itself must be tested.**

Test utilities in `src/test-utils/` are foundational - if they're broken, the entire test suite becomes untrustworthy. A bug in `matrixToField()` or `defineProgression()` could cause tests to pass when they should fail, or vice versa.

```
src/test-utils/
├── matrixField.js          # Matrix↔field conversion
├── matrixField.test.js     # REQUIRED: Tests for conversion
├── progression.js          # defineProgression() framework
├── progression.test.js     # REQUIRED: Tests for framework
└── index.js                # Exports
```

**When modifying test utilities:**
1. Write tests for the utility FIRST
2. Verify utility tests pass before using the utility
3. Run `npx vitest run src/test-utils/` to validate the framework

**Why this matters:**
- A broken `fieldToMatrix()` could silently corrupt all snapshot data
- A broken `captureSnapshots()` could skip time points
- A broken registry could fail to register progressions for visual tests

Tests for test utilities are not optional overhead - they're the foundation of test trustworthiness.

---

This project has a comprehensive testing strategy with multiple test types.

## Test Framework Stack

| Type | Framework | Location | Command |
|------|-----------|----------|---------|
| Unit | Vitest | `src/**/*.test.js` | `npm test` |
| Visual | Playwright | `tests/visual/*.spec.js` | `npm run test:visual:headless` |
| E2E | Playwright | `tests/*.spec.js` | `npm run test:e2e` |
| Performance | Vitest | `src/**/*.perf.test.js` | `npm test` |

## Test Commands Reference

```bash
# Linting (run first for fast feedback)
npm run lint                          # ESLint - catch syntax/import errors

# Smoke test (MUST run after any changes to verify app loads)
npx playwright test tests/smoke.spec.js:3  # Quick smoke test - app loads without JS errors

# Test utilities (run if modifying test framework)
npx vitest run src/test-utils/        # Validate test framework integrity

# Unit tests (run specific file first, not entire suite)
npx vitest run src/path/file.test.js  # Run specific test file
npm test                              # Run all unit tests (slower, use sparingly)

# Visual tests
npm run test:visual:headless          # Headless (CI/agents)
npm run test:visual:headed            # With browser UI (debugging)
npm run test:visual:update:headless   # Update baseline snapshots
npm run reset:visual                  # Clear results/reports
npm run reset:visual:all              # Clear results + baselines
```

## CRITICAL: Test Order After Changes

After making code changes, run tests in this order:

1. **`npm run lint`** - Fast syntax/import check (~1 second)
2. **`npx playwright test tests/smoke.spec.js:3`** - Verify app loads without JS errors (~3 seconds)
3. **`npx vitest run src/path/changed-file.test.js`** - Test specific changed file
4. **Full suite only if needed** - `npm test` (minutes, use sparingly)

**DO NOT skip the smoke test** - unit tests can pass while the app is completely broken (e.g., broken imports that aren't exercised in unit tests).

**DO NOT run the full test suite first** - it wastes time. Start with specific tests related to your changes.

## Unit Test Patterns (Vitest)

### File Naming
- Place tests next to source: `src/state/waveModel.js` → `src/state/waveModel.test.js`
- Performance tests: `*.perf.test.js`

### Test Structure
```javascript
import { describe, it, expect, beforeEach } from 'vitest';

describe('ModuleName', () => {
  describe('functionName', () => {
    it('should handle specific case', () => {
      // Arrange
      const input = createTestData();

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toMatchObject({ expected: 'shape' });
    });
  });
});
```

### Testing Physics/Math Code
- Test boundary conditions (zero, negative, maximum values)
- Test physical invariants (energy conservation, valid ranges)
- Use `toBeCloseTo()` for floating point comparisons
- Document expected physics behavior in test names

Example from `waveModel.test.js`:
```javascript
it('should increase wave height during shoaling', () => {
  const deepWater = calculateWaveHeight(depth: 100);
  const shallowWater = calculateWaveHeight(depth: 10);
  expect(shallowWater).toBeGreaterThan(deepWater);
});
```

## Visual Test Patterns (Playwright)

### Story-Based Visual Tests
Visual tests use Ladle stories as test fixtures:

```javascript
// tests/visual/foam-rendering.spec.js
const stories = [
  { id: 'foam-rendering--current-behavior', name: 'Current Behavior' },
  { id: 'foam-rendering--option-a-expand-bounds', name: 'Option A Expand Bounds' },
  { id: 'foam-rendering--compare-all-options', name: 'Compare All Options' },
];

test(`${story.name} matches snapshot`, async ({ page }) => {
  await page.goto(`/?story=${story.id}`);
  await page.waitForSelector('canvas');
  await page.waitForTimeout(500); // Ensure render complete

  const canvas = page.locator('canvas').first();
  await expect(canvas).toHaveScreenshot(`${story.id}.png`);
});
```

**Important**: Story IDs must match exports from `src/stories/*.stories.jsx`. Check Ladle's `/meta.json` endpoint to see available story IDs.

### Visual Test Best Practices
1. Wait for canvas to be fully rendered before screenshot
2. Use consistent viewport sizes
3. Capture canvas element only, not full page
4. Name snapshots descriptively: `{feature}--{scenario}.png`

## Performance Tests

Located in `*.perf.test.js` files. Test rendering and simulation performance:

```javascript
// src/render/foamRendering.perf.test.js
describe('performance', () => {
  it('should render 1000 foam rows under 16ms', () => {
    const start = performance.now();
    renderFoam(largeDataSet);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(16); // 60fps budget
  });
});
```

## When Writing Tests

1. **Before implementation**: Write failing test first (TDD encouraged)
2. **After implementation**: Ensure edge cases covered
3. **Bug fixes**: Add regression test that fails without fix
4. **Visual changes**: Update baselines after review

## Testing UI Behavior Over Time

For components that update every frame (game loop, animations), write integration tests that simulate time progression:

```javascript
it('progress increases as gameTime advances', () => {
  const { rerender } = render(<Component gameTime={0} />);
  const offset0 = getProgressOffset();

  rerender(<Component gameTime={5000} />);
  const offset5 = getProgressOffset();

  expect(offset5).toBeLessThan(offset0); // Progress increased
});
```

This catches bugs where calculations are correct but don't update properly over time.

## Debugging: CSS vs Logic Bugs

| Symptom | Likely Cause | Test Strategy |
|---------|--------------|---------------|
| Calculation wrong | Logic bug | Unit test with known inputs |
| Value correct, visual wrong | CSS/rendering | Integration test + CSS inspection |
| Flickering/tweaking | CSS transition conflict | Remove transitions, test in Vitest |

**Key principle**: If Vitest tests pass but browser looks wrong, suspect CSS (transitions, animations) not logic.

## Test Data Fixtures

Create realistic test data that exercises the physics:
- Wave scenarios: early wave (offshore), mid wave (breaking), late wave (shore)
- Size variations: small, medium, large waves
- Time progressions: t=0 through full wave lifecycle

## Integration with Plans

Reference relevant plans when writing tests:
- `plans/testing/110-testing-strategy.md` - Overall strategy
- `plans/testing/130-testing-expansion.md` - Expansion plans
- Feature plans contain acceptance criteria for tests
