# Bug: Wave Progress Bars Stuck at 100%

**Status**: Proposed
**Depends On**: —

## Symptom
Progress bars for each wave in the Dev Tools panel display at 100% and do not change throughout the wave lifecycle.

## Expected Behavior
Each wave’s progress bar reflects lifecycle progress from spawn to exit, advancing from 0% to 100% and resetting when the wave is removed.

## Root Cause Analysis
- UI may read an incorrect or stale value rather than an authoritative progress computation.
- `travelDuration` may not match the simulation’s duration or is not consistently propagated.
- CSS may clamp or force bar width to full (e.g., `min-width` or flex issues).
- Panel renders at frame rate while progress calculation is decoupled or not recomputed against current time.
- Duplicate logic between dev panel and production code leads to divergence; tests may cover a helper not used by the dev panel.

## Proposed Fix
- Centralize progress computation in the model layer:
  - Implement/confirm `getWaveProgress(wave, now, travelDuration)` that returns a clamped 0..1 based on lifecycle timestamps and expected duration.
  - Use the same helper in both production UI and Dev Tools (Code Reuse Principle).
- Ensure `main.jsx` or a selector computes and passes `progress` and `travelDuration` for `displayWaves`, and the Dev Panel consumes these values directly.
- Map progress to visual width: `width = clamp01(progress) * 100%`; remove CSS rules that force 100%.
- Ensure `travelDuration` equals the simulation’s `calculateTravelDuration` source of truth.
- Throttle UI updates to ~10–15 Hz for smooth, stable bars without layout thrash.

## Files Affected
- src/state/waveModel.js (or the authoritative progress helper/selector)
- src/state/selectors/getWaveProgress.js (if separated for reuse)
- src/ui/DebugPanel.jsx
- src/ui/DebugPanel.css
- src/main.jsx

## Testing
- Unit: deterministic progress across timestamps and phases; monotonic 0→1 and reset on exit.
- Integration: DebugPanel bar width reflects provided `progress` and does not clamp to 100%.
- Visual/E2E: headless visual tests show bars advancing over time; update baselines via `npm run test:visual:update:headless` if needed.
- Run linter first: `npm run lint`, then `npm test` for unit coverage.
