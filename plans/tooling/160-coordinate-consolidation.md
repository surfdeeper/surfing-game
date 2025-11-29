# Plan 160: Coordinate Function Consolidation

**Status**: ✅ Complete
**Category**: tooling
**Depends On**: None
**Completed**: 2024-11

## Problem

The codebase has multiple duplicate implementations of coordinate conversion functions, violating the DRY principle and creating maintenance risk. The same functions exist in 3-4 locations:

| Function | Locations |
|----------|-----------|
| `progressToScreenY` | `coordinates.js`, `waveRenderer.js`, `update/index.js`, inline in stories |
| `getOceanBounds` | `coordinates.js`, `update/index.js` |
| `calculateTravelDuration` | `coordinates.js`, `update/index.js` |
| `screenYToProgress` | `coordinates.js`, `update/index.js` |

Additionally, `render/index.js` exports non-existent functions from `coordinates.js`:
- `screenToNormalized` (doesn't exist)
- `normalizedToScreen` (doesn't exist)
- `progressToY` (doesn't exist)
- `yToProgress` (doesn't exist)

## Proposed Solution

Consolidate all coordinate functions into a single canonical location: `src/render/coordinates.js`.

This location is appropriate because:
1. Already well-documented with JSDoc
1. Already imported by `main.jsx` (production code)
1. Coordinate mapping is conceptually a rendering concern (abstract → screen)
1. Tests exist at `coordinates.test.js`

## Implementation Steps

### Phase 1: Fix Dead Exports (Low Risk)

1. Remove broken exports from `src/render/index.js` (lines 39-44)
1. Run lint to verify no import errors

### Phase 2: Consolidate `update/index.js` Duplicates

1. Remove duplicate functions from `update/index.js`:
   - `getOceanBounds` (lines 21-26)
   - `calculateTravelDuration` (lines 31-33)
   - `progressToScreenY` (lines 38-40)
   - `screenYToProgress` (lines 45-47)

1. Add import at top of `update/index.js`:
   ```javascript
   import { progressToScreenY, screenYToProgress, getOceanBounds, calculateTravelDuration } from '../render/coordinates.js';
   ```

1. Re-export for any consumers:
   ```javascript
   export { progressToScreenY, screenYToProgress, getOceanBounds, calculateTravelDuration } from '../render/coordinates.js';
   ```

1. Run tests to verify no regressions

### Phase 3: Consolidate `waveRenderer.js` Duplicate

1. Remove `progressToScreenY` from `waveRenderer.js` (lines 56-61)
1. Add import from `coordinates.js`
1. Update `render/index.js` to export from `coordinates.js` instead of `waveRenderer.js`
1. Run tests

### Phase 4: Fix Inline Copy in Stories

1. Update `stories/FoamRendering.stories.jsx` line 27:
   ```javascript
   // Before (inline)
   const waveY = oceanTop + progress * (oceanBottom - oceanTop);

   // After (imported)
   import { progressToScreenY } from '../render/coordinates.js';
   const waveY = progressToScreenY(progress, oceanTop, oceanBottom);
   ```

### Phase 5: Optional - Extract Foam Intensity

Consider extracting the repeated foam intensity calculation:
```javascript
// In src/state/foamModel.js
export function calculateFoamIntensity(depth, threshold = 3) {
    return Math.max(0, Math.min(1, 1 - depth / threshold));
}
```

Locations to update:
- `main.jsx:579`
- `update/index.js:223`
- `stories/FoamRendering.stories.jsx:48`

## Files Affected

- `src/render/index.js` - Remove dead exports, update coordinate exports
- `src/render/waveRenderer.js` - Remove duplicate, add import
- `src/update/index.js` - Remove duplicates, add imports, re-export
- `src/stories/FoamRendering.stories.jsx` - Replace inline calculation
- `src/state/foamModel.js` - (Optional) Add foam intensity function

## Testing

1. `npm run lint` - Verify no import/export errors
1. `npm test` - All unit tests pass
1. `npm run test:visual:headless` - Visual regression passes
1. Manual: Verify waves render correctly in browser

## Rollback

Each phase is independent. If issues arise:
1. Revert the specific phase's changes
1. Re-add the duplicate function temporarily
1. Investigate import cycle or other issues

## Notes

- No functional changes - purely structural refactoring
- Each phase can be a separate commit for easy bisection
- The foam intensity extraction (Phase 5) is optional and lower priority
