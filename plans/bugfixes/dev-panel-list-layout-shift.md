# Bug: Dev Panel List Layout Shift

**Status**: Proposed
**Depends On**: —

## Symptom
The Dev Tools panel displays a dynamic list of waves. Rows change height and new items cause items below to jump around. Scrolling becomes janky when waves spawn/exit. Progress bars contribute to variable row height.

## Expected Behavior
The panel remains stable:
- Rows have fixed height and do not change once rendered.
- The panel uses an inner scrollable container; surrounding layout stays fixed.
- No CSS transitions fight 60 fps updates; animation is limited to width changes for progress bars.

## Root Cause Analysis
- Variable-height rows and CSS transitions cause reflow on every update.
- The list’s container participates in normal document flow; insertions/removals change its height, shifting content below.
- Unstable React keys (e.g., index) can force remounts and amplify layout churn.
- Updates may occur at frame rate without throttling, increasing reflow frequency.
- Dev panel may be using ad-hoc derived data rather than stable selectors shared with production code.

## Proposed Fix
- Establish a stability contract for the panel:
  - Use a fixed-height container with `overflow: auto` for the list.
  - Implement fixed-height rows (e.g., CSS grid or flex with explicit heights); prevent content expansion.
  - Use stable keys: `wave.id` only; never indices.
  - Remove CSS transitions on frequently updated properties; animate only width of bars.
  - Throttle panel re-render to ~10–15 Hz aligned with selectors/tick, not every animation frame.
- Optionally add simple virtualization if wave count exceeds ~200.
- Apply the Code Reuse Principle: consume the same selectors/helpers the production UI uses to compute “waves in field,” avoiding duplicate logic.

## Files Affected
- src/ui/DebugPanel.jsx
- src/ui/DebugPanel.css
- src/main.jsx
- src/state/selectors/wavesInField.js (or equivalent selector to be centralized)

## Testing
- Unit: selector ordering and stable keys (`wave.id`).
- Visual/E2E: verify fixed container height with inner scroll; no layout shifts on spawn/exit. Use `npm run test:visual:headless` and update baselines via `npm run test:visual:update:headless` if needed.
- Performance: confirm no CSS transitions on rapidly updated rows; FPS remains stable.
- Lint first for fast feedback: `npm run lint`.
