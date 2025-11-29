# Plan 124: Add Bathymetry (Ocean Floor Depth)

## Status: ✅ Complete (Revision 2)

### Revision Notes
The initial implementation had foam triangles attached to wave transforms, which looked wrong. This revision corrects the approach:
- Breaking onset must be **depth-based**, not progress-based
- Foam/whitewater must be **decoupled from waves** - independent entities
- Peel must **propagate laterally** along bathymetry contour

---

## Why This Is Next

Per GPT feedback, the dependency order for realistic wave physics is:

1. ✅ Lock 2D timing model (done - sets/lulls/spawn-per-wave)
1. ✅ Unified wave array (done - plan 125)
1. ✅ Bathymetry (this plan - complete)
1. Shoaling (height changes with depth)
1. Breaking logic
1. Peeling logic

---

## Architecture: Waves vs Foam

### Key Insight: Foam is NOT Part of the Wave

The wave line and the whitewater are **separate entities**:

| Wave Line | Whitewater/Foam |
|-----------|-----------------|
| Moves at swell speed | Moves at its own speed (slower) |
| Exists from horizon to shore | Spawns at break point, persists independently |
| Has amplitude/type | Has position, width, opacity, decay |
| Rendered as gradient band | Rendered as expanding trail |

### Data Model

```js
// Wave (existing, minimal changes)
wave = {
    id, spawnTime, amplitude, type,
    // Remove: breaking, breakX, foamWidth (these belong to foam)
}

// NEW: Whitewater segment (independent entity)
foam = {
    id,
    spawnTime,           // when this foam was created
    x,                   // x position (normalized 0-1)
    y,                   // y position (screen coords, moves toward shore)
    width,               // current width (expands over time)
    opacity,             // fades over time (1.0 → 0)
    sourceWaveId,        // which wave spawned this (for debugging)
}

// World state
world.waves = [...]      // wave lines
world.foamSegments = []  // independent whitewater entities
```

---

## Implementation Phases

### Phase 1: Bathymetry Model ✅ (Done)

```js
// bathymetryModel.js - already implemented
getDepth(normalizedX) → depth in meters
getPeakX() → x position of shallowest point
shouldBreak(waveHeight, depth) → boolean (H > 0.78d)
amplitudeToHeight(amplitude) → height in meters
```

### Phase 2: Depth-Based Breaking Detection

Check breaking condition **per x-position** along the wave:

```js
function checkBreakingAtX(wave, normalizedX, progress, bathymetry) {
    // Get depth at this x position
    const depth = getDepth(normalizedX, bathymetry);

    // Convert amplitude to wave height
    const waveHeight = amplitudeToHeight(wave.amplitude);

    // Wave breaks when H > 0.78 * d
    // Also require minimum progress (wave must be close enough to shore)
    const minProgress = 0.4; // Don't break too far from shore

    return progress > minProgress && shouldBreak(waveHeight, depth);
}
```

### Phase 3: Foam Spawning (Decoupled from Wave)

When breaking detected, spawn an **independent foam entity**:

```js
function spawnFoam(wave, x, y) {
    return {
        id: `foam-${nextFoamId++}`,
        spawnTime: world.gameTime,
        x: x,                    // fixed x position
        y: y,                    // starts at wave's y, then moves independently
        width: 0.02,             // initial width
        opacity: 1.0,            // starts fully opaque
        sourceWaveId: wave.id,
    };
}
```

### Phase 4: Foam Update (Independent Movement)

Foam moves toward shore and expands/fades **independently of the parent wave**:

```js
function updateFoam(foam, deltaTime) {
    // Move toward shore (slower than waves)
    const foamSpeed = 30; // pixels per second (slower than wave speed of 50)
    foam.y += foamSpeed * deltaTime;

    // Expand width over time
    foam.width = Math.min(0.3, foam.width + 0.001 * deltaTime);

    // Fade over time
    const age = (world.gameTime - foam.spawnTime) / 1000; // seconds
    foam.opacity = Math.max(0, 1 - age / 5); // fade over 5 seconds
}
```

### Phase 5: Peel Propagation

Breaking spreads **laterally along the bathymetry contour**:

```js
function updatePeel(wave, bathymetry, deltaTime) {
    // If wave is breaking, check adjacent x positions
    // Spawn new foam segments where depth triggers breaking
    // This creates the "peel" effect - break spreading along the wave

    const peelSpeed = 0.05; // how fast break spreads laterally (per second)
    // ... spawn foam at newly-breaking x positions
}
```

### Phase 6: Foam Rendering (Trail, Not Triangle)

Draw foam as persistent trail, not attached to wave:

```js
function drawFoam(foam) {
    if (foam.opacity <= 0) return;

    const centerX = foam.x * canvas.width;
    const halfWidth = (foam.width * canvas.width) / 2;

    // Draw as horizontal band (whitewater), not triangle
    ctx.fillStyle = `rgba(255, 255, 255, ${foam.opacity * 0.8})`;
    ctx.fillRect(centerX - halfWidth, foam.y, halfWidth * 2, 15);

    // Optional: add texture/noise for more realistic foam
}
```

---

## Visual Behavior

### Before (Wrong)
```
Wave line ─────────────────────
              ▲ (triangle attached to wave, moves with it)
```

### After (Correct)
```
Wave line ─────────────────────  (wave continues moving)

              ░░░░░  ← foam trail (stays behind, fades)
              ░░░░░░░
              ░░░░░░░░░  ← older foam (more faded, wider)
```

The wave line passes through. Foam spawns at break point and **stays behind** as the wave continues toward shore. Multiple foam segments create a trail.

---

## What We're NOT Doing (Yet)

- ❌ Curving the wave lines (shoaling first)
- ❌ Per-x-position wave speed differences
- ❌ Complex foam particle systems
- ❌ Realistic shoaling height changes
- ❌ Sound effects

---

## Testing

### Unit Tests
```js
describe('depth-based breaking', () => {
    it('breaks over shallow water with sufficient amplitude', () => {
        // depth=2m, waveHeight=2m → should break (2 > 0.78*2)
        expect(shouldBreak(2, 2)).toBe(true);
    });

    it('does not break in deep water', () => {
        // depth=20m, waveHeight=2m → should not break (2 < 0.78*20)
        expect(shouldBreak(2, 20)).toBe(false);
    });
});

describe('foam lifecycle', () => {
    it('foam fades over time', () => {
        const foam = spawnFoam(wave, 0.4, 400);
        updateFoam(foam, 3); // 3 seconds
        expect(foam.opacity).toBeLessThan(1);
    });

    it('foam moves independently of wave', () => {
        const foam = spawnFoam(wave, 0.4, 400);
        const initialY = foam.y;
        updateFoam(foam, 1);
        expect(foam.y).toBeGreaterThan(initialY);
    });
});
```

### Visual Tests
- Foam appears when wave reaches shallow water (not fixed progress)
- Foam stays behind as wave continues
- Multiple foam segments create a trail
- Foam fades and eventually disappears
- Break spreads laterally (peel visible)

---

## Files to Modify

- `src/state/waveModel.js` - Remove breaking state from wave (move to foam)
- `src/state/foamModel.js` - NEW: Foam entity and lifecycle
- `src/state/bathymetryModel.js` - Already done ✅
- `src/main.js` - Add foam array, update loop, render loop

---

## Success Criteria

1. Breaking triggered by depth, not progress threshold
1. Foam exists as independent entity, not attached to wave
1. Foam trail persists after wave passes
1. Peel propagates laterally along bathymetry
1. Visual looks like real whitewater, not a sliding triangle
