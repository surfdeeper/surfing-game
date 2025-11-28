# Plan 130: Testing Expansion

## Overview

Expand test coverage beyond the current 35 unit tests to include state machine testing, integration tests, and E2E visual tests.

## Current State

### Existing Tests (35 total, all passing)
- `src/state/waveModel.test.js` - 16 tests for time-based wave calculations
- `src/render/coordinates.test.js` - 13 tests for coordinate mapping
- `src/main.test.js` - 6 tests for frame-rate independence and amplitude

### Architecture Context
The codebase uses **time-derived state** (not Redux/event-driven):
- Wave position = `f(spawnTime, currentTime, travelDuration)`
- Pure functions in `waveModel.js` and `coordinates.js`
- State mutations only in `main.js` orchestrator
- No dispatch/events - direct function calls in game loop

---

## Phase 1: Extract Set/Lull State Machine

**Goal:** Move set/lull logic from `main.js` into a testable pure function module.

### Step 1.1: Create `src/state/setLullModel.js`

Extract the following from `main.js`:
- `setState` transitions (LULL ↔ SET)
- `setTimer` / `lullTimer` advancement
- `wavesInCurrentSet` / `totalWavesInSet` tracking
- `nextWaveTime` calculation
- Amplitude envelope logic

**Target API:**
```javascript
// Pure function: takes current state + deltaTime, returns new state
export function updateSetLullState(state, deltaTime) {
  // Returns: { setState, setTimer, lullTimer, wavesInCurrentSet, ... }
}

// Pure function: determines if a wave should spawn
export function shouldSpawnWave(state, gameTime) {
  // Returns: boolean
}

// Pure function: calculates amplitude for next wave in set
export function getSetAmplitude(waveIndex, totalWaves, config) {
  // Returns: amplitude 0.0-1.0
}
```

### Step 1.2: Update `main.js` to use extracted functions

Replace inline logic with calls to `setLullModel.js` functions.

---

## Phase 2: Set/Lull State Machine Unit Tests

**Goal:** Comprehensive tests for state transitions and timing.

### Step 2.1: Create `src/state/setLullModel.test.js`

#### State Transition Tests
- [ ] `LULL → SET` transition occurs after `lullDuration` elapses
- [ ] `SET → LULL` transition occurs after all waves in set spawn
- [ ] State remains `LULL` before `lullDuration` elapses
- [ ] State remains `SET` while waves still pending

#### Timing Tests
- [ ] `setTimer` increments correctly during SET state
- [ ] `lullTimer` increments correctly during LULL state
- [ ] Timers reset on state transition

#### Wave Count Tests
- [ ] `totalWavesInSet` respects min/max config (4-8 waves)
- [ ] `wavesInCurrentSet` increments on each spawn
- [ ] `wavesInCurrentSet` resets on new set

#### Spawn Timing Tests
- [ ] Waves spawn at `swellPeriod` intervals (15s base)
- [ ] Spawn timing includes ±5s variation
- [ ] No spawn during LULL state (except mini-sets)

#### Amplitude Envelope Tests
- [ ] First wave in set has lower amplitude
- [ ] Peak amplitude at ~40% through set
- [ ] Last wave in set has lower amplitude
- [ ] Lull waves use reduced amplitude range (0.15-0.35)

---

## Phase 3: Integration Tests

**Goal:** Test multiple modules working together over simulated time.

### Step 3.1: Create `src/integration/gameLoop.test.js`

#### Full Cycle Tests
- [ ] Complete LULL → SET → LULL cycle in simulated time
- [ ] Multiple sets spawn over 5-minute simulation
- [ ] Wave count stays bounded (old waves removed)

#### Wave Lifecycle Tests
- [ ] Wave spawns at correct screen position (horizon)
- [ ] Wave progresses toward shore over `travelDuration`
- [ ] Wave removed from array after passing shore
- [ ] Memory doesn't leak over extended simulation

#### State + Render Integration
- [ ] Multiple concurrent waves have correct relative positions
- [ ] Newer waves are closer to horizon than older waves
- [ ] Wave positions are monotonically ordered by spawnTime

---

## Phase 4: Tab Visibility Tests

**Goal:** Test the tab visibility fix (commit dca8a2c).

### Step 4.1: Add to `src/main.test.js`

- [ ] Game pauses when tab hidden (deltaTime capped)
- [ ] Game resumes smoothly when tab visible
- [ ] Large time gaps don't cause wave position jumps
- [ ] `lastTime` resets correctly on visibility change

---

## Phase 5: E2E Visual Tests (Playwright)

**Goal:** Verify visual correctness in real browser.

### Step 5.1: Fix existing `tests/smoke.spec.js` config issues

### Step 5.2: Add visual tests to `tests/visual.spec.js`

#### Canvas Rendering Tests
- [ ] Waves render as horizontal gradients
- [ ] Wave color contrast correlates with amplitude
- [ ] Ocean background renders correctly
- [ ] Sky/horizon renders correctly

#### Animation Tests
- [ ] Waves move downward (toward camera) over time
- [ ] Movement speed is consistent (no jitter)
- [ ] New waves appear at horizon

#### Debug Panel Tests
- [ ] State indicator shows current SET/LULL
- [ ] Wave count updates in real-time
- [ ] Timer displays update

---

## Phase 6: Edge Case & Error Tests

**Goal:** Handle boundary conditions gracefully.

### Step 6.1: Add edge case tests across modules

#### Coordinate Edge Cases
- [ ] Zero-height ocean doesn't divide by zero
- [ ] Negative progress clamps to 0
- [ ] Progress > 1 clamps to 1
- [ ] Canvas resize preserves coordinate mapping

#### Timing Edge Cases
- [ ] Zero deltaTime doesn't break updates
- [ ] Very large deltaTime (lag spike) is handled
- [ ] Negative deltaTime is rejected/clamped

#### State Edge Cases
- [ ] Empty waves array renders without error
- [ ] 100+ waves doesn't crash or slow down
- [ ] Rapid state transitions don't cause issues

---

## Implementation Order

| Phase | Priority | Effort | Dependencies |
|-------|----------|--------|--------------|
| Phase 1 | High | Medium | None |
| Phase 2 | High | Medium | Phase 1 |
| Phase 3 | Medium | Medium | Phase 1, 2 |
| Phase 4 | Medium | Low | None |
| Phase 5 | Low | High | Phase 1-4 |
| Phase 6 | Low | Low | None |

**Recommended approach:**
1. Start with Phase 1 (extract) + Phase 2 (unit tests) together
2. Add Phase 4 (tab visibility) as quick win
3. Add Phase 3 (integration) for confidence
4. Phase 5 & 6 as polish

---

## Success Criteria

- [ ] 80+ total tests (up from 35)
- [ ] Set/Lull state machine fully tested
- [ ] Integration tests cover full game cycles
- [ ] Tab visibility fix has regression tests
- [ ] E2E tests catch visual regressions
- [ ] All tests pass in CI

---

## Files to Create/Modify

### New Files
- `src/state/setLullModel.js` - Extracted state machine
- `src/state/setLullModel.test.js` - State machine tests
- `src/integration/gameLoop.test.js` - Integration tests
- `tests/visual.spec.js` - E2E visual tests

### Modified Files
- `src/main.js` - Use extracted setLullModel functions
- `src/main.test.js` - Add tab visibility tests
- `tests/smoke.spec.js` - Fix config issues

---

## Notes

- The time-based architecture makes testing much easier than mutation-based
- Pure functions can be tested without canvas/DOM dependencies
- Integration tests simulate time by calling update() repeatedly
- E2E tests need real browser but provide visual confidence
