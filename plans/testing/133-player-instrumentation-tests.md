# Plan 133: Player Instrumentation Tests

## Overview

Automated tests that drive the player proxy through gameplay scenarios, eliminating the need for manual testing of paddle-out, wave-catching, and other player interactions.

**Status**: Proposal
**Depends On**: Plan 71 (Player Proxy) - player proxy already implemented
**Priority**: Medium - improves iteration speed on gameplay features

---

## Problem

Currently testing player interactions requires:
1. Starting the dev server
2. Pressing `P` to enable player mode
3. Manually navigating with arrow keys
4. Waiting for waves/foam to appear
5. Repeating for different scenarios

This is slow and inconsistent. We need automated tests that simulate player input and verify behavior.

---

## Goals

1. **Simulate player input** - Arrow key presses over time
2. **Control game time** - Fast-forward through lulls, slow down for interactions
3. **Assert player state** - Position, velocity, zone, foam interaction
4. **Verify gameplay loops** - Paddle out, catch wave, get pushed back

---

## Architecture

### Test Harness

Create a headless test environment that:
- Runs the game loop without canvas rendering
- Accepts scripted input sequences
- Advances time in controllable steps
- Exposes player and wave state for assertions

```javascript
// src/testing/PlayerTestHarness.js
export class PlayerTestHarness {
    constructor(config = {}) {
        this.gameState = initializeGameState(config);
        this.playerEnabled = true;
        this.inputState = { left: false, right: false, up: false, down: false };
        this.time = 0;
    }

    // Advance simulation by deltaTime
    tick(dt) {
        this.time += dt;
        updateGame(this.gameState, dt, this.inputState);
    }

    // Advance multiple seconds quickly
    fastForward(seconds, stepsPerSecond = 60) {
        const dt = 1 / stepsPerSecond;
        const steps = seconds * stepsPerSecond;
        for (let i = 0; i < steps; i++) {
            this.tick(dt);
        }
    }

    // Set input state
    pressKey(key) { this.inputState[key] = true; }
    releaseKey(key) { this.inputState[key] = false; }
    releaseAll() {
        this.inputState = { left: false, right: false, up: false, down: false };
    }

    // Query state
    getPlayerPosition() { return { x: this.gameState.player.x, y: this.gameState.player.y }; }
    getPlayerZone() { return getZone(this.gameState.player.y); }
    isInFoam() { return sampleFoamIntensity(this.gameState.player, this.gameState.foamRows) > 0; }
    getWaveCount() { return this.gameState.waves.length; }
    getSetState() { return this.gameState.setState; }
}
```

---

## Test Scenarios

### 1. Basic Movement Tests

```javascript
describe('Player Movement', () => {
    test('player moves toward horizon when up arrow pressed', () => {
        const harness = new PlayerTestHarness();
        const startY = harness.getPlayerPosition().y;

        harness.pressKey('up');
        harness.fastForward(1); // 1 second
        harness.releaseKey('up');

        const endY = harness.getPlayerPosition().y;
        expect(endY).toBeLessThan(startY); // Moved toward horizon (negative Y)
    });

    test('player moves slower in water than on shore', () => {
        const harness = new PlayerTestHarness();

        // Measure shore speed
        harness.gameState.player.y = SHORE_Y + 50; // On shore
        harness.pressKey('up');
        const shoreStart = harness.getPlayerPosition().y;
        harness.fastForward(1);
        const shoreDistance = shoreStart - harness.getPlayerPosition().y;

        // Measure water speed
        harness.releaseAll();
        harness.gameState.player.y = WATER_Y; // In water
        harness.pressKey('up');
        const waterStart = harness.getPlayerPosition().y;
        harness.fastForward(1);
        const waterDistance = waterStart - harness.getPlayerPosition().y;

        expect(shoreDistance).toBeGreaterThan(waterDistance);
    });

    test('diagonal movement is normalized', () => {
        const harness = new PlayerTestHarness();

        // Move up only
        harness.pressKey('up');
        const startY = harness.getPlayerPosition().y;
        harness.fastForward(1);
        const upOnlyDistance = startY - harness.getPlayerPosition().y;
        harness.releaseAll();

        // Reset and move diagonally
        harness.gameState.player.y = startY;
        harness.pressKey('up');
        harness.pressKey('right');
        harness.fastForward(1);
        const diagonalY = startY - harness.getPlayerPosition().y;

        // Diagonal Y component should be less than straight up
        expect(diagonalY).toBeLessThan(upOnlyDistance);
    });
});
```

### 2. Zone Transition Tests

```javascript
describe('Zone Transitions', () => {
    test('zone changes from SHORE to WATER when crossing threshold', () => {
        const harness = new PlayerTestHarness();
        harness.gameState.player.y = SHORE_Y + 10; // Just on shore

        expect(harness.getPlayerZone()).toBe('SHORE');

        harness.pressKey('up');
        harness.fastForward(2); // Move into water

        expect(harness.getPlayerZone()).toBe('WATER');
    });

    test('speed changes immediately on zone transition', () => {
        const harness = new PlayerTestHarness();
        // Position right at threshold
        harness.gameState.player.y = SHORE_Y;

        // Verify speed change occurs at boundary
        // (implementation detail test)
    });
});
```

### 3. Whitewater Interaction Tests

```javascript
describe('Whitewater Interaction', () => {
    test('player gets pushed shoreward when in foam', () => {
        const harness = new PlayerTestHarness();

        // Spawn player in water, create foam at their position
        harness.gameState.player.y = WATER_Y;
        harness.injectFoam(harness.gameState.player.x, harness.gameState.player.y, 0.8);

        const startY = harness.getPlayerPosition().y;
        harness.fastForward(1); // No input, just drift
        const endY = harness.getPlayerPosition().y;

        expect(endY).toBeGreaterThan(startY); // Pushed toward shore (positive Y)
    });

    test('paddling up resists foam push', () => {
        const harness = new PlayerTestHarness();

        harness.gameState.player.y = WATER_Y;
        harness.injectFoam(harness.gameState.player.x, harness.gameState.player.y, 0.5);

        // Without paddling
        const startY = harness.getPlayerPosition().y;
        harness.fastForward(1);
        const driftY = harness.getPlayerPosition().y;
        const driftDistance = driftY - startY;

        // Reset and paddle
        harness.gameState.player.y = startY;
        harness.pressKey('up');
        harness.fastForward(1);
        const paddleY = harness.getPlayerPosition().y;
        const paddleDistance = paddleY - startY;

        // Should drift less (or move outward) when paddling
        expect(paddleDistance).toBeLessThan(driftDistance);
    });

    test('heavy foam reduces movement speed', () => {
        const harness = new PlayerTestHarness();

        // Move in clear water
        harness.gameState.player.y = WATER_Y;
        harness.pressKey('left');
        harness.fastForward(1);
        const clearDistance = Math.abs(harness.getPlayerPosition().x - CANVAS_WIDTH/2);

        // Reset and move in heavy foam
        harness.gameState.player.x = CANVAS_WIDTH / 2;
        harness.injectFoam(harness.gameState.player.x, harness.gameState.player.y, 1.0);
        harness.fastForward(1);
        const foamDistance = Math.abs(harness.getPlayerPosition().x - CANVAS_WIDTH/2);

        expect(foamDistance).toBeLessThan(clearDistance);
    });
});
```

### 4. Full Gameplay Loop Tests

```javascript
describe('Gameplay Loops', () => {
    test('player can paddle out during lull', () => {
        const harness = new PlayerTestHarness();

        // Start on shore
        harness.gameState.player.y = SHORE_Y + 30;

        // Wait for lull state
        while (harness.getSetState() !== 'LULL') {
            harness.fastForward(1);
        }

        // Paddle toward horizon
        harness.pressKey('up');
        harness.fastForward(10); // 10 seconds of paddling

        // Should have made significant progress
        expect(harness.getPlayerPosition().y).toBeLessThan(SHORE_Y - 100);
    });

    test('set waves push player back toward shore', () => {
        const harness = new PlayerTestHarness();

        // Position in lineup
        harness.gameState.player.y = LINEUP_Y;
        const startY = harness.getPlayerPosition().y;

        // Wait for SET state with waves
        while (harness.getSetState() !== 'SET' || harness.getWaveCount() < 2) {
            harness.fastForward(0.5);
        }

        // Wait for foam to reach player (waves break and create whitewater)
        harness.fastForward(20);

        // Player should have been pushed shoreward (without input)
        expect(harness.getPlayerPosition().y).toBeGreaterThan(startY);
    });

    test('complete paddle-out sequence succeeds', () => {
        const harness = new PlayerTestHarness();

        // Start on shore
        harness.gameState.player.y = SHORE_Y + 30;

        // Scripted paddle-out: paddle during lulls, hold position during sets
        for (let i = 0; i < 120; i++) { // 2 minutes max
            if (harness.getSetState() === 'LULL' || !harness.isInFoam()) {
                harness.pressKey('up');
            } else {
                // In foam during set - just hold
                harness.releaseAll();
            }
            harness.fastForward(1);

            // Success: reached lineup
            if (harness.getPlayerPosition().y < LINEUP_Y) {
                break;
            }
        }

        expect(harness.getPlayerPosition().y).toBeLessThan(LINEUP_Y);
    });
});
```

### 5. Edge Case Tests

```javascript
describe('Edge Cases', () => {
    test('player cannot move past screen boundaries', () => {
        const harness = new PlayerTestHarness();

        // Try to move off left edge
        harness.gameState.player.x = 10;
        harness.pressKey('left');
        harness.fastForward(5);

        expect(harness.getPlayerPosition().x).toBeGreaterThanOrEqual(0);
    });

    test('player handles rapid direction changes', () => {
        const harness = new PlayerTestHarness();

        for (let i = 0; i < 100; i++) {
            harness.pressKey(i % 2 === 0 ? 'left' : 'right');
            harness.tick(1/60);
        }

        // Should not throw or produce NaN
        const pos = harness.getPlayerPosition();
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
    });

    test('player physics stable at high time deltas', () => {
        const harness = new PlayerTestHarness();

        harness.pressKey('up');
        harness.tick(0.5); // 500ms frame (lag spike)

        const pos = harness.getPlayerPosition();
        expect(Number.isFinite(pos.x)).toBe(true);
        expect(Number.isFinite(pos.y)).toBe(true);
    });
});
```

---

## Implementation Steps

### Step 1: Create Test Harness
- [ ] Create `src/testing/PlayerTestHarness.js`
- [ ] Extract game loop into testable function
- [ ] Add input state injection
- [ ] Add time control (tick, fastForward)
- [ ] Add foam injection for controlled tests

### Step 2: Refactor for Testability
- [ ] Ensure player physics are pure functions
- [ ] Decouple rendering from state updates
- [ ] Export necessary constants (SHORE_Y, etc.)
- [ ] Add state query helpers

### Step 3: Basic Movement Tests
- [ ] Create `src/state/playerProxy.test.js`
- [ ] Implement direction tests (up/down/left/right)
- [ ] Implement speed tests (shore vs water)
- [ ] Implement diagonal normalization test

### Step 4: Interaction Tests
- [ ] Zone transition tests
- [ ] Whitewater push tests
- [ ] Foam speed penalty tests

### Step 5: Gameplay Loop Tests
- [ ] Paddle-out during lull test
- [ ] Set wave pushback test
- [ ] Full paddle-out sequence test

### Step 6: Edge Cases & Cleanup
- [ ] Boundary tests
- [ ] Stability tests
- [ ] Documentation

---

## Files to Create/Modify

### New Files
- `src/testing/PlayerTestHarness.js` - Headless test environment
- `src/state/playerProxy.test.js` - Player physics unit tests
- `src/integration/playerGameplay.test.js` - Full gameplay loop tests

### Modified Files
- `src/state/playerProxyModel.js` - Ensure pure functions, export constants
- `src/main.js` - Extract game loop for testability (if needed)

---

## Success Criteria

- [ ] 20+ player-related tests
- [ ] Can run full paddle-out scenario in < 1 second test time
- [ ] Tests catch regressions in movement speed, foam interaction
- [ ] No manual testing needed for basic player behavior
- [ ] Tests integrate with existing `npm test` workflow

---

## Future Extensions

- **Wave catching tests** - When wave-riding is implemented (Plan 70)
- **Trick execution tests** - When tricks are added
- **AI opponent tests** - Drive NPC surfers through scenarios
- **Stress tests** - Many players, many waves
- **Replay system** - Record/playback input sequences for regression

---

## Notes

- Tests should be fast - no actual rendering
- Use deterministic random for wave spawns in tests
- Consider snapshot testing for complex state sequences
- This harness can later drive visual regression tests (Playwright)
