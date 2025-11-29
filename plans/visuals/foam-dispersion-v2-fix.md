# Plan: Fix Foam Dispersion V2 - Outer Contour Contraction

## Status: TODO

## Problem

The outer contour contracts as foam fades. When older foam rows (at top) fade to 0 opacity, the contour moves downward to follow the remaining foam. Expected: contour should stay in place or expand, never contract.

## How Option B Currently Works

**Pipeline:**
1. `buildIntensityGridOptionB(foamRows, ...)` writes to intensity grid
1. For each row: `if (row.opacity <= 0) continue;` ← **skips faded rows**
1. Writes `opacity * intensity` to grid cells
1. Calculates `avgAge` across all rows, returns `blurPasses = 2 + avgAge * 0.8`
1. Caller applies `boxBlur(grid, blurPasses)`
1. `extractLineSegments` finds contours at thresholds (0.15, 0.3, 0.5)

**Why it contracts:**
- Line 179: `if (row.opacity <= 0) continue;` - faded rows write nothing
- Grid cells for faded rows stay at 0
- Blur spreads existing intensity but can't create intensity from nothing
- Contour follows wherever intensity > threshold
- As top rows fade to 0, contour moves down

## Proposed Fix

Keep writing to grid for faded rows, but with a minimum "halo" intensity that decays slower than opacity.

**Key change in `buildIntensityGridOptionB`:**

```javascript
for (const row of foamRows) {
    // OLD: if (row.opacity <= 0) continue;

    // NEW: Calculate halo intensity that persists after opacity fades
    const age = (gameTime - row.spawnTime) / 1000;
    const haloIntensity = Math.max(0, 0.2 * (1 - age / 10)); // Fades over 10s
    const coreIntensity = row.opacity * (seg.intensity || 0.5);
    const intensity = Math.max(coreIntensity, haloIntensity);

    if (intensity <= 0) continue; // Only skip if truly gone

    grid[idx] = Math.max(grid[idx], intensity);
}
```

This way:
- Core fades with opacity (4s)
- Halo persists longer (10s) at low intensity (0.2)
- Outer contour (threshold 0.15) stays in place because halo > 0.15
- Inner contours (0.3, 0.5) contract as expected

## Alternative: Expand Bounds Over Time

Instead of halo intensity, expand the X bounds of segments as they age:

```javascript
const age = (gameTime - row.spawnTime) / 1000;
const expansion = age * 0.02; // 2% per second
const expandedStartX = seg.startX - expansion;
const expandedEndX = seg.endX + expansion;
```

**Pros:** Matches physical dispersion better
**Cons:** Options A/C already tried this and had worse contraction issues

## Recommended Approach

Start with the **halo intensity** approach since:
- Minimal code change
- Doesn't change segment bounds (which A/C struggled with)
- Halo provides a "floor" for outer contour
- Easy to tune decay rate

## Test

Remove `.skip` from test in `src/render/foamDispersionV2.test.js` and verify:
- Top edge stays at row 0 as foam ages
- Eventually disappears (when halo fades)
- No contraction before disappearance

## Files to Modify

- `src/render/marchingSquares.js`: `buildIntensityGridOptionB()` (~10 lines)
