# Plan 140: Energy Field Wave Model

Status: in-progress
Owner: agents
Depends on: 124-bathymetry.md
Supersedes: Partially supersedes discrete wave spawning (waves become derived, not primary)

## Vision

Replace the discrete wave array as the **source of truth** with a continuous 2D energy field. Waves become emergent phenomena - peaks traveling through the field - rather than spawned objects.

Key insight: **Waves are energy, not water.** The energy field models this directly.

## Benefits

1. **Natural wave combination**: When two energy peaks meet, they superpose automatically
1. **Period-based speed**: Longer wavelengths travel faster (dispersion) - emerges from the physics
1. **Double-ups**: Constructive interference creates larger waves naturally
1. **Refraction**: Energy slows in shallow water, causing bending - unified with propagation
1. **Realistic feel**: Ocean feels like connected fluid, not separate "wave objects"

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     ENERGY FIELD                             │
│  2D grid of height values, updated each frame via wave eq   │
│  - Swell sources inject energy at horizon                   │
│  - Energy propagates shoreward at depth-dependent speed     │
│  - Natural superposition when waves meet                    │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            ▼               ▼               ▼
      ┌──────────┐   ┌────────────┐   ┌───────────┐
      │ Renderer │   │Wave Detect │   │  Breaking │
      │          │   │            │   │           │
      │ Draw the │   │ Find peaks │   │ H > 0.78d │
      │ field as │   │ → discrete │   │ triggers  │
      │ gradient │   │   "waves"  │   │ foam      │
      │ bands    │   │ for UI/    │   │           │
      │          │   │ gameplay   │   │           │
      └──────────┘   └────────────┘   └───────────┘
```

## Data Structures

### Energy Field

```javascript
// The field is a 2D array of height values
// X: across the screen (0 = left, width = right)
// Y: depth into ocean (0 = horizon, height = shore)

const FIELD_WIDTH = 120;   // X resolution
const FIELD_HEIGHT = 80;   // Y resolution (horizon to shore)

const energyField = {
    // Current height at each grid point
    height: new Float32Array(FIELD_WIDTH * FIELD_HEIGHT),

    // Velocity (rate of change) for wave equation
    velocity: new Float32Array(FIELD_WIDTH * FIELD_HEIGHT),

    // Dimensions
    width: FIELD_WIDTH,
    height: FIELD_HEIGHT,
};
```

### Swell Sources

```javascript
// Swells inject energy at the horizon (y=0)
// Each swell has period, amplitude, and phase
const swellSources = [
    { period: 14, amplitude: 0.8, phase: 0 },      // Groundswell (set waves)
    { period: 7, amplitude: 0.3, phase: 0.5 },    // Wind swell (background)
];
```

### Derived Waves (for gameplay)

```javascript
// Detected by scanning field for local maxima
// These are "views" into the field, not the source of truth
const detectedWaves = [
    {
        id: 'wave-1',
        peakPositions: [{ x: 0.3, y: 0.4 }, { x: 0.5, y: 0.42 }, ...], // Along the wave crest
        amplitude: 0.7,        // Height at peak
        speed: 12,             // Current propagation speed
        isBreaking: false,     // Derived from H vs depth
    },
];
```

## Physics

### Wave Equation

The 2D wave equation with depth-dependent speed:

```
∂²h/∂t² = c(x,y)² * (∂²h/∂x² + ∂²h/∂y²) - damping * ∂h/∂t
```

Where:
- `h` = height at point (x,y)
- `c(x,y)` = wave speed at that point = √(g * depth)
- `damping` = small friction term to prevent energy buildup

### Discretized Update (each frame)

```javascript
function updateEnergyField(field, bathymetry, dt) {
    const { height, velocity, width, height: fieldHeight } = field;
    const g = 9.8;

    for (let y = 1; y < fieldHeight - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = y * width + x;

            // Get depth at this point
            const normalizedX = x / width;
            const normalizedY = y / fieldHeight;
            const depth = getDepth(normalizedX, bathymetry, normalizedY);

            // Wave speed at this depth: c = sqrt(g * d)
            // Clamp depth to avoid division issues
            const c = Math.sqrt(g * Math.max(0.5, depth));

            // Laplacian (second spatial derivative)
            const laplacian =
                height[idx - 1] + height[idx + 1] +           // left + right
                height[idx - width] + height[idx + width] -   // up + down
                4 * height[idx];

            // Wave equation: acceleration = c² * laplacian
            const acceleration = c * c * laplacian - 0.01 * velocity[idx];

            // Update velocity and height
            velocity[idx] += acceleration * dt;
            height[idx] += velocity[idx] * dt;
        }
    }
}
```

### Swell Injection (at horizon)

```javascript
function injectSwells(field, swells, gameTime) {
    const y = 0; // Horizon row

    for (let x = 0; x < field.width; x++) {
        let totalHeight = 0;

        for (const swell of swells) {
            // Sinusoidal injection based on period
            const omega = 2 * Math.PI / swell.period;
            const wave = swell.amplitude * Math.sin(omega * gameTime + swell.phase);
            totalHeight += wave;
        }

        field.height[x] = totalHeight;
        field.velocity[x] = 0; // Fixed boundary
    }
}
```

### Wave Detection (derive discrete waves)

```javascript
function detectWaves(field, bathymetry) {
    const waves = [];
    const visited = new Set();

    // Scan for local maxima in Y direction (peaks traveling shoreward)
    for (let x = 0; x < field.width; x++) {
        for (let y = 1; y < field.height - 1; y++) {
            const idx = y * field.width + x;
            const h = field.height[idx];

            // Is this a local maximum in Y?
            if (h > field.height[idx - field.width] &&
                h > field.height[idx + field.width] &&
                h > 0.1) { // Threshold to ignore noise

                // Found a peak - trace it horizontally to find the full wave crest
                // (This connects peaks across X to form a "wave")
                // ... grouping logic ...
            }
        }
    }

    return waves;
}
```

## Rendering

Two options:

### Option A: Direct Field Rendering

Render the height field directly as color gradients:

```javascript
function renderField(ctx, field, oceanTop, oceanBottom) {
    const cellW = canvas.width / field.width;
    const cellH = (oceanBottom - oceanTop) / field.height;

    for (let y = 0; y < field.height; y++) {
        for (let x = 0; x < field.width; x++) {
            const h = field.height[y * field.width + x];

            // Map height to color (negative = trough/dark, positive = crest/light)
            const color = heightToColor(h);

            ctx.fillStyle = color;
            ctx.fillRect(x * cellW, oceanTop + y * cellH, cellW + 1, cellH + 1);
        }
    }
}
```

### Option B: Contour Lines

Extract iso-height contours (similar to current marching squares for foam):

```javascript
// Draw lines where height = threshold
const thresholds = [-0.3, 0, 0.3, 0.6];
for (const threshold of thresholds) {
    const segments = extractContours(field, threshold);
    drawContourLines(ctx, segments);
}
```

### Option C: Hybrid

Use the field for physics but keep current gradient-band rendering by using detected wave peaks.

## Integration with Existing Systems

### Breaking / Foam

Same logic - check if height > 0.78 * depth at each point:

```javascript
function updateBreaking(field, bathymetry, foamGrid) {
    for (let y = 0; y < field.height; y++) {
        for (let x = 0; x < field.width; x++) {
            const h = field.height[y * field.width + x];
            const depth = getDepth(x / field.width, bathymetry, y / field.height);

            if (h > 0.78 * depth) {
                // Wave is breaking here - deposit foam
                foamGrid[y * field.width + x] += h * 0.1;
            }
        }
    }
}
```

### Surfer Interaction

Surfer samples the field at their position to get:
- Local wave height (for riding)
- Local slope (for acceleration down the face)
- Breaking status (for whitewater boost)

### Set/Lull Model

Instead of spawning discrete waves, the set/lull model modulates the **swell source amplitude**:

```javascript
// During SET: increase groundswell amplitude
swellSources[0].amplitude = 0.8;

// During LULL: decrease groundswell amplitude
swellSources[0].amplitude = 0.3;
```

The waves in the field naturally reflect this - larger waves during sets, smaller during lulls.

## Implementation Steps

| Step | Task | Complexity | Status |
|------|------|------------|--------|
| 1 | Create `energyFieldModel.js` with field data structure | Low | ✅ Done |
| 2 | Implement wave equation update (propagation) | Medium | ✅ Done |
| 3 | Implement swell injection at horizon | Low | ✅ Done |
| 4 | Add depth-dependent speed from bathymetry | Low | ✅ Done |
| 5 | Basic field renderer (direct grid → colors) | Medium | ✅ Done |
| 6 | Wave detection algorithm (find peaks → discrete waves) | Medium | Pending |
| 7 | Integrate breaking/foam with field | Low | Pending |
| 8 | Connect set/lull to swell amplitude modulation | Low | Pending |
| 9 | Port surfer to read from field | Medium | Pending |
| 10 | Tune parameters for good visual feel | Medium | Pending |
| 11 | Performance optimization (WebGL, typed arrays) | Optional | Pending |

### Initial Implementation Notes

Files created:
- `src/state/energyFieldModel.js` - Core field data structure and physics
- `src/state/energyFieldModel.test.js` - Unit tests
- `src/render/energyFieldRenderer.js` - Renders field as color-mapped cells

Toggle: Press 'E' key to enable energy field view (replaces discrete wave rendering)

## Migration Strategy

1. **Phase 1**: Build field model in parallel, render with toggle
1. **Phase 2**: Wire up foam/breaking to field
1. **Phase 3**: Switch rendering to field-based
1. **Phase 4**: Deprecate direct wave spawning (keep derived waves for UI)

## Success Criteria

1. Waves with different periods visibly travel at different speeds
1. Two waves meeting creates a visible double-up (amplitude sum)
1. Wave refraction emerges naturally from depth-dependent speed
1. Set/lull still feels right (bigger waves come in groups)
1. Performance: 60fps on typical hardware
1. Discrete "waves" still available for gameplay/UI

## Open Questions

- Grid resolution tradeoff: higher = more accurate physics, lower = better performance
- Should we use WebGL compute for the wave equation? (future optimization)
- How to handle the shore boundary (absorption vs reflection)?
- Do we need a staggered grid for numerical stability?

## References

- [Wave equation on Wikipedia](https://en.wikipedia.org/wiki/Wave_equation)
- [Shallow water equations](https://en.wikipedia.org/wiki/Shallow_water_equations)
- plans/00-principles.md - foundational physics
- plans/reference/reference-wave-physics.md - detailed wave physics
