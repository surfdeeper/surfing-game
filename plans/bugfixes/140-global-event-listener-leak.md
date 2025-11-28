# 140 - Global Event Listener Leak (HMR/Test Duplication)

**Status**: Proposed  
**Category**: bugfix  
**Depends On**: None

## Problem
`window` listeners are registered in constructors/boot code with no teardown (`resize` in `main.jsx`, key handlers in `KeyboardInput`). Vite HMR and repeated instantiation during tests stack handlers, causing duplicated resize logic and multiple key events per press.

## Proposed Solution
Add lifecycle-safe registration: either guard with singletons or expose cleanup hooks so HMR/test harnesses can remove listeners. Keep runtime behavior identical in production (one set of listeners).

## Implementation Steps
1. Wrap keyboard input in a singleton or export `attachKeyboard`/`detachKeyboard` from `src/input/keyboard.js`; ensure HMR/test reuses or cleans up.
2. For `main.jsx` resize listener, register through a small helper that returns a cleanup function; wire HMR dispose handler to remove it.
3. Add a minimal Vitest case to assert repeated setup does not increase listener counts (use jsdom window event counts or spy).
4. Verify normal gameplay remains unchanged (manual smoke) and lint/tests pass.

## Acceptance Criteria
- Repeated creation of `KeyboardInput` or HMR re-renders does not produce multiple `keydown/keyup` invocations per press.
- Resize handler installs once and is removed on dispose/teardown.
- Tests cover the no-duplication invariant.

## Risks
- Missing cleanup could still leak; mitigate with explicit dispose paths and tests.
