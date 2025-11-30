# 170 - Unify Production with Tested Helpers

**Status**: Phase 4 Complete (Event Store Migration)
**Category**: tooling
**Depends On**: 160 (coordinate consolidation) - ✅ DONE

## Problem
Helpers were extracted and tested (`render/waveRenderer`, `update/index`, `state/settingsModel`, `state/eventStore`), but `src/main.jsx` still contains duplicated, inline implementations. This violates the Code Reuse Principle: tests pass against helpers, yet production runs different code.

## Current State (2024-11-28)

### ✅ Completed
- **Coordinate utilities consolidated** (Plan 160): `progressToScreenY`, `screenYToProgress`, `getOceanBounds`, `calculateTravelDuration` now live in `coordinates.js` and are imported everywhere else.
- **Dead exports removed** from `render/index.js`
- **waveRenderer.js** imports coordinates from canonical source
- **Update orchestrator migration (Phase 3)**: main.jsx now uses event-based pattern:
  - `updateWaveSpawning()` returns events, main.jsx processes them via `EventType.WAVE_SPAWN`
  - `updateWaves()` handles wave lifecycle (filtering + refraction)
  - `depositFoam()`, `updateFoamLifecycle()`, `depositFoamRows()`, `updateFoamRowLifecycle()` handle foam
  - `updatePlayer()` handles player/AI updates
- **Unused imports cleaned up**: Removed `getActiveWaves`, `updateWaveRefraction`, `isWaveBreaking`, `isWaveBreakingWithEnergy`, `createFoam`, `updateFoam`, `getActiveFoam`, `screenYToProgress`, `drainEnergyAt`, `updatePlayerProxy`, `updateAIPlayer`

### 🔮 Remaining Steps (Optional)
1. **Settings to store**: Migrate settings from `settingsModel` to `eventStore` for unified state
1. **Further extraction**: Extract FPS tracking, game state persistence to separate modules
1. **Goal**: main.jsx target is <300 lines (currently 577)

## Original Proposed Solution
Incrementally migrate `main.jsx` to import and use the extracted, tested helpers. Delete duplicated logic once wired. Keep visual parity via existing tests and minimal behavioral changes per step.

## Implementation Steps (Revised)

### Phase 1: Settings Migration ✅ DONE
- Replaced direct `localStorage` reads/writes with `settingsModel` (`loadSettings`, `toggleSetting`, `updateSetting`, `cycleSetting`, hotkey mapping).
- Keyboard handler now uses `getSettingForHotkey()` for schema-driven hotkey lookup.
- `timeScale` now managed via settings model with `cycleSetting()`.
- Removed 42 lines of inline localStorage code from main.jsx (894 → 852 lines).

### Phase 2: Rendering Consolidation ✅ DONE
- Replaced inline `drawWave()` (65 lines) with `renderWaves()` from `src/render/waveRenderer.js`.
- Removed duplicate color helpers (`hexToRgb`, `rgbToHex`, `getWaveColors`) from main.jsx.
- Moved wave color palettes to waveRenderer.js (single source of truth).
- Updated waveRenderer.js color algorithm to match original main.jsx behavior.
- Updated waveRenderer.test.js to reflect hex format and trough-only variation.
- Removed 120 lines from main.jsx (852 → 732 lines).

### Phase 3: Update Orchestrator ✅ DONE
- Adopted event-based pattern: `updateWaveSpawning()` returns events, main.jsx processes them
- Migrated wave lifecycle to `updateWaves()`
- Migrated foam to `depositFoam()`, `updateFoamLifecycle()`, `depositFoamRows()`, `updateFoamRowLifecycle()`
- Migrated player to `updatePlayer()`
- Cleaned up unused imports

### Phase 4: Event Store ✅ DONE
- Replaced direct world mutations with `store.dispatch()` calls
- Added event types: `GAME_TICK`, `WAVE_SPAWN`, `WAVES_UPDATE`, `SET_LULL_UPDATE`, `BACKGROUND_UPDATE`, `FOAM_SEGMENTS_UPDATE`, `FOAM_ROWS_UPDATE`, `PLAYER_UPDATE`, `AI_UPDATE`
- All state changes now go through the reducer for deterministic updates
- Removed `createWave` import from main.jsx (handled by reducer)
- main.jsx reduced from 609 → 577 lines (-32 lines)

### Phase 5: Cleanup (Partial)
- ✅ Deleted duplicated inline update code
- Pending: Settings and rendering consolidation

## Acceptance Criteria
- `main.jsx` imports and uses: `renderWaves`, update functions from `update/index`, and settings from `settingsModel`.
- Duplicate logic removed from `main.jsx`.
- All tests and lint pass.
- Visual behavior remains consistent (verified by visual tests where applicable).

## Risks & Mitigations
- Visual drift: migrate in small steps; run visual/unit tests between steps.
- API mismatch: adapt world state to helper signatures; update tests if APIs change intentionally.

## Follow-ups
- ✅ Add CI check/workflow to flag exported-but-unused helpers → **See Plan 250** (`npm run check:dead-code`)
- ✅ Event store adopted - game state now flows through `store.dispatch()` and reducer
- Future: Enable event replay for debugging/testing deterministic game sessions

## Related: Automated Detection (Plan 250)

For ongoing detection of test/production drift, use the duplicate-code-analysis agent:
```bash
npm run check:duplicates         # Quick scan
npm run check:duplicates:report  # HTML report
```
The agent also detects helpers used only in tests but not production.
