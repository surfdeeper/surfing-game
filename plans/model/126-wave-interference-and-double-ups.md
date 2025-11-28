# Wave Interference & Double-Ups

Status: proposal
Owner: agents
Depends on: 100-multiple-swells.md, 125-unified-wave-array.md

## Goal
Introduce physically-informed interference (superposition of swell trains) to produce constructive “double-ups” and optional gameplay-oriented merging of near-coincident waves, while keeping the unified waves array intact and breaking logic unchanged.

## Rationale
- The codebase has a unified `waves` array but no mechanics for superposition or merging.
- Physics-first amplitude comes from multiple swell trains at spawn time; amplitude stays fixed after spawn.
- Optional heuristic merge can enhance gameplay by combining closely spaced waves into a single higher-amplitude “doubleUp”.

## Scope
In-scope:
- Swell aggregator module providing combined amplitude from N swell trains over time.
- Integration of aggregator at spawn points for set and background waves.
- Optional post-spawn proximity-based merge into a single wave (tagged `type: 'doubleUp'`).
Out-of-scope:
- Changes to rendering pipeline beyond amplitude-based visuals.
- Deep fluid dynamics; keep a simplified but tunable interference model.

## Design

### Data
- Unified waves array elements:
  - `id`: unique
  - `spawnTime`: number
  - `type`: `'set' | 'background' | 'doubleUp'`
  - `amplitude`: number (fixed after spawn)
  - `period`: number (seconds)
  - `phase`: number (radians at spawn)
  - `breakState`: existing fields (`isBreaking`, `breakStartTime`, etc.)

### Modules
1) `src/state/swellModel.js`
   - `configureSwells(swells)`: Set array of swell trains; each `{ amplitude, period, direction?, phase0 }`.
   - `combinedAmplitude(t)`: Return scalar amplitude via superposition: \( A(t) = \sum_i A_i \sin(\omega_i t + \phi_i) \), clamped to `[0, A_max]`.
   - `sampleWaveParams(t)`: Returns `{ amplitude, period, phase }` for the next spawned wave.

2) `src/state/waveModel.js` (integration)
   - Use set/background timing models to decide spawn times.
   - On spawn, call `swellModel.sampleWaveParams(now)` to set `amplitude` (and optionally `period`, `phase`).
   - Append to unified `waves` array.
   - Optional: run `mergeNearCoincident(waves)` to combine close neighbors.

3) `mergeNearCoincident(waves)` (helper)
   - Criteria: time proximity `|spawnTime_i - spawnTime_j| < T_merge` and position proximity if available.
   - Merge rule: Replace pair with single wave:
     - `type: 'doubleUp'`
     - `amplitude = clamp(ampl_i + ampl_j, 0, A_max)`
     - `spawnTime = min(spawnTime_i, spawnTime_j)`
     - Prefer earlier `phase`/`period` or weighted average.
   - Complexity: bucketed by spawn time to keep near O(n).

### Parameters (tunable)
- `A_max`: amplitude ceiling (e.g., 1.0)
- `T_merge`: merge window (e.g., 0.75s)
- Swell config default: two trains with distinct `period` and `phase0` to produce visible “double-ups”.

## Rendering & Breaking
- Rendering continues to reflect amplitude (line thickness, contrast). Higher `amplitude` produces stronger visuals.
- Breaking model uses existing amplitude influence; increased amplitude advances break onset naturally.

## Testing
1) Unit: `src/state/swellModel.test.js`
   - `combinedAmplitude()` shows constructive peaks when configured swells align.
   - Amplitude clamping works; period/phase sampling consistent.

2) State: `src/state/waveModel.test.js`
   - Spawned waves pull amplitude from `swellModel` (not channel-only).
   - Optional: when merge enabled, assert `type: 'doubleUp'` appears for near-coincident spawns.

3) Integration: `src/integration/gameLoop.test.js`
   - With two configured swells, some waves attain higher amplitude than either train individually.
   - Fixed amplitude after spawn affects breaking timing as expected.

4) Visual/E2E: `tests/visual.spec.js`
   - Snapshot or threshold check for stronger bands during constructive interference windows.

## Migration & Backcompat
- Keep set/background timing intact; only amplitude source changes.
- Feature flags:
  - `enableInterference`: default `true`.
  - `enableProximityMerge`: default `false`.

## Tasks
1. Implement `swellModel` with config + `combinedAmplitude()` + `sampleWaveParams()`.
2. Thread `swellModel` into `waveModel` spawn path for amplitude.
3. Add optional proximity merge helper.
4. Write unit/state/integration tests.
5. Update docs: `docs/wave-physics.md` with a brief on superposition.
6. Tune parameters by visual pass; set sensible defaults.

## Risks
- Over-merging reduces set rhythm; keep merge disabled by default.
- Amplitude spikes may cause overly rapid breaking; clamp and tune.

## Open Questions
- Should destructive interference lower amplitude below background baseline?
- Do we need directional components (phase offsets along x) now or later?
