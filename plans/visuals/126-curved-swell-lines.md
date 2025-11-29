# Plan 126: Curved Swell Lines (Future)

## Prerequisites

- ✅ Plan 124: Bathymetry + foam triangle (must be done first)
- Shoaling working
- Breaking working

## Goal

Make wave lines curve based on depth - waves slow over shallow spots, causing the line to bend.

## Concept

Currently waves are straight horizontal lines. In reality, waves refract (bend) because:
- Waves travel slower in shallow water
- The shallow section "lags behind" the deep section
- This curves the wave line

```
Before (current):
─────────────────────────────  straight line

After (this plan):
────────╲___________╱────────  curved over shallow spot
```

## Implementation Approach

Instead of one y-position per wave, track y-position at multiple x-points:

```js
wave = {
    // Array of y-positions across screen width
    // Each segment can have different y based on local depth/speed
    segments: [
        { x: 0.0, y: 100 },
        { x: 0.1, y: 102 },
        { x: 0.2, y: 108 },  // slower over shallow
        { x: 0.3, y: 115 },
        // ...
    ],
    amplitude: 0.8
}
```

Or simpler: calculate curve mathematically from depth function.

## Out of Scope for Now

This is a future enhancement. Focus on plan 124 (straight lines + foam) first.

## Dependencies

1. Plan 124 (bathymetry) - need depth map
1. Plan 125 (tab visibility bug) - should fix first
1. Shoaling visual (wave gets taller over shallow)
