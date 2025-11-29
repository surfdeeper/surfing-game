# Plan: Foam Dispersion V2 Tests

## Status: COMPLETE

Test implemented at `src/render/foamDispersionV2.test.js` (currently skipped pending fix).

## Bug Description

As foam fades from top-down (older rows fade first), the outer contour contracts to follow the fading. It should expand or stay in place, not contract.

**Observed behavior:**
```
Top edge position over time:
  t=2s: row 0
  t=3s: row 0
  t=4s: row 0
  t=5s: row 1 ← MOVED DOWN by 1
  t=6s: row 3 ← MOVED DOWN by 3
  t=7s: row 5 ← MOVED DOWN by 5
  t=8s: row -1  (foam gone)
```

The contour "creeps downward" as older top rows fade away.

## Test Implementation

Simple test that:
1. Creates foam rows deposited top-to-bottom (simulating wave travel)
1. Top rows have older `spawnTime`, bottom rows newer
1. Applies fading opacity based on age
1. Tracks top edge position over multiple time points
1. Asserts: top edge must never move down from initial position

```javascript
it.skip('top edge should not move down as top rows fade', () => {
    // Creates 10 foam rows with staggered spawn times
    // Tracks top edge at t=2s through t=9s
    // Fails when top edge moves down (contracts)
});
```

## Root Cause

Option B uses blur to simulate dispersion. As older foam rows fade to 0 opacity:
1. Intensity values in grid drop to 0 for those rows
1. Blur spreads remaining intensity but can't create intensity from nothing
1. Contour threshold no longer met in faded areas
1. Result: contour contracts to follow remaining foam

## Fix Required

See `plans/visuals/foam-dispersion-v2-fix.md` for fix plan.
