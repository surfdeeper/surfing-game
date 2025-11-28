# Bug: Foam Fade Creates Scanning Artifact

**Status**: Investigating
**Depends On**: None

## Symptom
When viewing only the foam layer (wave layers disabled), there's a visible "vertical scan" artifact where the foam fade line appears to move toward shore at the same speed as new foam is deposited. This creates an unnatural synchronized fade pattern.

## Expected Behavior
Foam should:
- Linger where deposited for a longer period
- Disperse outward (spread horizontally and vertically)
- Drift slightly with currents
- Fade over a much longer period (10-30+ seconds)
- Accumulate when new waves deposit foam in the same area

The fade pattern should NOT create a moving front that tracks wave travel speed.

## Root Cause Analysis

### Current Implementation
1. **Foam deposition** (`src/main.jsx:462-526`):
   - Waves deposit foam rows as they travel toward shore
   - Each row has `spawnTime` set to current `gameTime`
   - Rows are pushed to `world.foamRows` array

2. **Foam fade** (`src/main.jsx:529-534`):
   ```javascript
   const foamRowFadeTime = 4000; // 4 seconds in ms
   world.foamRows = world.foamRows.filter(row => {
       const age = world.gameTime - row.spawnTime;
       row.opacity = Math.max(0, 1 - age / foamRowFadeTime);
       return row.opacity > 0;
   });
   ```

3. **Intensity grid** (`src/render/marchingSquares.js:62`):
   ```javascript
   grid[idx] = Math.max(grid[idx], intensity);
   ```
   Uses max, not additive - so new fresh foam (opacity=1.0) "wins" over fading foam.

### Why the Artifact Occurs
- `foamRowFadeTime = 4000ms` (4 seconds)
- Wave travel time is similar magnitude
- Result: fade "front" moves at roughly wave speed
- Each Y position gets fresh foam deposited, then fades, creating synchronized scan lines

## Proposed Fix

### Option 1: Longer Fade Time (Simplest)
Increase `foamRowFadeTime` to 15000-20000ms so foam persists long enough that the pattern breaks up and accumulation becomes visible.

### Option 2: Additive Intensity
Change from `Math.max()` to additive blending in `buildIntensityGrid()`:
```javascript
grid[idx] = Math.min(1.0, grid[idx] + intensity * 0.5);
```
This makes overlapping foam brighter/thicker.

### Option 3: Dispersion Over Time
The Option A/B/C implementations in `marchingSquares.js` already attempt this:
- **Option A**: Expanding segment bounds over time
- **Option B**: Age-based blur (more blur as foam ages)
- **Option C**: Per-row dispersion radius with core/halo fade

These may need tuning or one should be selected as the default.

### Option 4: Decouple from Wave Grid
Instead of depositing foam rows at fixed Y intervals tied to wave position, accumulate foam in a persistent spatial grid that decays slowly. New deposits add to existing values rather than creating new rows.

## Files Affected
- `src/main.jsx` - foamRowFadeTime constant, foam row update logic
- `src/render/marchingSquares.js` - intensity grid building, Option A/B/C implementations

## Testing
1. Toggle off wave layers (S, G keys) to isolate foam
2. Observe foam pattern - should NOT show synchronized scan lines
3. Foam should accumulate and persist, with dispersal over time
4. New waves should add to existing foam, not reset it

## Next Steps
1. Test increasing `foamRowFadeTime` to 15000ms as quick experiment
2. Evaluate which dispersion option (A/B/C) looks most natural
3. Consider switching from row-based to grid-based foam accumulation
