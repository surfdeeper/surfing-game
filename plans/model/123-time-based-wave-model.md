# Plan 123: Time-Based Wave Model & State/Render Separation

## Problem

The current architecture has several issues that make testing difficult:

1. **Mutable position** - Wave `y` is mutated each frame, not derived from time
2. **No separation of concerns** - Game state and rendering are intertwined in `main.js`
3. **Can't unit test with fake timers** - Position depends on accumulated frame deltas, not absolute time
4. **Screen-coupled coordinates** - Waves use pixel positions, tightly coupled to canvas dimensions

## Goal

Create a testable game state layer where:
- Wave position is a **pure function of time**: `position = f(spawnTime, currentTime, speed)`
- State is separate from rendering
- Unit tests can use fake timers to advance time and assert positions
- Coordinates are abstract (0-1 range), mapped to screen pixels only at render time

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Game State (Pure Data + Pure Functions)                     │
│  - Immutable wave objects: { id, spawnTime, amplitude }      │
│  - Position derived: getWavePosition(wave, currentTime)      │
│  - No DOM/canvas dependencies                                │
│  - Testable with fake timers                                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Coordinate Mapper                                           │
│  - Maps abstract position (0-1) to screen pixels             │
│  - Handles canvas resize                                     │
│  - Pure functions: abstractToScreen(pos, canvasDimensions)   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Renderer                                                    │
│  - Reads game state                                          │
│  - Uses coordinate mapper                                    │
│  - Draws to canvas                                           │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### Current (Mutable)
```js
wave = {
    y: 150,           // mutated each frame
    amplitude: 0.8
}

// Update loop mutates position
wave.y += speed * deltaTime;
```

### Proposed (Time-Based)
```js
wave = {
    id: 'wave-1',
    spawnTime: 1000,  // ms since game start (immutable)
    amplitude: 0.8
}

// Position is derived, never stored
function getWaveProgress(wave, currentTime, travelDuration) {
    const elapsed = currentTime - wave.spawnTime;
    return Math.min(1, elapsed / travelDuration);  // 0 = horizon, 1 = shore
}
```

### Coordinate System
```js
// Abstract coordinates (0-1 range)
// progress = 0: wave at horizon (top of ocean)
// progress = 1: wave at shore (bottom of ocean)

// Map to screen
function progressToScreenY(progress, oceanTop, oceanBottom) {
    return oceanTop + progress * (oceanBottom - oceanTop);
}
```

## File Structure

```
src/
  state/
    gameState.js      # State container + update functions
    waveModel.js      # Wave data model + pure functions
    waveModel.test.js # Unit tests with fake timers
  render/
    renderer.js       # Canvas rendering
    coordinates.js    # Abstract → screen mapping
  main.js             # Wiring: creates state, renderer, runs loop
```

## Implementation Steps

### Phase 1: Extract Wave Model
1. Create `src/state/waveModel.js` with:
   - `createWave(spawnTime, amplitude)` - factory function
   - `getWaveProgress(wave, currentTime, travelDuration)` - pure position calc
   - `isWaveComplete(wave, currentTime, travelDuration)` - check if past shore
2. Create `src/state/waveModel.test.js` with fake timer tests

### Phase 2: Extract Game State
1. Create `src/state/gameState.js` with:
   - State container (waves array, set/lull state, timing)
   - `updateState(state, currentTime)` - pure state transition
   - `getVisibleWaves(state, currentTime)` - filter active waves
2. Move set/lull logic from `main.js`

### Phase 3: Coordinate Mapping
1. Create `src/render/coordinates.js` with:
   - `progressToScreenY(progress, bounds)`
   - `screenYToProgress(y, bounds)`
2. Unit tests for coordinate mapping

### Phase 4: Extract Renderer
1. Create `src/render/renderer.js`
2. Move all `ctx.*` calls from `main.js`
3. Renderer receives state + coordinates, outputs to canvas

### Phase 5: Wire Together
1. Simplify `main.js` to:
   - Create state
   - Create renderer
   - Game loop: update state with current time, render

## Testing Strategy

### Unit Tests (Vitest + Fake Timers)
```js
import { vi, describe, it, expect } from 'vitest';
import { createWave, getWaveProgress } from './waveModel.js';

describe('waveModel', () => {
    it('wave at spawn time has progress 0', () => {
        const wave = createWave(1000, 0.8);
        const progress = getWaveProgress(wave, 1000, 5000);
        expect(progress).toBe(0);
    });

    it('wave at half travel time has progress 0.5', () => {
        const wave = createWave(1000, 0.8);
        const progress = getWaveProgress(wave, 3500, 5000);
        expect(progress).toBe(0.5);
    });

    it('wave past travel time has progress 1', () => {
        const wave = createWave(1000, 0.8);
        const progress = getWaveProgress(wave, 7000, 5000);
        expect(progress).toBe(1);
    });
});
```

### Integration Tests
- Test full state transitions over time
- Test coordinate mapping with various canvas sizes

### E2E Tests (Playwright)
- Verify visual rendering matches expected state
- Can inject controlled time for deterministic tests

## Benefits

1. **Testable** - Unit test wave positions without canvas/browser
2. **Deterministic** - Same time input = same output, always
3. **Debuggable** - Can "rewind" by using past timestamps
4. **Decoupled** - Renderer can be swapped (Canvas 2D → Three.js)
5. **Serializable** - Game state can be saved/restored/synced (multiplayer prep)

## Migration Path

Can be done incrementally:
1. Add new modules alongside existing code
2. Test new modules
3. Gradually move logic from `main.js` to new modules
4. Delete old mutable code once new path works

## Out of Scope

- Three.js / WebGL rendering (future plan)
- Multiplayer synchronization (plan 120)
- Wave physics (shoaling, breaking) - those use the new model once it exists
