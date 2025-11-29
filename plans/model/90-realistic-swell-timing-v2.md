# Plan 90 v2: Wave Sets and Lulls (Fixed)

## Problem with v1

The original implementation used a **global amplitude** that affected all waves simultaneously. This is incorrect:
- During lulls, existing waves would flatten (wrong!)
- During sets, all waves would suddenly strengthen (wrong!)

## Correct Real-World Behavior

Each wave is an **individual entity** with its own amplitude:
1. Waves are spawned at the top of the screen
1. Each wave gets an amplitude based on the set/lull state **at spawn time**
1. Waves travel toward shore with their amplitude **unchanged**
1. During lulls: **smaller waves** continue at same period (ocean is never flat)
1. During sets: waves spawned with building/peaking/fading amplitudes

Visual result:
```
LULL (small)   SET (cluster of waves)    LULL (small)
    ▁ ▁ ▁          ▁▂▄█▆▃▁                  ▁ ▁
[subtle waves] [waves traveling]        [subtle waves]
```

**Key principle:** Timing is specified in seconds (source of truth), not pixels. This ensures behavior remains consistent regardless of rendering or speed changes.

## Implementation Changes

### 1. Replace continuous gradient with discrete wave objects

**Old:**
```javascript
world.swellOffset  // single offset for all waves
world.amplitude    // global amplitude (wrong!)
```

**New:**
```javascript
world.waves = []   // array of wave objects
// Each wave: { y: number, amplitude: number }
```

### 2. Wave spawning logic

- Track time since last wave spawn
- Wave period = `swellSpacing / swellSpeed` (e.g., 80/50 = 1.6 seconds)
- During SET: spawn wave every period
- During LULL: don't spawn waves (gap grows)

### 3. Per-wave amplitude assignment

When spawning a wave during a set:
- Calculate progress through set (0 to 1)
- Use existing `calculateSetAmplitude(progress)` to get amplitude
- Store amplitude with the wave object

### 4. Rendering changes

Instead of continuous gradient with global amplitude:
- For each wave in `world.waves`:
  - Draw gradient band centered on wave.y
  - Use wave.amplitude to determine contrast

### 5. Wave lifecycle

- Spawn at y = 0 (top of ocean)
- Move toward shore: `wave.y += swellSpeed * deltaTime`
- Remove when `wave.y > shoreY` (off screen)

## State Machine (simplified)

```
LULL ←→ SET
```

- **LULL**: Smaller waves spawned at same period, timer counts toward next set
- **SET**: Waves spawned with building/peaking/fading amplitude envelope

## Configuration

```javascript
// Wave timing (in seconds) - source of truth
swellPeriod: 15,           // base seconds between waves
periodVariation: 5,        // ±5 seconds variation

const setConfig = {
    wavesPerSet: [4, 8],       // waves spawned per set
    lullWavesPerSet: [2, 4],   // waves during lull (smaller waves)
    lullDuration: 30,          // base seconds between sets
    lullVariation: 5,          // ±5 seconds
    peakPosition: 0.4,         // biggest wave at 40% through set
    minAmplitude: 0.3,         // smallest waves in set
    lullMaxAmplitude: 0.35,    // max amplitude during lull
    lullMinAmplitude: 0.15,    // min amplitude during lull
};
```

## Implementation Steps

1. Add `waves` array to world state
1. Add wave spawn timer and logic
1. Update `updateSetState()` to control spawning (not global amplitude)
1. Modify rendering to iterate over wave objects
1. Add wave cleanup (remove waves past shore)
1. Update tests

## Acceptance Criteria

- [x] Visible gaps during lulls (no new waves at top)
- [x] Visible clusters during sets (waves spawned with varying amplitude)
- [x] Waves on screen continue unchanged when state transitions
- [x] Individual wave amplitude visible in gradient contrast
- [x] Natural rhythm with 4-8 waves per set, 20-60s lulls

## Implementation Summary (Completed)

**Files modified:**
- `src/main.js` - Core wave system rewritten
- `src/main.test.js` - Tests updated for new wave object model

**Key changes to `src/main.js`:**

1. **World state** (lines 29-45): Replaced `swellOffset` and global `amplitude` with:
   - `waves: []` - Array of discrete wave objects `{ y, amplitude }`
   - `wavesSpawned` - Counter for waves spawned in current set

1. **State machine simplified** (lines 142-178): Now just `LULL` and `SET` states
   - `LULL`: Timer counts down, no waves spawned, existing waves continue
   - `SET`: Spawns waves when previous wave has traveled `swellSpacing` distance

1. **Wave spawning** (lines 114-120): `spawnWave(amplitude)` creates wave at `y=0`

1. **Wave movement** (lines 184-191): Each wave moves independently via `wave.y += swellSpeed * deltaTime`

1. **Wave cleanup** (line 191): Waves removed when past shore

1. **Rendering** (lines 211-234): Iterates over `world.waves[]`, each wave renders its own gradient band with its own amplitude-based contrast

**Tests:** 6 tests pass, covering:
- Frame-rate independent wave movement
- Wave cleanup past shore
- Per-wave amplitude preservation
- Amplitude envelope calculation
