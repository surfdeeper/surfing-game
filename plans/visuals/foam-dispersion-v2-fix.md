# Plan: Fix Foam Dispersion V2 - Outer Contour Contraction

## Status: TODO

## Problem

The outer contour contracts as foam fades. When older foam rows (at top) fade to 0 opacity, the contour moves downward to follow the remaining foam. Expected: contour should stay in place or expand, never contract.

## Root Cause

Option B (`buildIntensityGridOptionB`) writes `opacity * intensity` to the grid. When opacity fades to 0, grid cells become 0. Blur can't expand into areas with no intensity - it can only spread existing intensity thinner.

## Proposed Fix

Track the **maximum extent** of foam separately from current intensity. The outer contour should be based on "where foam has ever been" not "where foam currently exists."

### Approach A: Track Historical Bounds

Store `minY` (top-most row that ever had foam) on each foam segment or globally. Use this to set a minimum outer bound regardless of current opacity.

**Pros:** Simple, minimal change
**Cons:** Doesn't give smooth dispersion visually

### Approach B: Expand Bounds Over Time (like Option A/C)

Instead of pure blur, explicitly expand segment bounds based on age:
- Fresh foam: use original bounds
- Aged foam: expand bounds outward (even as core fades)

This is what Options A and C already do. Consider migrating Option B to use this approach.

**Pros:** Smooth visual dispersion
**Cons:** More complex, may need to merge with Option A/C logic

### Approach C: Two-Pass Rendering

1. First pass: render outer "halo" at historical max bounds with low intensity
2. Second pass: render current foam with fading intensity

**Pros:** Clean separation of concerns
**Cons:** More rendering overhead

## Recommended Approach

**Approach B** - Modify `buildIntensityGridOptionB` to expand segment bounds based on age, similar to Option A. The blur then smooths the expanded bounds rather than trying to create expansion from nothing.

Key changes to `buildIntensityGridOptionB`:
1. Calculate age-based expansion factor per row
2. Expand segment `startX`/`endX` bounds outward
3. Write expanded bounds to grid (even with reduced opacity)
4. Blur smooths the result

## Test

Remove `.skip` from test in `src/render/foamDispersionV2.test.js` and verify:
- Top edge stays at row 0 (or moves up) as foam ages
- Foam eventually disappears entirely (acceptable)
- No contraction before disappearance

## Files to Modify

- `src/render/marchingSquares.js`: `buildIntensityGridOptionB()`
