# 170 - Unify Production with Tested Helpers

**Status**: Phase 3 Complete
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

### 🔮 Remaining Steps
1. **Settings migration** (Phase 1): Replace inline localStorage with `settingsModel`
2. **Rendering consolidation** (Phase 2): Replace `drawWave` with `renderWaves()` from waveRenderer

## Original Proposed Solution
Incrementally migrate `main.jsx` to import and use the extracted, tested helpers. Delete duplicated logic once wired. Keep visual parity via existing tests and minimal behavioral changes per step.

## Implementation Steps (Revised)

### Phase 1: Settings Migration (Pending)
- Replace direct `localStorage` reads/writes with `settingsModel` (`loadSettings`, `toggleSetting`, `updateSetting`, `cycleSetting`, hotkey mapping).
- Map existing hotkeys to schema; persist via `saveSettings`.

### Phase 2: Rendering Consolidation (Pending)
- Replace `drawWave` and inline color/thickness logic with `renderWaves()` from `src/render/waveRenderer.js`.
- Import via `src/render/index.js` to keep imports tidy.

### Phase 3: Update Orchestrator ✅ DONE
- Adopted event-based pattern: `updateWaveSpawning()` returns events, main.jsx processes them
- Migrated wave lifecycle to `updateWaves()`
- Migrated foam to `depositFoam()`, `updateFoamLifecycle()`, `depositFoamRows()`, `updateFoamRowLifecycle()`
- Migrated player to `updatePlayer()`
- Cleaned up unused imports

### Phase 4: Event Store (Optional - Future)
- Introduce `eventStore` for deterministic state updates in `main.jsx`.
- Dispatch typed events; derive next state via `reducer()`.

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
- Add CI check/workflow to flag exported-but-unused helpers.
- Consider adopting `eventStore` fully for replayable game sessions.
