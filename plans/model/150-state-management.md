# Plan 150: State Management with Event Sourcing

## Vision

Unified state management enabling:
- **Testing**: Replay event sequences deterministically
- **Multiplayer**: Sync events between clients
- **AI Players**: Observe same event stream as humans
- **Debugging**: Time-travel through game states
- **Persistence**: Save/load event log, not raw state

## Current Problems

1. **main.jsx is 1064 lines** - monolithic, hard to test
1. **localStorage is fragile**:
   - No schema versioning
   - Inconsistent defaults (`=== 'true'` vs `!== 'false'`)
   - Saves raw state, not events (schema migration hell)
1. **State scattered** - world object, toggles, timeScale all separate
1. **No event history** - can't replay or debug timing issues

## Architecture

### Option A: Lightweight Event Store (Recommended)

No Redux overhead, just the pattern:

```javascript
// src/state/eventStore.js
const events = [];
let state = initialState;

export function dispatch(event) {
    events.push({ ...event, timestamp: performance.now() });
    state = reducer(state, event);
}

export function getState() { return state; }
export function getEvents() { return [...events]; }
export function replay(eventLog) {
    state = eventLog.reduce(reducer, initialState);
}
```

**Events**:
```javascript
{ type: 'WAVE_SPAWNED', amplitude: 0.8, waveType: 'set' }
{ type: 'WAVE_UPDATED', waveId: 'wave-1', progress: 0.5 }
{ type: 'TOGGLE_CHANGED', key: 'showBathymetry', value: true }
{ type: 'PLAYER_MOVED', x: 100, y: 200 }
```

**Performance**: Minimal - just array push + object spread. State updates are already O(n) for waves.

### Option B: Zustand

Minimal React state manager, no Provider needed:

```javascript
import { create } from 'zustand';

const useGameStore = create((set) => ({
    waves: [],
    spawnWave: (amp, type) => set(state => ({
        waves: [...state.waves, createWave(gameTime, amp, type)]
    })),
}));
```

**Pros**: React integration, devtools
**Cons**: Another dependency, less control over event log

### Option C: Redux Toolkit

```javascript
const gameSlice = createSlice({
    name: 'game',
    initialState,
    reducers: {
        waveSpawned: (state, action) => { ... },
    },
});
```

**Pros**: Familiar, great devtools, middleware ecosystem
**Cons**: More boilerplate, potential perf concerns at 60fps

### Recommendation

**Option A** - lightweight event store. Reasons:
- Zero dependencies
- Full control over performance
- Can add Redux/Zustand later if needed
- Event log is the value, not the framework

## Implementation Phases

### Phase 1: Extract Settings Module
- Create `src/state/settingsModel.js`
- Schema with defaults and types
- Version number for migrations
- Single source of truth for toggles

### Phase 2: Event Store Core
- Create `src/state/eventStore.js`
- Define event types
- Implement dispatch/replay
- Migrate wave spawning to events

### Phase 3: Extract Update Functions
- `src/update/waveUpdater.js`
- `src/update/foamUpdater.js`
- Each responds to events, emits events

### Phase 4: Extract Render Functions
- `src/render/waveRenderer.js`
- `src/render/foamRenderer.js`
- Pure functions: (state, ctx) => void

### Phase 5: Persistence
- Save event log to localStorage (not raw state)
- Schema version in saved data
- Replay on load

## File Structure After Refactor

```
src/
  state/
    eventStore.js      # Core event dispatch/replay
    settingsModel.js   # Toggle schema + persistence
    waveModel.js       # (exists) wave creation/physics
    foamModel.js       # (exists) foam lifecycle
  update/
    waveUpdater.js     # Wave state transitions
    foamUpdater.js     # Foam state transitions
    playerUpdater.js   # Player movement
  render/
    waveRenderer.js    # Draw waves
    foamRenderer.js    # Draw foam
    bathymetryRenderer.js
  main.jsx             # ~200 lines: canvas, game loop, glue
```

## Success Criteria

- [ ] main.jsx under 300 lines
- [ ] Can replay a game session from event log
- [ ] Unit tests can dispatch events and assert state
- [ ] localStorage survives schema changes via replay

## Dependencies

- None (pure refactor)

## Related

- Bugfix: localStorage-wave-schema.md (quick fix for immediate issue)
