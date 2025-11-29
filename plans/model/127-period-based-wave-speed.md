# Plan 127: Period-Based Wave Speed

Status: proposal
Owner: agents
Depends on: 123-time-based-wave-model.md, 124-bathymetry.md

## Problem

All waves currently travel at a fixed `swellSpeed` (50 px/s). This is physically incorrect:

1. **Set waves and background waves move at the same speed** - looks unnatural
1. **No dispersion** - in reality, longer-period waves travel faster in deep water
1. **Sets don't "catch up"** - groundswell should overtake wind chop

## Physics

### Deep Water Speed
```
Speed (m/s) = 1.56 × Period (seconds)
```

| Wave Type | Period | Speed | Relative |
|-----------|--------|-------|----------|
| Wind chop (background) | 5-8s | 8-12 m/s | 1.0x |
| Medium swell | 10s | 16 m/s | 1.5x |
| Groundswell (sets) | 13-16s | 20-25 m/s | 2.0x |
| Long-period swell | 18-20s | 28-31 m/s | 2.5x |

### Shallow Water Speed
```
Speed (m/s) = √(g × depth)
```
- All waves converge to the same speed based on depth
- Period no longer matters
- This is why waves "bunch up" approaching shore

### Transition Zone
Waves transition from deep-water to shallow-water behavior when:
- Depth < ½ wavelength (wavelength = 1.56 × period²)

## Solution

### 1. Add `period` Property to Waves

```javascript
export function createWave(spawnTime, amplitude, type = WAVE_TYPE.SET, period = null) {
    // Default periods based on type
    const defaultPeriod = type === WAVE_TYPE.BACKGROUND
        ? 5 + Math.random() * 3   // 5-8s for background
        : 12 + Math.random() * 6; // 12-18s for sets

    return {
        id: `wave-${nextWaveId++}`,
        spawnTime,
        amplitude,
        type,
        period: period ?? defaultPeriod,
        lastFoamY: -1,
    };
}
```

### 2. Calculate Wave Speed from Period

```javascript
const G = 9.8; // m/s²

/**
 * Deep water wave speed: c = 1.56 * T
 */
export function deepWaterSpeed(period) {
    return 1.56 * period; // m/s
}

/**
 * Shallow water wave speed: c = √(g * depth)
 */
export function shallowWaterSpeed(depth) {
    return Math.sqrt(G * depth); // m/s
}

/**
 * Wavelength from period (deep water): L = 1.56 * T²
 */
export function wavelengthFromPeriod(period) {
    return 1.56 * period * period; // meters
}

/**
 * Calculate wave speed at a given depth
 * Blends between deep and shallow water formulas
 */
export function getWaveSpeed(period, depth) {
    const wavelength = wavelengthFromPeriod(period);
    const deepThreshold = wavelength / 2;
    const shallowThreshold = wavelength / 20;

    const vDeep = deepWaterSpeed(period);
    const vShallow = shallowWaterSpeed(depth);

    if (depth >= deepThreshold) {
        // Deep water - period determines speed
        return vDeep;
    } else if (depth <= shallowThreshold) {
        // Shallow water - depth determines speed
        return vShallow;
    } else {
        // Transition zone - blend
        const t = (depth - shallowThreshold) / (deepThreshold - shallowThreshold);
        return vShallow + t * (vDeep - vShallow);
    }
}
```

### 3. Update Wave Progress Calculation

Current approach uses a fixed `travelDuration`. New approach calculates position by integrating speed over time, accounting for depth at each position.

**Option A: Simplified (constant deep-water speed)**
```javascript
export function getWaveProgress(wave, currentTime, horizonToShoreDistance) {
    const elapsed = (currentTime - wave.spawnTime) / 1000; // seconds
    const speed = deepWaterSpeed(wave.period); // m/s
    const distance = speed * elapsed;
    return Math.min(1, Math.max(0, distance / horizonToShoreDistance));
}
```

**Option B: Full physics (integrate speed over bathymetry)**
Requires bathymetry (plan 124) to be implemented first. Speed varies as wave travels over different depths.

### 4. Visual Differentiation

With period-based speed:
- Set waves (longer period) travel ~2x faster than background
- Sets will naturally "catch up" to and pass background waves
- Creates more dynamic, realistic ocean feel

Period also affects wavelength visually:
- Longer period = longer wavelength = waves appear more spread out
- Could affect wave rendering thickness/spacing

## Implementation Steps

| Step | Task | Files |
|------|------|-------|
| 1 | Add `period` property to `createWave()` | `src/state/waveModel.js` |
| 2 | Add default periods by wave type (background: 5-8s, set: 12-18s) | `src/state/waveModel.js` |
| 3 | Add `deepWaterSpeed()`, `shallowWaterSpeed()`, `getWaveSpeed()` | `src/state/waveModel.js` |
| 4 | Update `getWaveProgress()` to use wave's period for speed | `src/state/waveModel.js` |
| 5 | Remove global `swellSpeed` config (or keep as fallback) | `src/main.jsx` |
| 6 | Update `getActiveWaves()` / `isWaveComplete()` signatures | `src/state/waveModel.js` |
| 7 | Update all callers of wave progress functions | `src/main.jsx`, etc. |
| 8 | Update tests | `src/state/waveModel.test.js` |
| 9 | Add visual test for speed differentiation | `tests/visual.spec.js` |

## Scale Considerations

The game uses pixels, not meters. Need a conversion factor:
```javascript
const METERS_TO_PIXELS = 10; // 1 meter = 10 pixels (tunable)
```

Or define the ocean in abstract units and tune for feel rather than strict physics.

## Success Criteria

1. Set waves visibly travel faster than background waves
1. Sets "catch up" to slower background chop
1. Ocean feels more dynamic and realistic
1. No regression in existing wave behavior (breaking, foam, etc.)

## Future Enhancements

- **Full bathymetry integration**: Speed varies with depth as wave travels
- **Dispersion visualization**: Show wave trains separating by period
- **Interference**: When fast wave catches slow wave, combine amplitudes (plan 126)

## Related Plans

- **123**: Time-based model (done) - foundation for this
- **124**: Bathymetry - needed for full shallow-water speed calculation
- **126**: Wave interference - builds on this for double-ups when waves meet
