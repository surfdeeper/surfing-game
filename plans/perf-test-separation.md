# Plan: Separate Performance Tests for Realistic Measurement

## Problem

Performance tests in `marchingSquares.test.js` are flaky because:

1. **Cold execution** - Single-shot timing without JIT warmup
2. **Test suite contamination** - Run after heavy tests (DebugPanel takes 12+ seconds)
3. **Tight thresholds** - 10-15ms limits hit by GC pauses, OS scheduling
4. **Unrealistic conditions** - Real game loop has warmed-up code paths

Measured reality:
- Test shows: 10-100ms (flaky)
- Actual warmed production: ~0.8-2ms per frame (acceptable)

## Solution

Separate performance tests into dedicated files that run in isolation with realistic measurement.

## Implementation Steps

### Step 1: Create `marchingSquares.perf.test.js`

Move the two performance tests from `marchingSquares.test.js` to a new file:
- `processes a large grid quickly`
- `handles multiple blobs efficiently`

New file structure:
```
src/render/
  marchingSquares.js           # Implementation
  marchingSquares.test.js      # Unit tests (correctness)
  marchingSquares.perf.test.js # Performance tests (isolated)
```

### Step 2: Update `marchingSquares.test.js`

Remove the `describe('performance', ...)` block entirely. Keep only unit tests for correctness.

### Step 3: Add warmup iterations to performance tests

New performance test pattern:
```js
it('processes a large grid quickly (warmed)', () => {
    // Setup
    const grid = createTestGrid();

    // Warmup - let JIT optimize
    for (let i = 0; i < 50; i++) {
        boxBlur(grid, 80, 60, 2);
        extractContours(blurred, 80, 60, 0.3);
    }

    // Measure averaged over multiple iterations
    const iterations = 100;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        const blurred = boxBlur(grid, 80, 60, 2);
        extractContours(blurred, 80, 60, 0.3);
    }
    const elapsed = (performance.now() - start) / iterations;

    console.log(`Warmed grid processing: ${elapsed.toFixed(2)}ms`);
    expect(elapsed).toBeLessThan(5); // More realistic threshold
});
```

### Step 4: Update vitest config

Modify `vitest.config.js` to exclude perf tests from default run:
```js
export default defineConfig({
    test: {
        include: ['src/**/*.test.{js,jsx}'],
        exclude: ['tests/**', 'node_modules/**', 'src/**/*.perf.test.{js,jsx}'],
        // ...
    },
});
```

### Step 5: Add npm scripts

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:perf": "vitest run --config vitest.perf.config.js",
    // ...
  }
}
```

### Step 6: Create `vitest.perf.config.js`

Dedicated config for performance tests:
```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['src/**/*.perf.test.{js,jsx}'],
        exclude: ['node_modules/**'],
        environment: 'node', // No jsdom overhead
        testTimeout: 30000,  // Allow longer runs
        pool: 'forks',       // Isolate from other processes
        poolOptions: {
            forks: {
                singleFork: true, // Run sequentially for consistent timing
            },
        },
    },
});
```

## Files to Modify

| File | Action |
|------|--------|
| `src/render/marchingSquares.test.js` | Remove performance tests |
| `src/render/marchingSquares.perf.test.js` | Create with warmed perf tests |
| `vitest.config.js` | Exclude `*.perf.test.js` |
| `vitest.perf.config.js` | Create for perf test config |
| `package.json` | Add `test:perf` script |

## Success Criteria

1. `npm test` runs fast and never flaky (no perf tests)
2. `npm run test:perf` runs isolated performance tests with realistic thresholds
3. Performance tests use warmup iterations and averaged measurements
4. Performance tests run in node environment (no jsdom overhead)
5. Thresholds are realistic (~5ms warmed, not 10ms cold)

## Future Considerations

- Could add performance regression tracking (store baseline, alert on degradation)
- Could run perf tests in CI on dedicated hardware for consistency
- Could add memory allocation tracking (detect GC pressure)
