# Plan: Foam Dispersion V2 Tests

## Goal

Create a canonical test that any foam dispersion implementation must pass:
**The outermost contour ring must only expand (or stay the same) as foam ages, never contract.**

The inner rings (dense foam core) are allowed to contract - that's expected as the core dissipates.

## Approach

### ASCII-Based Synthetic Data

Human-readable foam pattern defined as ASCII art:

```
. . . . . . . . . .
. . . # # # # . . .
. . # # # # # # . .
. . # # # # # # . .
. . # # # # # # . .
. . . # # # # . . .
. . . . . . . . . .
```

- `#` = foam cell with intensity 1.0
- `.` = empty cell
- Grid is 10x7 for simplicity

### Test Logic

1. Parse ASCII grid to create foam rows with a known `spawnTime`
2. Run the intensity grid builder at two time points:
   - `t=0s` (fresh foam)
   - `t=6s` (aged foam)
3. Apply blur, extract contours at outer threshold (0.15)
4. Measure bounding box of outer contour: `{minX, maxX, width, height}`
5. Assert: `width_aged >= width_fresh` AND `height_aged >= height_fresh`

### Test Cases

```javascript
describe('Foam Dispersion V2 - Outer Ring Must Expand')

  it('Option B (blur): outer contour width does not decrease as foam ages')
    // EXPECTED: FAIL - captures the bug

  it('Option B (blur): inner contour is allowed to contract (sanity check)')
    // EXPECTED: PASS - confirms test setup is correct
```

### Helper Functions

```javascript
// Parse ASCII art to foam rows
function parseAsciiToFoamRows(ascii, spawnTime) { ... }

// Get bounding box of contour at threshold
function getContourBounds(grid, gridW, gridH, threshold) {
  // Returns { minX, maxX, minY, maxY, width, height }
}
```

### File Location

`src/render/foamDispersionV2.test.js`

## Success Criteria

- Test fails for current Option B implementation (captures the bug)
- Test is minimal and readable (ASCII diagram, simple assertions)
- Test can be run against any future implementation to verify fix

## Notes

- Start with Option B (blur) since it's "least worst"
- Keep test count minimal (1-2 tests to start)
- The test documents the desired behavior as a specification
