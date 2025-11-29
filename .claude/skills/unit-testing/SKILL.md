---
name: unit-testing
description: Unit testing with Vitest. Use when writing or modifying unit tests, testing physics/math code, or working with test utilities. Auto-apply when editing *.test.ts files in src/.
---

# Unit Testing Skill

Unit tests verify logic in isolation using Vitest.

## Commands

```bash
# Run specific test file (preferred - fast feedback)
npx vitest run src/path/file.test.ts

# Run all unit tests
npm test

# Run test utilities (validate test framework)
npx vitest run src/test-utils/

# Watch mode for development
npx vitest src/path/file.test.ts
```

## File Structure

Tests live next to source files:

```
src/state/waveModel.ts           → src/state/waveModel.test.ts
src/render/energyField.ts        → src/render/energyField.test.ts
src/test-utils/progression.ts    → src/test-utils/progression.test.ts
```

## Test Structure

```typescript
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

## Testing Physics/Math Code

This codebase has wave simulation physics. Key patterns:

```typescript
// Test boundary conditions
it('handles zero depth', () => {
  expect(() => calculateWaveHeight(0)).not.toThrow();
});

// Test physical invariants
it('wave height increases in shallow water (shoaling)', () => {
  const deep = calculateWaveHeight({ depth: 100 });
  const shallow = calculateWaveHeight({ depth: 10 });
  expect(shallow).toBeGreaterThan(deep);
});

// Use toBeCloseTo for floats
it('energy conserved within tolerance', () => {
  expect(totalEnergy).toBeCloseTo(initialEnergy, 5);
});
```

## Test Utilities Must Be Tested

Files in `src/test-utils/` are foundational. If they're broken, all tests are untrustworthy.

```
src/test-utils/
├── matrixField.ts          # Matrix↔field conversion
├── matrixField.test.ts     # REQUIRED
├── progression.ts          # defineProgression() framework
├── progression.test.ts     # REQUIRED
└── index.ts
```

**Always run after modifying test utils:**

```bash
npx vitest run src/test-utils/
```

## Progression Framework

For time-based simulations, use `defineProgression()`:

```typescript
import { defineProgression } from '../test-utils';

export const PROGRESSION_NO_DAMPING = defineProgression({
  id: 'energy-field/no-damping',
  description: 'Energy propagates without decay',
  initialMatrix: [[1, 0, 0], [0, 0, 0], [0, 0, 0]],
  updateFn: (field, dt) => updateEnergyField(field, { damping: 0 }, dt),
  captureTimes: [0, 1, 2, 3],
});

// Test assertions on snapshots
it('energy reaches row 2 by t=2s', () => {
  const snapshot = PROGRESSION_NO_DAMPING.snapshots[2];
  expect(snapshot.matrix[2][0]).toBeGreaterThan(0);
});
```

Progressions are:
- **Exported** for visual tests and stories to import
- **Deterministic** - same inputs always produce same snapshots
- **Documented** - description explains what's being tested

## ASCII Matrix Format (RxJS Marble-Inspired)

For compact, readable matrix assertions, use the ASCII format from `src/test-utils/asciiMatrix.ts`:

```typescript
import { progressionToAscii, matrixToAscii } from '../test-utils';

it('PROGRESSION_NO_DAMPING produces expected matrices', () => {
  // ASCII shows all 6 time frames side-by-side
  const expected = `
t=0s   t=1s   t=2s   t=3s   t=4s   t=5s
FFFFF  BBBBB  44444  22222  11111  11111
-----  AAAAA  AAAAA  44444  22222  22222
-----  22222  44444  44444  33333  22222
-----  11111  22222  33333  44444  33333
-----  -----  11111  22222  33333  33333
-----  -----  -----  11111  22222  33333
`.trim();
  expect(progressionToAscii(PROGRESSION_NO_DAMPING.snapshots)).toBe(expected);
});
```

**Character legend:**
| Char | Value | Meaning |
|------|-------|---------|
| `-`  | 0.0   | No energy |
| `1-4`| 0.1-0.4 | Low energy |
| `A-B`| 0.5-0.6 | Medium energy |
| `F`  | 1.0   | Full energy |

**Why ASCII over Vitest snapshots:**
- **Readable**: Energy propagation visually obvious (F→B→4→2→1)
- **Compact**: 7 lines vs 1000+ line snapshot file
- **Inline**: Expected values in the test, not external files
- **Diffable**: Changes show exactly which cells changed

**Utilities:**
```typescript
// Single matrix
matrixToAscii([[1.0, 0.5], [0.0, 0.2]]) // → "FA\n-2"
asciiToMatrix("FA\n-2")                  // → [[1.0, 0.5], [0.0, 0.2]]

// Multi-frame progression
progressionToAscii(snapshots)            // → side-by-side frames

// Compare with ASCII precision
matricesMatchAscii(actual, expected)     // → true if same when converted
```

## Common Patterns

### Testing Time Progression

```typescript
it('progress increases over time', () => {
  const t0 = getProgress(0);
  const t5 = getProgress(5000);
  expect(t5).toBeGreaterThan(t0);
});
```

### Testing State Transitions

```typescript
it('transitions from idle to breaking when depth threshold crossed', () => {
  const wave = createWave({ amplitude: 1.0 });
  expect(getWaveState(wave, { depth: 10 })).toBe('propagating');
  expect(getWaveState(wave, { depth: 0.5 })).toBe('breaking');
});
```

## Debugging Failed Tests

1. **Run single test** - Isolate the failure
2. **Check test data** - Is the fixture correct?
3. **Add console.log** - Inspect intermediate values
4. **Check physics** - Does the math match expectations?

If unit tests pass but visuals are wrong, see the `visual-testing` skill.
