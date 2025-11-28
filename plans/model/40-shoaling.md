# Plan 40: Shoaling - Wave Stands Up

## Purpose
Make the swell respond to water depth. As it enters shallow water, it should:
- Slow down
- Get shorter (wavelength decreases)
- Get taller (amplitude increases)
- Get steeper

This is **shoaling** - the wave "feeling the bottom."

---

## The Physics

### Why Shoaling Happens

In deep water, wave speed depends only on wavelength:
```
c_deep = sqrt(g × L / 2π)
```

In shallow water, wave speed depends on depth:
```
c_shallow = sqrt(g × d)
```

Where `d` is water depth.

As depth decreases, wave speed decreases.

### Conservation of Energy Flux

Energy flux = Energy × Group velocity

As the wave slows down, to conserve energy, the wave height must increase:
```
H₂ / H₁ = sqrt(c_g1 / c_g2)
```

The wave "piles up" as it slows - getting taller.

### Wavelength Change

Since speed decreases but period stays constant:
```
L = c × T
```
If c decreases and T is constant, L decreases. Waves bunch up.

---

## Simplified Shoaling Model

For our game, we can use empirical approximations:

### Wave Speed vs Depth
```javascript
function waveSpeed(wavelength, depth) {
    const k = 2 * Math.PI / wavelength;
    const deepSpeed = Math.sqrt(9.8 * wavelength / (2 * Math.PI));
    const shallowSpeed = Math.sqrt(9.8 * depth);

    // Transition smoothly between deep and shallow
    const depthRatio = depth / (wavelength / 2);
    if (depthRatio > 1) return deepSpeed;
    if (depthRatio < 0.05) return shallowSpeed;

    // Intermediate: use tanh formula
    return Math.sqrt(9.8 / k * Math.tanh(k * depth));
}
```

### Amplitude vs Depth (Shoaling Coefficient)
```javascript
function shoaledAmplitude(baseAmplitude, depth, wavelength) {
    const depthRatio = depth / wavelength;

    if (depthRatio > 0.5) return baseAmplitude; // Deep water

    // Green's Law approximation for shallow water
    const shoalFactor = Math.pow(wavelength / (4 * depth), 0.25);
    return baseAmplitude * Math.min(shoalFactor, 3.0); // Cap at 3x
}
```

---

## Implementation

### Modified Wave Function
```javascript
function getWaveHeight(x, z, time) {
    const depth = getDepth(x, z);
    const baseAmp = swell.amplitude;
    const baseLambda = swell.wavelength;

    // Calculate local wave properties based on depth
    const localSpeed = waveSpeed(baseLambda, depth);
    const localAmp = shoaledAmplitude(baseAmp, depth, baseLambda);

    // Phase accumulates differently as speed changes
    // (This is simplified - proper implementation needs ray tracing)
    const k = 2 * Math.PI / baseLambda;
    const phase = k * z - (2 * Math.PI / swell.period) * time;

    return localAmp * Math.sin(phase);
}
```

### The Depth Profile
Need a defined bottom profile. For a simple beach with a reef:
```javascript
function getDepth(x, z) {
    // Basic slope toward shore
    let depth = Math.max(0, -z * 0.15 + 5);

    // Add a reef/sandbar at z = -5 (depth drops suddenly)
    if (z > -8 && z < -3) {
        depth = Math.min(depth, 2.5); // Shallow spot
    }

    return depth;
}
```

### Visual Result
As the swell approaches shore:
1. Far out (z = -50): normal amplitude, normal wavelength
2. Approaching reef (z = -15): slightly taller, slightly shorter wavelength
3. Over reef (z = -5): noticeably taller, much shorter wavelength, steep face
4. This is where breaking would happen (next plan)

---

## Debug Features

- Show depth contour lines on the water
- Color water by depth
- Show wave height at probe (should increase as probe moves shoreward)
- Display local wave speed at probe
- Draw wave profile cross-section (side view showing amplitude change)

---

## Success Criteria

1. Wave appears taller as it approaches shore (visible growth)
2. Wave crests bunch up (shorter wavelength near shore)
3. Wave face gets steeper near the shallow zone
4. At the reef, wave is dramatically taller/steeper than in deep water
5. Probe confirms: height at z=-5 > height at z=-30 for same phase
6. Still smooth - not breaking yet (that's next)

---

## Validation

### Height Test
- Place probe at deep water (z = -40): measure wave height
- Place probe at reef (z = -5): measure wave height
- Reef height should be 1.5-2x deep water height

### Speed Test
- Track a crest in deep water: measure speed
- Track same crest over reef: should be visibly slower

---

## What We're NOT Doing Yet
- Wave breaking (when it gets too steep)
- Orbital motion changes
- Refraction (wave bending due to depth gradients)

The wave shoals, stands up, gets dramatic - but doesn't break yet.
