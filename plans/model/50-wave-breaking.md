# Plan 50: Wave Breaking

## Purpose
When the shoaling wave exceeds physical limits, it breaks. This plan implements the breaking condition and the resulting transformation from clean swell to broken whitewater.

---

## When Does a Wave Break?

A wave breaks when it becomes too steep to sustain itself. This happens when:

### Breaking Criterion
```
H > γ × d
```
Where:
- H = wave height
- d = water depth
- γ = breaker index ≈ 0.78 (can range 0.6 - 1.2)

In words: **Wave breaks when its height exceeds about 78% of the water depth.**

### Why This Happens
At this ratio:
- Orbital velocity at the crest exceeds wave speed
- The crest outruns the base
- The top falls forward

---

## The Breaking Process

Breaking isn't instant - it's a transition:

### 1. Pre-Breaking (Critical Steepness)
- Wave approaching breaking threshold
- Face very steep, nearly vertical
- Water visibly drawing up the face

### 2. Breaking Onset
- Crest becomes unstable
- Lip begins to pitch forward
- For plunging breakers: lip throws out over the face

### 3. Active Breaking
- Lip impacts water or falls
- Air entrainment creates whitewater
- Energy dissipates as turbulence

### 4. Post-Breaking (Bore)
- Broken whitewater continues shoreward
- Much lower height than unbroken wave
- Foam gradually dissipates

---

## Modeling the Break

### Breaking Zone Detection
At each point, check if breaking condition is met:
```javascript
function isBreaking(x, z, time) {
    const depth = getDepth(x, z);
    const waveHeight = getLocalWaveHeight(x, z, time);
    const breakerIndex = 0.78;

    return waveHeight > breakerIndex * depth;
}
```

### Wave State Machine
Each "segment" of the wave has a state:
```javascript
const WaveState = {
    UNBROKEN: 'unbroken',     // Clean face
    BREAKING: 'breaking',     // Actively breaking (lip throwing)
    BROKEN: 'broken',         // Whitewater/foam
};
```

### State Transitions
```
UNBROKEN → BREAKING: when H > 0.78d
BREAKING → BROKEN: after breaking duration (~1 second)
BROKEN stays BROKEN: until wave energy dissipates
```

---

## The Peel

The break doesn't happen uniformly along the wave. Due to bottom contour variations, different sections break at different times.

### Peel Mechanics
If the reef/sandbar is angled:
- One end reaches critical depth first
- Breaking starts there (the "peak")
- Break propagates along the wave (the "peel")
- Peel speed depends on angle of bottom contour

### Implementing Peel
```javascript
// Bottom contour has slight angle
function getDepth(x, z) {
    let depth = -z * 0.15 + 5;
    // Reef is slightly angled
    const reefDepth = 2.5 + x * 0.02; // Shallower on one side
    if (z > -8 && z < -3) {
        depth = Math.min(depth, reefDepth);
    }
    return depth;
}
```

This creates a natural peel: the wave breaks first where the reef is shallowest, then the break propagates toward deeper sections.

---

## Visual Representation

### Unbroken Section
- Smooth water surface
- Steep face
- Clean coloring (blues/greens)

### Breaking Section (Lip)
- Geometry: lip pitching forward (horizontal displacement)
- Spray particles at the lip
- Bright white at impact zone

### Broken Section (Whitewater)
- Lower height (collapsed wave)
- Foam texture (white, bubbly)
- Turbulent motion

---

## Implementation

### Breaking State Tracking
```javascript
class WaveSegment {
    constructor(x) {
        this.x = x;
        this.state = WaveState.UNBROKEN;
        this.breakTime = null;
    }

    update(time, depth, waveHeight) {
        if (this.state === WaveState.UNBROKEN) {
            if (waveHeight > 0.78 * depth) {
                this.state = WaveState.BREAKING;
                this.breakTime = time;
            }
        } else if (this.state === WaveState.BREAKING) {
            if (time - this.breakTime > 1.0) {
                this.state = WaveState.BROKEN;
            }
        }
    }
}
```

### Surface Modification Based on State
```javascript
function getWaveHeight(x, z, time) {
    const segment = getWaveSegment(x);
    const baseHeight = getShoaledWaveHeight(x, z, time);

    switch (segment.state) {
        case WaveState.UNBROKEN:
            return baseHeight;

        case WaveState.BREAKING:
            // Exaggerated height at lip
            const breakProgress = (time - segment.breakTime) / 1.0;
            return baseHeight * (1.2 - breakProgress * 0.5);

        case WaveState.BROKEN:
            // Collapsed foam height
            return baseHeight * 0.3;
    }
}
```

### Lip Throw (Horizontal Displacement)
```javascript
function getLipDisplacement(x, z, time) {
    const segment = getWaveSegment(x);
    if (segment.state !== WaveState.BREAKING) return 0;

    const breakProgress = (time - segment.breakTime) / 1.0;
    // Only at the crest
    const atCrest = isNearCrest(z, time);
    if (!atCrest) return 0;

    // Throw forward (positive Z toward shore)
    return Math.sin(breakProgress * Math.PI) * 2.0;
}
```

---

## Debug Features

- Show breaking threshold line (where H = 0.78d)
- Color code wave segments by state (green=unbroken, yellow=breaking, white=broken)
- Show peel position and speed
- Display breaking criterion values at probe

---

## Success Criteria

1. Wave breaks at physically correct location (where H > 0.78d)
2. Breaking propagates along the wave (peel visible)
3. Lip throws forward at breaking section (not just height change)
4. Broken section is visibly lower and foamy
5. Breaking looks like a continuous process, not instant switch
6. Can see the "peak" where breaking starts

---

## What We're NOT Doing Yet
- Particle spray effects
- Underwater turbulence
- Sound
- Detailed foam textures

Core breaking mechanics first. Polish later.
