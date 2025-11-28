# Plan 137: App State Management & Testing Architecture

## Problem Statement

Bug #135 revealed fundamental gaps in how the app manages state:

1. **State persisted as unvalidated JSON blob** - No schema, no migration, no validation
2. **Unit tests use fresh state** - Never test with persisted/corrupted data
3. **Playwright tests clear localStorage** - Always start fresh, never test persistence
4. **Silent failures** - `undefined` becomes `NaN`, comparisons silently fail

This isn't just a testing problem - it's an **architecture problem**.

---

## Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        main.jsx                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  world = {                                           │    │
│  │    gameTime,                                         │    │
│  │    waves: [],                                        │    │
│  │    foamSegments: [],                                 │    │
│  │    setLullState: { ... },    ← can have missing fields    │
│  │    backgroundState: { ... },                         │    │
│  │    playerProxy: { ... },                             │    │
│  │  }                                                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  localStorage.setItem('gameState', JSON.stringify)   │    │
│  │  localStorage.getItem('gameState') → JSON.parse      │    │
│  │  NO VALIDATION                                       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Problems

| Issue | Risk | Example |
|-------|------|---------|
| No schema version | Can't migrate old data | Adding new field breaks old saves |
| No field validation | Silent NaN | `undefined - number = NaN` |
| No type coercion | Wrong types | `"123"` vs `123` from JSON |
| Blob save/load | All or nothing | Can't partially recover |
| No error boundaries | Cascading failures | One bad field breaks game |

---

## Proposed Architecture

### Option A: Validation Layer (Minimal Change)

Add validation at load time without changing storage format.

```javascript
// src/state/persistence.js
export const STATE_VERSION = 2;

export function loadGameState() {
  const saved = localStorage.getItem('gameState');
  if (!saved) return null;

  try {
    const raw = JSON.parse(saved);
    return {
      version: raw.version ?? 1,
      gameTime: validateNumber(raw.gameTime, 0),
      waves: validateArray(raw.waves, []),
      setLullState: validateSetLullState(raw.setLullState),
      // ...
    };
  } catch (e) {
    console.error('Failed to load state, resetting:', e);
    return null;
  }
}

function validateSetLullState(state) {
  if (!state) return createInitialState();
  return {
    setState: state.setState ?? 'LULL',
    stateStartTime: validateNumber(state.stateStartTime, 0),
    lastWaveSpawnTime: validateNumber(state.lastWaveSpawnTime, 0),
    // ... all fields with defaults
  };
}

function validateNumber(value, defaultValue) {
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
}
```

### Option B: Formal Schema with Migrations

Add versioning and migration system.

```javascript
// src/state/schema.js
export const SCHEMAS = {
  1: {
    // Original schema (no lastWaveSpawnTime)
    setLullState: {
      setState: { type: 'string', default: 'LULL' },
      setDuration: { type: 'number', default: 0 },
      // ...
    }
  },
  2: {
    // Added absolute timestamps
    setLullState: {
      setState: { type: 'string', default: 'LULL' },
      stateStartTime: { type: 'number', default: 0 },
      lastWaveSpawnTime: { type: 'number', default: 0 },
      // ...
    }
  }
};

export const MIGRATIONS = {
  '1→2': (state, gameTime) => ({
    ...state,
    setLullState: {
      ...state.setLullState,
      stateStartTime: gameTime,
      lastWaveSpawnTime: gameTime,
    }
  })
};
```

### Option C: Separate Concerns (Best Long-term)

Split state into layers with different persistence strategies.

```javascript
// Ephemeral (never saved)
const ephemeralState = {
  gameTime: 0,
  waves: [],           // Derived from time, regenerate on load
  foamSegments: [],    // Visual effect, regenerate
};

// Session (saved to sessionStorage, cleared on browser close)
const sessionState = {
  timeScale: 1,
  toggles: { ... },
};

// Persistent (saved to localStorage with validation)
const persistentState = {
  version: 2,
  setLullState: { ... },  // Resume where player left off
  playerConfig: { ... },  // Player preferences
};
```

---

## Testing Strategy

### Layer 1: Unit Tests (Pure Functions)

Already have these. Add defensive input tests:

```javascript
// Test that functions handle malformed input
it('handles undefined fields gracefully', () => {
  const result = shouldSpawnWave({}, 1000);
  expect(typeof result).toBe('boolean');
});
```

### Layer 2: Persistence Tests (New)

Test the save/load cycle:

```javascript
describe('persistence layer', () => {
  it('validates and repairs corrupted state', () => {
    const corrupted = { setLullState: { setState: 'SET' } }; // missing fields
    const loaded = loadGameState(JSON.stringify(corrupted));
    expect(loaded.setLullState.lastWaveSpawnTime).toBeDefined();
  });

  it('migrates old schema versions', () => {
    const v1State = { version: 1, setLullState: { setState: 'LULL' } };
    const migrated = loadGameState(JSON.stringify(v1State));
    expect(migrated.version).toBe(2);
    expect(migrated.setLullState.lastWaveSpawnTime).toBeDefined();
  });
});
```

### Layer 3: Playwright Tests with Persistence Scenarios

**Currently all Playwright tests do `localStorage.clear()` first.**

Add tests that DON'T clear, or inject corrupted state:

```javascript
test.describe('State Persistence', () => {
  test('recovers from corrupted localStorage', async ({ page }) => {
    // Inject corrupted state BEFORE page loads
    await page.addInitScript(() => {
      localStorage.setItem('gameState', JSON.stringify({
        gameTime: 100000,
        setLullState: {
          setState: 'SET',
          wavesSpawned: 4,
          currentSetWaves: 6,
          // MISSING: lastWaveSpawnTime - the bug!
        }
      }));
    });

    await page.goto('/');
    await expect(page.locator('#game')).toBeVisible();

    // Game should recover and waves should spawn
    await page.waitForFunction(
      () => window.world?.waves?.filter(w => w.type === 'set').length > 4,
      { timeout: 10000 }
    );
  });

  test('continues from saved state after reload', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/');

    // Speed up and wait for waves
    for (let i = 0; i < 3; i++) await page.keyboard.press('t');
    await page.waitForFunction(
      () => window.world?.waves?.filter(w => w.type === 'set').length > 0,
      { timeout: 15000 }
    );

    // Get state before reload
    const stateBefore = await page.evaluate(() => ({
      gameTime: window.world.gameTime,
      setWaves: window.world.waves.filter(w => w.type === 'set').length,
      state: window.world.setLullState.setState,
    }));

    // Reload page (simulates closing and reopening)
    await page.reload();
    await expect(page.locator('#game')).toBeVisible();

    // State should be restored
    const stateAfter = await page.evaluate(() => ({
      gameTime: window.world.gameTime,
      state: window.world.setLullState.setState,
    }));

    // gameTime should be close to where we left off
    expect(stateAfter.gameTime).toBeGreaterThan(stateBefore.gameTime * 0.9);
  });

  test('handles localStorage with outdated schema', async ({ page }) => {
    // Inject v1 schema (before timestamps were added)
    await page.addInitScript(() => {
      localStorage.setItem('gameState', JSON.stringify({
        version: 1,
        gameTime: 50000,
        setLullState: {
          setState: 'SET',
          setTimer: 10,  // Old field name
          wavesSpawned: 2,
          currentSetWaves: 5,
        }
      }));
    });

    await page.goto('/');

    // Should not crash, should recover
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.waitForTimeout(3000);
    expect(errors).toEqual([]);

    // State machine should be functional
    const state = await page.evaluate(() => window.world?.setLullState);
    expect(state.lastWaveSpawnTime).toBeDefined();
  });
});
```

---

## Implementation Plan

### Phase 1: Immediate Fixes (Done)
- [x] Add `??` defaults to all state field access
- [x] Fix `shouldSpawnWave` to handle undefined

### Phase 2: Validation Layer
- [ ] Create `src/state/persistence.js` with validation functions
- [ ] Add `validateSetLullState()`, `validateBackgroundState()`, etc.
- [ ] Update `loadGameState()` to use validation
- [ ] Add schema version number

### Phase 3: Test Coverage
- [ ] Add persistence unit tests
- [ ] Add Playwright tests for corrupted state scenarios
- [ ] Add Playwright tests for reload continuity
- [ ] Add Playwright tests for schema migration

### Phase 4: Architecture Improvements (Optional)
- [ ] Separate ephemeral vs persistent state
- [ ] Add migration system for schema changes
- [ ] Consider TypeScript for compile-time safety

---

## Success Criteria

- [ ] No `NaN` can propagate through state calculations
- [ ] Old localStorage data auto-migrates or resets safely
- [ ] Playwright tests cover persistence scenarios
- [ ] Game recovers gracefully from any corrupted state

---

## Key Insight

**The bug revealed a testing blind spot**: Playwright tests clearing localStorage means they never test the persistence layer. The fix isn't just "test persistence" - it's recognizing that:

1. **Fresh state tests** → test the logic
2. **Persisted state tests** → test the integration
3. **Corrupted state tests** → test the error handling

All three are needed for confidence.
