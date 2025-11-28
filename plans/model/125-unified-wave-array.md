# Plan 125: Unified Wave Array

## Problem

The current two-layer wave system (background waves + set waves) creates an artificial separation that looks unrealistic:

1. **Waves don't interact** - Background and set waves are independent arrays rendered as separate layers
2. **Visual disconnect during sets** - Background waves continue unchanged when big set waves come through
3. **Unnatural layering** - Background renders first at reduced opacity, set waves render on top at full opacity
4. **Period independence** - Set wave timing has no effect on background wave behavior

In reality, the ocean is one continuous surface where all wave energy combines. A big set wave should dominate the smaller chop, not float above it.

## Solution: Unified Wave Array with Types

### Core Change

Replace two arrays with one:

```javascript
// Current (two arrays)
world.setWaves = []
world.backgroundWaves = []

// Proposed (one array with types)
world.waves = [
  { id, spawnTime, amplitude, type: 'background' },
  { id, spawnTime, amplitude, type: 'set' },
  ...
]
```

### Rendering Change

Render all waves in a single pass, sorted by spawn time / position:

- No more "layer" separation
- Waves naturally interleave based on when they spawned
- A background wave between two set waves renders between them

### Visual Differentiation

Instead of opacity-based layering, waves are differentiated by their properties:

- **Thickness**: Background waves are thinner (amplitude-based, already implemented)
- **Contrast**: Background waves have lower color contrast (amplitude-based, already implemented)
- **No opacity difference**: All waves render at 100% opacity

The visual distinction emerges naturally from amplitude differences, not artificial layering.

## Implementation Steps

| Step | Task | Files |
|------|------|-------|
| 1 | Merge `setWaves` and `backgroundWaves` into single `waves` array | `src/main.js` |
| 2 | Add `type: 'background' \| 'set'` property to `createWave()` | `src/state/waveModel.js` |
| 3 | Update spawn functions to pass wave type | `src/main.js` |
| 4 | Remove layered rendering, render all waves in single loop | `src/main.js` |
| 5 | Remove opacity parameter from `drawWave()` | `src/main.js` |
| 6 | Update debug panel to show unified count with type breakdown | `src/main.js` |
| 7 | Update tests for new wave structure | `src/state/waveModel.test.js` |
| 8 | Update integration tests | `src/integration/gameLoop.test.js` |

## Optional Enhancement: Background Suppression During Sets

If background waves still feel too prominent during sets after unifying:

1. **Reduce spawn rate**: Spawn 50% fewer background waves during SET state
2. **Reduce amplitude**: Lower background amplitude slightly during SET state
3. **Skip if too close**: Don't spawn background wave if a set wave is within N seconds

This may not be needed - the unified rendering might look natural enough without suppression.

## Alternative: True Wave Interference (Future)

A more physics-accurate approach would model the ocean as a height field where waves actually add together mathematically. This would enable:

- Constructive/destructive interference patterns
- Realistic wave combination
- More organic ocean surface

However, this is a larger architectural change. The unified array is the minimal fix that addresses the immediate visual problem.

## Success Criteria

1. Ocean looks like one continuous surface, not two overlapping layers
2. Set waves naturally dominate the visual field when present
3. Background chop visible but not artificially separated
4. No regression in performance (wave count similar)

## Files to Modify

- `src/main.js` - Main changes (arrays, rendering, debug panel)
- `src/state/waveModel.js` - Add type property
- `src/state/waveModel.test.js` - Update tests
- `src/integration/gameLoop.test.js` - Update integration tests

## Files NOT Changed

- `src/state/setLullModel.js` - Still handles set wave timing
- `src/state/backgroundWaveModel.js` - Still handles background wave timing
- `src/render/coordinates.js` - No changes needed

## Related Plans

This plan is **orthogonal** to the wave physics dependency chain:

1. ✅ Time-based model (done - plan 123)
2. ⏳ Bathymetry (plan 124) - ocean floor depth map
3. ⏳ Shoaling (plan 40) - wave height changes with depth
4. ⏳ Breaking (plan 50) - wave breaking physics
5. ⏳ Peeling - break propagates along wave

**Plan 125 (this plan)** fixes the background/set wave layering issue. It can be implemented before or after the physics plans above - they don't depend on each other.

However, when bathymetry and breaking are implemented, the unified wave array will make it easier to apply breaking logic consistently to all waves (both background and set waves will interact with the same depth map).
