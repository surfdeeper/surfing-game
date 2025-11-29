# 140 - Redux Integration Testing

## Problem
We need consistent, behavior-first tests for Redux/RTK apps that use real stores and network mocking, while avoiding over-mocking Redux internals. Current tests largely target custom event-store modules; when adopting Redux/RTK, we must preserve the “tests exercise production code” principle.

## Proposed Solution
Adopt a standard Redux testing toolkit: `renderWithProviders` + real `configureStore`, MSW for network, and optional thunk isolation via `unwrap()`. Favor UI assertions with Testing Library and reserve direct store assertions for critical invariants.

## Implementation Steps
1. Utilities
   - Add `test/utils/renderWithProviders.js` (RTL wrapper + `setupStore`).
   - Add `test/msw/server.js` and `test/setup-tests.js` lifecycle hooks.
1. Store Wiring
   - Consolidate reducers in `src/state/rootReducer.js` (or equivalent) for testing.
   - Expose `setupStore` for thunk/RTKQ isolation tests.
1. Async/Network
   - Replace ad-hoc fetch mocks with MSW handlers per test.
   - Keep `onUnhandledRequest: 'error'` in CI.
1. RTK Query
   - Exercise data fetching via UI and MSW; avoid `setupListeners` unless under test.
1. Assertions
   - Prefer `findBy*` and `waitFor` over manual timers; verify UI state.
   - Allow direct store checks when validating critical state transitions.
1. Docs
   - Add `.claude/skills/testing/redux-integration.md` (this skill).
   - Update `plans/testing/110-testing-strategy.md` to reference Redux approach.

## Acceptance Criteria
- Tests for a Redux-connected component run with a real store via `renderWithProviders`.
- MSW is configured and used in at least one networked test.
- No tests mock `useSelector`/`useDispatch` or RTK internals.
- CI passes (`npm run lint`, `npm test`).

## Risks & Mitigations
- Flaky async: use `findBy*` and deterministic MSW handlers.
- Serializable warnings: configure `serializableCheck` ignores as needed.
- Over-coupled tests: keep to behavior-first UI assertions.

## References
- React-Redux Testing: <https://react-redux.js.org/using-react-redux/testing>
- RTK Testing: <https://redux-toolkit.js.org/usage/writing-tests>
- RTK Query Testing: <https://redux-toolkit.js.org/rtk-query/usage/testing>
- MSW: <https://mswjs.io/docs>
