# Plan 110: Testing Strategy

## Goal

Establish a minimal but robust testing approach that:
1. Protects the fragile timing/physics layer with deterministic unit tests
1. Allows visual verification for subjective "does it look right?" aspects
1. Prevents AI refactoring from breaking core behavior

## Unit Tests (Deterministic)

### 1. Timing Tests

Ensure lull and set durations behave correctly.

```javascript
// Lull → Set transition
it("transitions from LULL to SET after lullDuration", () => {
  startLull();
  world.setDuration = 2; // 2 seconds

  simulateTime(1);
  expect(world.setState).toBe("LULL");

  simulateTime(1);
  expect(world.setState).toBe("SET");
});

// Set completion
it("completes a set after the correct number of waves", () => {
  startSet();
  world.currentSetWaves = 4;
  simulateUntilSetEnds();

  expect(world.wavesSpawned).toBe(4);
  expect(world.setState).toBe("LULL");
});
```

### 2. Spawn Logic Tests

```javascript
// Waves spawn with correct timing
it("spawns waves at correct period during SET", () => {
  startSet();
  world.swellPeriod = 15;
  world.periodVariation = 0; // no variation for test

  simulateTime(30);
  expect(world.waves.length).toBe(2); // one at 0, one at 15
});

// Lulls still spawn (smaller) waves
it("spawns smaller waves during LULL", () => {
  startLull();
  simulateTime(30);

  expect(world.waves.length).toBeGreaterThan(0);
  world.waves.forEach(w => {
    expect(w.amplitude).toBeLessThanOrEqual(world.setConfig.lullMaxAmplitude);
  });
});
```

### 3. Per-Wave Behavior Tests

```javascript
// Waves move independently
it("each wave moves independently", () => {
  spawnWave(0.5);
  spawnWave(0.8);
  const [a, b] = world.waves;

  simulateTime(1);

  expect(a.y).toBeGreaterThan(0);
  expect(b.y).toBeGreaterThan(0);
  expect(a.amplitude).toBe(0.5); // unchanged
  expect(b.amplitude).toBe(0.8); // unchanged
});

// Amplitude preserved on state change
it("existing waves keep amplitude when state changes", () => {
  spawnWave(0.4);
  startSet(); // state changes

  expect(world.waves[0].amplitude).toBe(0.4);
});
```

### 4. Cleanup Tests

```javascript
it("removes waves that pass the shore", () => {
  spawnWave(0.3);
  world.waves[0].y = 1000; // past shore

  update(0.016);
  expect(world.waves.length).toBe(0);
});
```

## Visual Testing (Integration)

For subjective "does it look like an ocean?" verification:

### 1. Debug UI Overlay

Already implemented. Shows:
- Current state (LULL/SET)
- Waves spawned / total
- Time until next state
- Wave count bar

### 2. Slow Motion Mode (Future)

```javascript
if (debugSlowMo) deltaTime *= 0.1;
```

### 3. Frame-by-Frame Stepping (Future)

- Press → to advance one frame
- Print debug data each frame

### 4. GIF Recording (Future)

Record 10-second clips for before/after comparison.

## Test Coverage Summary

**Unit tests protect:**
- Timing (set/lull transitions)
- Spawn rules (when and how waves appear)
- Amplitude preservation (waves don't change after spawn)
- Wave motion (frame-rate independent)
- Cleanup (memory management)

**Visual tests verify:**
- Spacing rhythm
- Set/lull "feel"
- Gradient correctness
- Overall ocean aesthetic

## Implementation Status

- [x] Basic timing tests exist
- [x] Wave movement tests exist
- [x] Amplitude envelope tests exist
- [ ] Add timing transition tests
- [ ] Add spawn period tests
- [ ] Add slow motion debug mode
- [ ] Add frame stepping
