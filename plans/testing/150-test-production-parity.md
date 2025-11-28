# 150 - Test/Production Parity for Wave/Game Logic

**Status**: Proposed  
**Category**: testing  
**Depends On**: tooling/170-unify-production-with-tested-helpers (for shared helpers)

## Problem
`src/main.test.js` re-implements world creation, wave updates, set amplitude curves, and delta clamping inline instead of importing production code. Tests can pass while production diverges, violating the Code Reuse Principle.

## Proposed Solution
Refactor tests to exercise the same modules used in production (state/update helpers). Where functionality is only inline in `main.jsx`, extract to shared helpers and immediately adopt them in `main.jsx` so tests and runtime share one implementation.

## Implementation Steps
1. Identify the production sources for the behaviors under test (wave updates, set/lull amplitude curve, delta clamp). If any live only in `main.jsx`, extract them into existing state/update helpers and import back into `main.jsx`.
2. Update `src/main.test.js` (or new focused specs) to import those helpers instead of duplicating logic. Remove inline implementations from tests.
3. Ensure helpers are used by both tests and production entrypoint (`main.jsx`), deleting duplicated inline code in `main.jsx` where applicable.
4. Add a guard to prevent future drift (lint rule or small script) flagging duplicated helper names in tests that shadow production modules.
5. Run lint and targeted Vitest files to confirm parity.

## Acceptance Criteria
- No inline reimplementation of production logic in tests; tests import and exercise the production helpers.
- `main.jsx` uses the same helpers where extracted; no duplicated algorithms.
- Lint/tests pass; behavior unchanged.

## Risks
- Extraction could shift APIs; mitigate by migrating call sites and updating tests in the same change.
