# Plan 161: Dead Code and Unused Import Cleanup

**Status**: ✅ Complete
**Category**: tooling
**Depends On**: 160 (coordinate consolidation should happen first)
**Completed**: 2024-11
**Superseded By**: 250 (code quality agents) - For ongoing dead code detection, use `npm run check:dead-code`

## Problem

Lint reports ~20 unused variables, imports, and function definitions across the codebase. These create noise, confuse new contributors, and may indicate incomplete refactoring.

## Scope

This plan covers unused code removal only - not duplicate consolidation (see Plan 160).

## Implementation Steps

### Phase 1: Production Code Cleanup

**`src/main.jsx`** (5 items):
- Line 17: Remove unused import `getProgressAtX`
- Line 21: Remove unused import `getPeakX`
- Line 27: Remove unused import `computeDerivedTimers`
- Line 445: Remove unused variable `shoreY`
- Line 843: Remove unused function `drawContours`

**`src/render/marchingSquares.js`** (1 item):
- Line 337: Remove unused function `lerp`

**`src/state/eventStore.js`** (2 items):
- Line 11: Remove unused imports `WAVE_X_SAMPLES`, `WAVE_TYPE`

**`src/ui/DebugPanel.jsx`** (5 items):
- Line 2: Remove unused import `Tooltip`
- Line 212: Remove unused component `Section`
- Line 221: Remove unused component `Toggle`
- Line 237: Remove unused component `Select`
- Line 260: Remove unused component `ReadOnly`

### Phase 2: Stories Cleanup

**`src/stories/FoamRendering.stories.jsx`** (4 items):
- Line 5: Remove unused import `buildIntensityGrid`
- Line 6: Remove unused import `boxBlur`
- Line 77: Remove unused component `SmallCanvas`
- Line 137: Remove unused component `TimelineStrip`

### Phase 3: Test File Cleanup

**`src/main.test.js`** (4 items):
- Line 212: Remove unused variable `posAfterNormal`
- Line 233: Remove unused variable `posBeforeHidden`
- Line 237: Remove unused variable `posAfterRestore`
- Line 243: Remove unused variable `posAfterResume`

**`src/state/backgroundWaveModel.test.js`** (1 item):
- Line 104: Remove unused variable `initialNextTime`

**`src/state/playerProxyModel.test.js`** (1 item):
- Line 91: Remove unused variable `downInput`

**`src/state/setLullModel.test.js`** (1 item):
- Line 13: Remove unused import `getNextWaveAmplitude`

**`src/state/settingsModel.test.js`** (1 item):
- Line 52: Remove unused variable `key`

## Files Affected

| File | Items to Remove |
|------|-----------------|
| `src/main.jsx` | 5 |
| `src/render/marchingSquares.js` | 1 |
| `src/state/eventStore.js` | 2 |
| `src/ui/DebugPanel.jsx` | 5 |
| `src/stories/FoamRendering.stories.jsx` | 4 |
| `src/main.test.js` | 4 |
| `src/state/backgroundWaveModel.test.js` | 1 |
| `src/state/playerProxyModel.test.js` | 1 |
| `src/state/setLullModel.test.js` | 1 |
| `src/state/settingsModel.test.js` | 1 |
| **Total** | **25** |

## Testing

1. `npm run lint` - Should have 0 warnings after cleanup
1. `npm test` - All unit tests pass
1. `npm run test:visual:headless` - Visual tests pass

## Notes

- Phase 1 is highest priority (production code)
- Phase 2-3 are lower priority but improve code hygiene
- Some "unused" test variables may be intentional assertions - verify before deleting
- The DebugPanel components may be future-use - confirm with user before removing
