# Bug: Debug Panel Circular Progress Shows Impossible State (120/106)

## Bug Report

The circular progress bars in the debug panel display impossible values like "120/106" for `timeSinceLastWave / nextWaveTime`. The progress bars also change colors randomly without matching their fill percentage.

**Expected behavior**:
- Wave timer should show countdown to next wave (e.g., "8.3s / 15.0s")
- Set timer should show countdown to end of current set/lull
- `timeSinceLastWave` should always be ≤ `nextWaveTime` during normal operation

**Actual behavior**:
- Shows "120.0s / 106.0s" - timer exceeds total
- Progress bar fill is correct (clamped to 100%) but text shows raw impossible values

## Root Cause

The bug has two contributing factors:

### 1. Derived state stored in localStorage
`saveGameState()` persists the entire `setLullState` object including derived timer values (`setTimer`, `timeSinceLastWave`, `setDuration`, `nextWaveTime`). When `loadGameState()` restores this, the timers can be in impossible states because:
- Save happens at arbitrary times (every ~1 second)
- Timers may have accumulated past their thresholds before the state machine processes them
- Load bypasses state machine validation entirely

### 2. Timers stored as accumulated values
The state machine stores `timeSinceLastWave` and `setTimer` as accumulated values that grow each frame. This design requires careful reset on transitions, and any save/load breaks the invariants.

## Solution: Don't Store Derived State

Refactor to compute timers on-the-fly rather than storing them.

### Current State Structure
```javascript
{
    setState: 'SET',           // Essential: which state
    setTimer: 45.2,            // Derived: time in current state
    setDuration: 60.0,         // Derived: randomly chosen duration
    currentSetWaves: 5,        // Essential: waves in this set
    wavesSpawned: 3,           // Essential: waves spawned so far
    timeSinceLastWave: 8.3,    // Derived: accumulated since spawn
    nextWaveTime: 15.0,        // Derived: randomly chosen interval
}
```

### New State Structure
```javascript
{
    setState: 'SET',           // Essential: which state
    stateStartTime: 12340.0,   // Absolute game time when state started
    setDuration: 60.0,         // Keep: needed for UI display
    currentSetWaves: 5,        // Essential: waves in this set
    wavesSpawned: 3,           // Essential: waves spawned so far
    lastWaveSpawnTime: 12385.0,// Absolute game time of last spawn
    nextWaveTime: 15.0,        // Keep: needed for UI display
}
```

### Key Changes

1. **Replace accumulated timers with absolute timestamps**
   - `setTimer` → computed as `gameTime - stateStartTime`
   - `timeSinceLastWave` → computed as `gameTime - lastWaveSpawnTime`

2. **Compute derived values on-demand**
   ```javascript
   // In DebugPanel or wherever needed
   const setTimer = gameTime - setLullState.stateStartTime;
   const timeSinceLastWave = gameTime - setLullState.lastWaveSpawnTime;
   ```

3. **Update localStorage to not persist derived values**
   - Only save: `setState`, `stateStartTime`, `setDuration`, `currentSetWaves`, `wavesSpawned`, `lastWaveSpawnTime`, `nextWaveTime`
   - On load, timers are automatically correct because they're computed from absolute times

4. **Update setLullModel.js**
   - `initializeLull()`: Set `stateStartTime = gameTime`
   - `initializeSet()`: Set `stateStartTime = gameTime`
   - `recordWaveSpawned()`: Set `lastWaveSpawnTime = gameTime`
   - `shouldSpawnWave()`: Compare `gameTime - lastWaveSpawnTime >= nextWaveTime`
   - `updateSetLullState()`: Pass `gameTime` parameter, remove timer accumulation

5. **Update DebugPanel**
   - Receive `gameTime` as prop
   - Compute `setTimer` and `timeSinceLastWave` on render

## Files to Modify

1. **src/state/setLullModel.js**
   - Change state structure to use absolute timestamps
   - Update all functions to use gameTime instead of deltaTime accumulation
   - `updateSetLullState(state, gameTime, config)` instead of `updateSetLullState(state, deltaTime, config)`

2. **src/main.jsx**
   - Pass `gameTime` to `updateSetLullState()`
   - Pass `gameTime` to `<DebugPanel>`
   - Update `saveGameState()` / `loadGameState()` (derived values auto-computed)

3. **src/ui/DebugPanel.jsx**
   - Accept `gameTime` prop
   - Compute `setTimer` and `timeSinceLastWave` from absolute timestamps

4. **src/state/setLullModel.test.js**
   - Update tests for new function signatures
   - Test with absolute game times instead of deltaTime

5. **src/ui/DebugPanel.test.jsx**
   - Update tests to pass `gameTime` prop
   - Test that computed values are always valid

## Testing

1. Play game normally - verify timers display correctly
2. Refresh page mid-game - verify timers resume correctly (not impossible state)
3. Switch tabs and return - verify no impossible state
4. Run existing tests - verify all pass with new structure

## Benefits

- **No impossible states**: Timers are always computed fresh from absolute times
- **Save/load works correctly**: Absolute times survive serialization
- **Tab visibility safe**: No accumulated deltaTime issues
- **Simpler state machine**: No need to carefully reset timers on transitions
- **Easier debugging**: State contains timestamps that are meaningful on their own
