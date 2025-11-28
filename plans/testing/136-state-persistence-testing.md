# Plan 136: State Persistence Testing

## Problem Statement

Bug #135 revealed that state loaded from localStorage can have missing fields (`lastWaveSpawnTime: undefined`), causing `NaN` in arithmetic and silent failures. Unit tests didn't catch this because they always construct valid state objects.

### Root Cause Analysis

1. **Tests construct ideal state** - All unit tests create state with all fields present
2. **No schema validation** - `loadGameState()` blindly restores state without validation
3. **No migration tests** - No tests for loading old state formats
4. **Silent arithmetic failures** - `undefined - number = NaN`, and `NaN >= x` is always `false`

## Testing Gaps Identified

| Gap | Example | Risk |
|-----|---------|------|
| Missing field handling | `lastWaveSpawnTime: undefined` | State machine freezes |
| Schema evolution | Old state without new fields | Silent failures |
| Serialization round-trip | Save/load corrupts state | Data loss |
| Type coercion | String timestamps from JSON | Incorrect calculations |

---

## Phase 1: Defensive State Validation

### Step 1.1: Add `validateSetLullState()` function

```javascript
// src/state/setLullModel.js
export function validateSetLullState(state, gameTime) {
  return {
    setState: state.setState ?? STATE.LULL,
    stateStartTime: state.stateStartTime ?? gameTime,
    setDuration: state.setDuration ?? 0,
    currentSetWaves: state.currentSetWaves ?? 0,
    wavesSpawned: state.wavesSpawned ?? 0,
    lastWaveSpawnTime: state.lastWaveSpawnTime ?? gameTime,
    nextWaveTime: state.nextWaveTime ?? 0,
  };
}
```

### Step 1.2: Use validation on load

```javascript
// src/main.jsx
if (state.setLullState) {
  world.setLullState = validateSetLullState(state.setLullState, world.gameTime);
}
```

---

## Phase 2: Missing Field Tests

### Step 2.1: Add to `setLullModel.test.js`

```javascript
describe('defensive handling of malformed state', () => {
  it('shouldSpawnWave handles undefined lastWaveSpawnTime', () => {
    const state = {
      wavesSpawned: 0,
      currentSetWaves: 5,
      nextWaveTime: 15
      // lastWaveSpawnTime intentionally omitted
    };
    // Should not throw, should treat as 0
    expect(shouldSpawnWave(state, sec(20))).toBe(true);
  });

  it('shouldSpawnWave handles null lastWaveSpawnTime', () => {
    const state = {
      lastWaveSpawnTime: null,
      wavesSpawned: 0,
      currentSetWaves: 5,
      nextWaveTime: 15
    };
    expect(shouldSpawnWave(state, sec(20))).toBe(true);
  });

  it('computeDerivedTimers handles missing timestamps', () => {
    const state = {}; // All fields missing
    const derived = computeDerivedTimers(state, sec(100));
    expect(derived.setTimer).toBe(100);
    expect(derived.timeSinceLastWave).toBe(100);
    expect(Number.isNaN(derived.setTimer)).toBe(false);
    expect(Number.isNaN(derived.timeSinceLastWave)).toBe(false);
  });

  it('updateSetLullState handles legacy state without timestamps', () => {
    const legacyState = {
      setState: 'SET',
      wavesSpawned: 2,
      currentSetWaves: 5,
      // Missing: stateStartTime, lastWaveSpawnTime
    };
    // Should not throw
    const result = updateSetLullState(legacyState, sec(100), DEFAULT_CONFIG);
    expect(result.state).toBeDefined();
  });
});
```

---

## Phase 3: Serialization Round-Trip Tests

### Step 3.1: Create `src/state/persistence.test.js`

```javascript
describe('state persistence', () => {
  it('setLullState survives JSON round-trip', () => {
    const original = createInitialState(DEFAULT_CONFIG, Math.random, sec(50));
    const json = JSON.stringify(original);
    const restored = JSON.parse(json);

    // Verify all fields preserved
    expect(restored.setState).toBe(original.setState);
    expect(restored.stateStartTime).toBe(original.stateStartTime);
    expect(restored.lastWaveSpawnTime).toBe(original.lastWaveSpawnTime);
    expect(restored.nextWaveTime).toBe(original.nextWaveTime);
  });

  it('restored state produces valid spawn decisions', () => {
    const original = createInitialState(DEFAULT_CONFIG, Math.random, sec(50));
    const json = JSON.stringify(original);
    const restored = JSON.parse(json);

    // Advance time and verify spawning works
    const gameTime = sec(100);
    const result = updateSetLullState(restored, gameTime, DEFAULT_CONFIG);
    expect(result.state.setState).toBeDefined();
    // Should not produce NaN
    const derived = computeDerivedTimers(result.state, gameTime);
    expect(Number.isNaN(derived.timeSinceLastWave)).toBe(false);
  });

  it('handles partial state from older version', () => {
    // Simulate state from before lastWaveSpawnTime was added
    const legacyState = {
      setState: 'LULL',
      setDuration: 30,
      currentSetWaves: 3,
      wavesSpawned: 0,
      nextWaveTime: 15,
      // Missing: stateStartTime, lastWaveSpawnTime (added later)
    };

    const validated = validateSetLullState(legacyState, sec(100));
    expect(validated.lastWaveSpawnTime).toBe(sec(100));
    expect(validated.stateStartTime).toBe(sec(100));
  });
});
```

---

## Phase 4: Integration Test for Load/Save Cycle

### Step 4.1: Add to `src/integration/gameLoop.test.js`

```javascript
describe('state persistence integration', () => {
  it('game continues correctly after simulated page reload', () => {
    // Run game for a while
    let state = { setLullState: createInitialState(config, randomFn, 0) };
    for (let i = 0; i < 1000; i++) {
      const result = updateSetLullState(state.setLullState, i * 100, config);
      state.setLullState = result.state;
    }

    // Simulate save/load
    const saved = JSON.stringify(state);
    const loaded = JSON.parse(saved);

    // Continue running
    for (let i = 1000; i < 1100; i++) {
      const result = updateSetLullState(loaded.setLullState, i * 100, config);
      loaded.setLullState = result.state;
      // Should never produce NaN
      expect(Number.isNaN(result.state.stateStartTime)).toBe(false);
      expect(Number.isNaN(result.state.lastWaveSpawnTime)).toBe(false);
    }
  });
});
```

---

## Phase 5: Property-Based Testing (Optional)

### Step 5.1: Add fast-check for fuzz testing

```javascript
import * as fc from 'fast-check';

describe('property-based state validation', () => {
  it('shouldSpawnWave never throws regardless of input', () => {
    fc.assert(
      fc.property(
        fc.record({
          lastWaveSpawnTime: fc.oneof(fc.integer(), fc.constant(undefined), fc.constant(null)),
          nextWaveTime: fc.oneof(fc.float(), fc.constant(undefined)),
          wavesSpawned: fc.oneof(fc.integer(), fc.constant(undefined)),
          currentSetWaves: fc.oneof(fc.integer(), fc.constant(undefined)),
        }),
        fc.integer(),
        (state, gameTime) => {
          // Should never throw
          const result = shouldSpawnWave(state, gameTime);
          return typeof result === 'boolean';
        }
      )
    );
  });
});
```

---

## Implementation Checklist

- [ ] Add `??` defaults to all state field access in setLullModel.js
- [ ] Create `validateSetLullState()` function
- [ ] Update `loadGameState()` to use validation
- [ ] Add missing field tests to setLullModel.test.js
- [ ] Add serialization round-trip tests
- [ ] Add integration test for reload cycle
- [ ] (Optional) Add property-based tests with fast-check

---

## Success Criteria

- [ ] All tests pass with undefined/null state fields
- [ ] `NaN` never appears in derived values
- [ ] Old localStorage data loads without breaking
- [ ] New fields have sensible defaults when missing

---

## Related

- Bug #135: Set waves not appearing (caused by undefined lastWaveSpawnTime)
- Plan 130: Testing Expansion (general testing strategy)
