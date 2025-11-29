# Plan 152: Extract Update Functions

## Problem

`main.jsx` has a 260-line `update()` function handling:
- Wave spawning (set waves, background waves)
- Wave lifecycle (active filtering, refraction)
- Foam generation and updates
- Energy field updates
- Player/AI movement
- Lull state machine

This is hard to test and reason about.

## Current State

```javascript
// main.jsx update() - ~260 lines
function update(deltaTime) {
    // Update game time
    // Set wave lull state machine
    // Background wave spawning
    // Filter active waves
    // Update wave refraction
    // Deposit foam at break points
    // Update foam lifecycle
    // Update energy field
    // Update player position
    // Run AI decision loop
}
```

## Proposed Structure

```
src/update/
  index.js              # Re-exports, main update orchestrator
  waveSpawner.js        # Set/background wave spawning logic
  waveUpdater.js        # Refraction, lifecycle
  foamUpdater.js        # Foam generation, decay
  energyUpdater.js      # Energy field simulation
  playerUpdater.js      # Player movement, input handling
  aiUpdater.js          # AI decision making
```

## Event-Driven Design (for Plan 150)

Each updater can emit and consume events:

```javascript
// waveSpawner.js
export function updateWaveSpawning(state, deltaTime, dispatch) {
    if (shouldSpawnSetWave(state)) {
        dispatch({ type: 'WAVE_SPAWN', amplitude: 0.8, waveType: 'set' });
    }
}

// Reducer handles the event
case 'WAVE_SPAWN':
    return {
        ...state,
        waves: [...state.waves, createWave(state.gameTime, action.amplitude, action.waveType)]
    };
```

## Implementation Steps

1. **Create `src/update/waveSpawner.js`**
   - Extract set wave lull state machine
   - Extract background wave spawning
   - Pure function: `(state, deltaTime) => events[]`

1. **Create `src/update/waveUpdater.js`**
   - Wave lifecycle (active filtering)
   - Wave refraction updates
   - Pure function: `(waves, deltaTime, bathymetry) => waves`

1. **Create `src/update/foamUpdater.js`**
   - Foam generation at break points
   - Foam decay/removal
   - Uses existing `foamModel.js`

1. **Create `src/update/energyUpdater.js`**
   - Energy field propagation
   - Energy draining at breaks
   - Uses existing `energyField.js`

1. **Create `src/update/playerUpdater.js`**
   - Keyboard input handling
   - Position updates
   - Uses existing `playerProxyModel.js`

1. **Create `src/update/aiUpdater.js`**
   - AI state machine
   - Decision making
   - Uses existing `aiPlayerModel.js`

1. **Create `src/update/index.js`**
   - Orchestrates all updaters
   - Single entry point for main.jsx

1. **Update main.jsx `update()`**
   - Import and call orchestrator
   - Should be ~20 lines

## Testing Benefits

```javascript
// waveSpawner.test.js
it('spawns set wave after lull period', () => {
    const state = { gameTime: 0, setLullState: createInitialState() };
    const events = updateWaveSpawning(state, 5000); // 5 second jump
    expect(events).toContainEqual({ type: 'WAVE_SPAWN', waveType: 'set' });
});
```

## Success Criteria

- [ ] main.jsx `update()` under 30 lines
- [ ] Each updater has unit tests
- [ ] Updaters are pure functions (no side effects)
- [ ] Can run update loop without canvas (headless testing)

## Dependencies

- Plan 150: State Management (optional but enhances testability)
- Existing models: waveModel.js, foamModel.js, setLullModel.js

## Related

- Plan 151: Render Extraction (parallel effort)
