# 170 - Unify Production with Tested Helpers

**Status**: Partially Complete / Blocked
**Category**: tooling
**Depends On**: 160 (coordinate consolidation) - ✅ DONE

## Problem
Helpers were extracted and tested (`render/waveRenderer`, `update/index`, `state/settingsModel`, `state/eventStore`), but `src/main.jsx` still contains duplicated, inline implementations. This violates the Code Reuse Principle: tests pass against helpers, yet production runs different code.

## Current State (2024-11)

### ✅ Completed
- **Coordinate utilities consolidated** (Plan 160): `progressToScreenY`, `screenYToProgress`, `getOceanBounds`, `calculateTravelDuration` now live in `coordinates.js` and are imported everywhere else.
- **Dead exports removed** from `render/index.js`
- **waveRenderer.js** imports coordinates from canonical source

### ⚠️ Blocked: Architecture Mismatch
The `update/index.js` orchestrator uses an **event-based pattern** (`{ events, state }`), while `main.jsx` uses **direct state mutation** and imperative function calls (`spawnWave()`, etc.).

**Example mismatch:**
```javascript
// update/index.js returns events
export function updateWaveSpawning(state, ...) {
    const events = [];
    if (setResult.shouldSpawn) {
        events.push({ type: 'WAVE_SPAWN', ... });  // Event, not direct spawn
    }
    return { events, setLullState, backgroundState };
}

// main.jsx calls functions directly
if (setResult.shouldSpawn) {
    spawnWave(amplitude, type);  // Direct mutation
}
```

Migrating would require either:
1. **Change main.jsx to event-based** - significant refactor
2. **Create imperative wrappers** in update/index.js - more code duplication

### 🔮 Feasible Next Steps
1. **Settings migration** (lower risk): Replace inline localStorage in main.jsx with `settingsModel` functions
2. **Partial orchestrator use**: Use `updateWaves()` for filtering/lifecycle (compatible API)

## Original Proposed Solution
Incrementally migrate `main.jsx` to import and use the extracted, tested helpers. Delete duplicated logic once wired. Keep visual parity via existing tests and minimal behavioral changes per step.

## Implementation Steps (Revised)

### Phase 1: Settings Migration (Feasible)
- Replace direct `localStorage` reads/writes with `settingsModel` (`loadSettings`, `toggleSetting`, `updateSetting`, `cycleSetting`, hotkey mapping).
- Map existing hotkeys to schema; persist via `saveSettings`.

### Phase 2: Rendering Consolidation (Feasible)
- Replace `drawWave` and inline color/thickness logic with `renderWaves()` from `src/render/waveRenderer.js`.
- Import via `src/render/index.js` to keep imports tidy.

### Phase 3: Update Orchestrator (Blocked - needs architecture decision)
- Replace inline spawn/refraction/foam lifecycle with functions from `src/update/index.js`
- **Requires**: Either event-based main.jsx or imperative wrappers

### Phase 4: Event Store (Optional - Future)
- Introduce `eventStore` for deterministic state updates in `main.jsx`.
- Dispatch typed events; derive next state via `reducer()`.

### Phase 5: Cleanup
- Delete duplicated inline code after wiring.
- Grep for dead helpers; ensure no exported helpers are unused.

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
